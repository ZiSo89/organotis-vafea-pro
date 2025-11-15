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
    
    // Fields that should be parsed as JSON
    const jsonFields = ['assignedWorkers', 'paints', 'items', 'materials', 'tasks', 'coordinates'];
    
    for (const key in row) {
      if (row.hasOwnProperty(key)) {
        // Skip internal sync fields
        if (key.startsWith('_sync_')) {
          converted[key] = row[key];
        } else {
          const camelKey = this.snakeToCamel(key);
          let value = row[key];
          
          // Parse JSON fields
          if (jsonFields.includes(camelKey) && typeof value === 'string' && value) {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error(`Failed to parse JSON field ${camelKey}:`, value, e);
              // Default based on field type
              if (camelKey === 'coordinates') {
                value = null;
              } else {
                value = []; // Default to empty array for array fields
              }
            }
          }
          
          converted[camelKey] = value;
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
    
    // Fields that should be stringified as JSON
    const jsonFields = ['assignedWorkers', 'paints', 'items', 'materials', 'tasks', 'coordinates'];
    
    const converted = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const snakeKey = this.camelToSnake(key);
        let value = data[key];
        
        // Convert objects/arrays to JSON strings for SQLite
        if (jsonFields.includes(key) && value && typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        converted[snakeKey] = value;
      }
    }
    return converted;
  }

  /* ========================================
     Initialize Database Schema
     ======================================== */

  async init() {

    
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
        coordinates TEXT,
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
        current_check_in TEXT,
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
        due_date TEXT,
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
        date TEXT NOT NULL,
        valid_until TEXT,
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

      -- Calendar Events Table
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        start_time TEXT,
        end_time TEXT,
        all_day INTEGER DEFAULT 0,
        client_id INTEGER,
        job_id INTEGER,
        address TEXT,
        description TEXT,
        status TEXT,
        color TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
      );

      -- Job Workers Junction Table
      CREATE TABLE IF NOT EXISTS job_workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        worker_id INTEGER NOT NULL,
        hours_allocated REAL DEFAULT 0,
        hourly_rate REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      );

      -- Timesheets Table
      CREATE TABLE IF NOT EXISTS timesheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id INTEGER NOT NULL,
        job_id INTEGER,
        date TEXT NOT NULL,
        hours_worked REAL DEFAULT 0,
        hourly_rate REAL DEFAULT 0,
        total_payment REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
      );

      -- Settings Table
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        _sync_status TEXT DEFAULT 'synced',
        _sync_timestamp INTEGER DEFAULT 0
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
      CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON calendar_events(start_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_client_id ON calendar_events(client_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_job_id ON calendar_events(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_workers_job_id ON job_workers(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_workers_worker_id ON job_workers(worker_id);
      CREATE INDEX IF NOT EXISTS idx_timesheets_worker_id ON timesheets(worker_id);
      CREATE INDEX IF NOT EXISTS idx_timesheets_job_id ON timesheets(job_id);
      CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON clients(_sync_status);
    `);


  }

  /* ========================================
     CRUD Operations
     ======================================== */

  // Get all records from table
  getAll(table) {
    const stmt = this.db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`);
    const rows = stmt.all();
    console.log(`[SQLite] getAll(${table}) - rows type:`, typeof rows, 'isArray:', Array.isArray(rows), 'length:', rows?.length);
    
    // Ensure we always return an array
    if (!Array.isArray(rows)) {
      console.warn(`[SQLite] getAll(${table}) - rows is not an array, returning empty array`);
      return [];
    }
    
    const converted = this.convertRowsToCamelCase(rows);
    console.log(`[SQLite] getAll(${table}) - converted type:`, typeof converted, 'isArray:', Array.isArray(converted), 'length:', converted?.length);
    return converted;
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
    
    // Remove fields that SQLite auto-generates
    delete snakeData.id;
    delete snakeData.created_at;
    delete snakeData.updated_at;
    
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
    
    // Remove fields that should not be updated manually
    delete snakeData.id;
    delete snakeData.created_at;
    // updated_at will be set by the query
    delete snakeData.updated_at;
    
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

  /* ========================================
     Backup & Restore Operations
     ======================================== */

  // Export all data to JSON
  exportToJSON() {
    try {
      const tables = ['clients', 'workers', 'materials', 'jobs', 'offers', 'calendar_events', 'invoices'];
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {}
      };

      for (const table of tables) {
        const rows = this.getAll(table);
        backup.data[table] = rows;
      }

      // Include settings (convert to web app format for compatibility)
      const settingsStmt = this.db.prepare('SELECT * FROM settings');
      const settingsRows = settingsStmt.all();
      backup.data.settings = settingsRows.map(row => ({
        key: row.setting_key,
        value: row.setting_value
      }));

      console.log('✅ Export completed:', Object.keys(backup.data).map(t => `${t}: ${backup.data[t].length}`));
      return backup;
    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  }

  // Import data from JSON backup
  importFromJSON(backupData) {
    try {
      console.log('📥 Starting import...');
      
      // Validate backup structure and normalize format
      if (!backupData) {
        throw new Error('Invalid backup format');
      }

      // Support two formats:
      // 1. Electron format: { data: { clients: [...], workers: [...] } }
      // 2. PHP format: { tables: { clients: { data: [...] }, workers: { data: [...] } } }
      let data;
      
      if (backupData.data) {
        // Electron format
        data = backupData.data;
      } else if (backupData.tables) {
        // PHP format - extract data from each table object
        data = {};
        for (const [tableName, tableObj] of Object.entries(backupData.tables)) {
          data[tableName] = tableObj.data || [];
        }
      } else {
        throw new Error('Invalid backup format: missing data or tables');
      }
      
      // Start transaction
      const transaction = this.db.transaction(() => {
        // Clear existing data
        const tables = ['calendar_events', 'invoices', 'offers', 'jobs', 'materials', 'workers', 'clients'];
        
        for (const table of tables) {
          console.log(`🗑️ Clearing ${table}...`);
          this.db.prepare(`DELETE FROM ${table}`).run();
          // Reset auto-increment
          this.db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
        }

        // Import data for each table
        for (const [tableName, records] of Object.entries(data)) {
          if (tableName === 'settings') {
            // Handle settings separately
            console.log(`⚙️ Importing settings: ${records.length} records`);
            for (const setting of records) {
              // Support both web app format (key/value) and electron format (setting_key/setting_value)
              const key = setting.setting_key || setting.key;
              const value = setting.setting_value || setting.value;
              
              const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO settings (setting_key, setting_value, updated_at)
                VALUES (?, ?, datetime('now', 'localtime'))
              `);
              stmt.run(key, value);
            }
            continue;
          }

          if (!Array.isArray(records) || records.length === 0) {
            console.log(`⏭️ Skipping empty ${tableName}`);
            continue;
          }

          console.log(`📦 Importing ${tableName}: ${records.length} records`);
          
          // Get valid columns for this table from database schema
          const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
          const validColumns = tableInfo.map(col => col.name);
          
          // Get column names from first record, filtering to only valid columns
          const firstRecord = records[0];
          const allColumns = Object.keys(firstRecord)
            .filter(key => !key.startsWith('_sync_')); // Exclude sync fields
          
          // Convert to snake_case and check if column exists in table
          const columns = allColumns.filter(col => {
            const snakeCol = this.camelToSnake(col);
            return validColumns.includes(snakeCol);
          });
          
          if (columns.length === 0) {
            console.log(`⏭️ No valid columns for ${tableName}, skipping`);
            continue;
          }
          
          // Prepare insert statement
          const placeholders = columns.map(() => '?').join(', ');
          const columnNames = columns.map(col => this.camelToSnake(col)).join(', ');
          const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
          const stmt = this.db.prepare(sql);

          // Insert each record
          for (const record of records) {
            const values = columns.map(col => {
              let value = record[col];
              // Convert objects/arrays to JSON strings
              if (['assignedWorkers', 'paints', 'items', 'materials', 'tasks', 'coordinates'].includes(col)) {
                if (value && typeof value === 'object') {
                  value = JSON.stringify(value);
                }
              }
              return value;
            });
            
            try {
              stmt.run(...values);
            } catch (err) {
              console.error(`Error inserting into ${tableName}:`, err.message, record);
            }
          }
        }
      });

      // Execute transaction
      transaction();
      
      console.log('✅ Import completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Import error:', error);
      throw error;
    }
  }

  // Close database
  close() {
    this.db.close();
  }
}

module.exports = SQLiteDB;
