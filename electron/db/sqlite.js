/* ========================================
   SQLite Database Manager
   Local database for offline support
   ======================================== */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SQLiteDB {
  constructor() {
    // Database path in user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'painter_app.db');
    
    console.log('📁 Database path:', dbPath);
    
    this.db = new Database(dbPath, { verbose: console.log });
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.db.pragma('foreign_keys = ON');   // Enable foreign keys
  }

  /* ========================================
     Helper Methods
     ======================================== */

  // Convert snake_case to camelCase for frontend compatibility
  snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  // Convert database row from snake_case to camelCase (excluding sync fields)
  convertRowToCamelCase(row) {
    if (!row) return row;
    
    const converted = {};
    for (const key in row) {
      if (row.hasOwnProperty(key)) {
        // Skip internal sync fields
        if (key.startsWith('_sync_')) {
          converted[key] = row[key];
        } else {
          const camelKey = this.snakeToCamel(key);
          converted[camelKey] = row[key];
        }
      }
    }
    return converted;
  }

  // Convert array of rows
  convertRowsToCamelCase(rows) {
    if (!Array.isArray(rows)) return rows;
    return rows.map(row => this.convertRowToCamelCase(row));
  }

  // Convert camelCase to snake_case for database storage
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Convert data object from camelCase to snake_case for database
  convertDataToSnakeCase(data) {
    if (!data || typeof data !== 'object') return data;
    
    const converted = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const snakeKey = this.camelToSnake(key);
        converted[snakeKey] = data[key];
      }
    }
    return converted;
  }

  /* ========================================
     Initialize Database Schema
     ======================================== */

  async init() {
    console.log('🔧 Initializing database schema...');
    
    // Create tables matching MySQL schema EXACTLY (with underscores)
    this.db.exec(`
      -- Clients Table
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        afm TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0
      );

      -- Jobs Table
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT,
        type TEXT,
        date TEXT,
        next_visit TEXT,
        description TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        rooms INTEGER,
        area REAL,
        substrate TEXT,
        materials_cost REAL DEFAULT 0,
        kilometers INTEGER DEFAULT 0,
        billing_hours REAL DEFAULT 0,
        billing_rate REAL DEFAULT 0,
        vat REAL DEFAULT 24,
        cost_per_km REAL DEFAULT 0.5,
        notes TEXT,
        assigned_workers TEXT,
        paints TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'pending',
        total_cost REAL DEFAULT 0,
        is_paid INTEGER DEFAULT 0,
        coordinates TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Workers Table
      CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        specialty TEXT,
        hourly_rate REAL DEFAULT 0,
        daily_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        hire_date TEXT,
        notes TEXT,
        total_hours REAL DEFAULT 0,
        total_earnings REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0
      );

      -- Materials Table
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT DEFAULT 'τμχ',
        unit_price REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        category TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0
      );

      -- Job Materials Junction Table
      CREATE TABLE IF NOT EXISTS job_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        quantity REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      );

      -- Invoices Table
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        client_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        is_paid INTEGER DEFAULT 0,
        paid_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Templates Table
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        estimated_duration INTEGER,
        materials TEXT,
        tasks TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0
      );

      -- Offers Table
      CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        offer_number TEXT NOT NULL UNIQUE,
        offer_date TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

      -- Sync Metadata Table
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
      CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_next_visit ON jobs(next_visit);
      CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
      CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
      CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_offers_client_id ON offers(client_id);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON clients(_sync_status);
    `);

    console.log('✅ Database schema created');
  }

  /* ========================================
     CRUD Operations
     ======================================== */

  // Get all records from table
  getAll(table) {
    const stmt = this.db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`);
    const rows = stmt.all();
    return this.convertRowsToCamelCase(rows);
  }

  // Get single record by ID
  getById(table, id) {
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    const row = stmt.get(id);
    return this.convertRowToCamelCase(row);
  }

  // Insert new record
  insert(table, data) {
    // Convert camelCase to snake_case
    const snakeData = this.convertDataToSnakeCase(data);
    
    const keys = Object.keys(snakeData);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}, _sync_status, _sync_timestamp) 
                 VALUES (${placeholders}, 'pending', ${Date.now()})`;
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...Object.values(snakeData));
    
    return {
      id: result.lastInsertRowid,
      changes: result.changes
    };
  }

  // Update record
  update(table, id, data) {
    // Convert camelCase to snake_case
    const snakeData = this.convertDataToSnakeCase(data);
    
    const keys = Object.keys(snakeData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} 
                 SET ${setClause}, updated_at = datetime('now', 'localtime'), 
                     _sync_status = 'pending', _sync_timestamp = ${Date.now()}
                 WHERE id = ?`;
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...Object.values(snakeData), id);
    
    return {
      changes: result.changes
    };
  }

  // Delete record
  delete(table, id) {
    // Soft delete by marking for sync
    const sql = `UPDATE ${table} 
                 SET _sync_status = 'deleted', _sync_timestamp = ${Date.now()}
                 WHERE id = ?`;
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    
    return {
      changes: result.changes
    };
  }

  // Execute custom query
  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = stmt.all(...params);
      return this.convertRowsToCamelCase(rows);
    } else {
      return stmt.run(...params);
    }
  }

  /* ========================================
     Sync Helpers
     ======================================== */

  // Get pending changes for sync
  getPendingChanges(table) {
    const stmt = this.db.prepare(
      `SELECT * FROM ${table} WHERE _sync_status IN ('pending', 'deleted')`
    );
    return stmt.all();
  }

  // Mark records as synced
  markAsSynced(table, ids) {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE ${table} 
                 SET _sync_status = 'synced', _sync_timestamp = ${Date.now()}
                 WHERE id IN (${placeholders})`;
    
    const stmt = this.db.prepare(sql);
    return stmt.run(...ids);
  }

  // Get sync metadata
  getSyncMetadata(key) {
    const stmt = this.db.prepare('SELECT value FROM sync_metadata WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  }

  // Set sync metadata
  setSyncMetadata(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (key, value, updated_at) 
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value, 
        updated_at = datetime('now', 'localtime')
    `);
    return stmt.run(key, value);
  }

  // Close database
  close() {
    this.db.close();
    console.log('🔒 Database closed');
  }
}

module.exports = SQLiteDB;
