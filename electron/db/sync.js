/* ========================================
   Sync Manager
   Synchronizes data between MySQL and SQLite
   ======================================== */

const https = require('https');
const http = require('http');

class SyncManager {
  constructor(db) {
    this.db = db;
    this.tables = [
      'clients',
      'jobs',
      'workers',
      'materials',
      // 'job_materials', // Disabled - endpoint not available
      'invoices',
      'templates',
      'offers'
    ];
  }

  /* ========================================
     Connectivity Check
     ======================================== */

  async checkOnline(serverUrl = null) {
    return new Promise((resolve) => {
      // Try to reach server or google.com
      const url = serverUrl || 'https://www.google.com';
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.get(url, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /* ========================================
     Download from Server
     ======================================== */

  async downloadFromServer(serverUrl) {
    console.log('📥 Starting download from server...');
    console.log('📍 Server URL:', serverUrl);
    
    const results = {
      success: false,
      tables: {},
      errors: [],
      totalRecords: 0
    };

    try {
      // Download data for each table
      for (const table of this.tables) {
        try {
          console.log(`📥 Downloading ${table}...`);
          const data = await this.fetchTableData(serverUrl, table);
          const count = await this.importTableData(table, data);
          
          results.tables[table] = {
            success: true,
            records: count
          };
          results.totalRecords += count;
          
          console.log(`✅ Downloaded ${count} records from ${table}`);
        } catch (error) {
          console.error(`❌ Error downloading ${table}:`, error);
          results.tables[table] = {
            success: false,
            error: error.message
          };
          results.errors.push(`${table}: ${error.message}`);
        }
      }

      // Mark last sync time
      this.db.setSyncMetadata('last_download', new Date().toISOString());
      
      results.success = results.errors.length === 0;
      console.log(`📥 Download complete. Total records: ${results.totalRecords}`);
      
      return results;
    } catch (error) {
      console.error('❌ Download failed:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /* ========================================
     Upload to Server
     ======================================== */

  async uploadToServer(serverUrl) {
    console.log('📤 Starting upload to server...');
    
    const results = {
      success: false,
      tables: {},
      errors: [],
      totalRecords: 0
    };

    try {
      // Upload pending changes for each table
      for (const table of this.tables) {
        try {
          const pendingChanges = this.db.getPendingChanges(table);
          
          if (pendingChanges.length === 0) {
            results.tables[table] = {
              success: true,
              records: 0
            };
            continue;
          }

          const count = await this.uploadTableData(serverUrl, table, pendingChanges);
          
          // Mark as synced
          const ids = pendingChanges
            .filter(row => row._sync_status !== 'deleted')
            .map(row => row.id);
          
          if (ids.length > 0) {
            this.db.markAsSynced(table, ids);
          }
          
          // Actually delete records marked for deletion
          const deletedIds = pendingChanges
            .filter(row => row._sync_status === 'deleted')
            .map(row => row.id);
          
          if (deletedIds.length > 0) {
            const placeholders = deletedIds.map(() => '?').join(',');
            this.db.query(
              `DELETE FROM ${table} WHERE id IN (${placeholders})`,
              deletedIds
            );
          }
          
          results.tables[table] = {
            success: true,
            records: count
          };
          results.totalRecords += count;
          
          console.log(`✅ Uploaded ${count} changes from ${table}`);
        } catch (error) {
          console.error(`❌ Error uploading ${table}:`, error);
          results.tables[table] = {
            success: false,
            error: error.message
          };
          results.errors.push(`${table}: ${error.message}`);
        }
      }

      // Mark last sync time
      this.db.setSyncMetadata('last_upload', new Date().toISOString());
      
      results.success = results.errors.length === 0;
      console.log(`📤 Upload complete. Total records: ${results.totalRecords}`);
      
      return results;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /* ========================================
     Helper Methods
     ======================================== */

  // Convert camelCase to snake_case for MySQL compatibility
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Get valid column names for a table from the database schema
  getTableColumns(table) {
    const stmt = this.db.db.prepare(`PRAGMA table_info(${table})`);
    const columns = stmt.all();
    return new Set(columns.map(col => col.name));
  }

  // Convert object keys from camelCase to snake_case, filtering out invalid columns
  convertKeysToSnakeCase(obj, table) {
    const validColumns = this.getTableColumns(table);
    const converted = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = this.camelToSnake(key);
        // Only include fields that exist in the database schema
        if (validColumns.has(snakeKey)) {
          let value = obj[key];
          
          // Convert arrays and objects to JSON strings for SQLite
          if (value !== null && typeof value === 'object') {
            value = JSON.stringify(value);
          }
          
          converted[snakeKey] = value;
        }
      }
    }
    return converted;
  }

  // Fetch data from server for a table
  async fetchTableData(serverUrl, table) {
    return new Promise((resolve, reject) => {
      const url = `${serverUrl}/api/${table}.php?action=list`;
      console.log(`🌐 Fetching: ${url}`);
      
      const protocol = url.startsWith('https') ? https : http;
      
      const options = {
        headers: {
          'X-Sync-API-Key': 'electron-sync-key-2025'
        }
      };
      
      protocol.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success) {
              resolve(json.data || []);
            } else {
              reject(new Error(json.message || 'Failed to fetch data'));
            }
          } catch (error) {
            console.error(`❌ Parse error for ${table}:`, error.message);
            console.error(`Response data:`, data.substring(0, 200));
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', (error) => {
        console.error(`❌ Fetch error for ${table}:`, error);
        reject(error);
      });
    });
  }

  // Import data into SQLite table
  async importTableData(table, data) {
    if (!data || data.length === 0) {
      return 0;
    }

    const db = this.db.db;
    
    // Begin transaction for better performance
    const insertMany = db.transaction((records) => {
      for (const record of records) {
        // Convert camelCase keys to snake_case for SQLite, filtering invalid columns
        const converted = this.convertKeysToSnakeCase(record, table);
        
        // Remove sync metadata fields if they exist
        delete converted._sync_status;
        delete converted._sync_timestamp;
        
        const keys = Object.keys(converted);
        const values = Object.values(converted);
        
        // Debug: Check for non-bindable values
        values.forEach((val, idx) => {
          if (val !== null && typeof val === 'object') {
            console.error(`❌ Invalid value type for ${keys[idx]}:`, typeof val, val);
            throw new TypeError(`Column ${keys[idx]} has invalid value type: ${typeof val}`);
          }
        });
        
        const placeholders = keys.map(() => '?').join(', ');
        
        const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}, _sync_status, _sync_timestamp)
                     VALUES (${placeholders}, 'synced', ${Date.now()})`;
        
        db.prepare(sql).run(...values);
      }
    });

    insertMany(data);
    return data.length;
  }

  // Upload table data to server
  async uploadTableData(serverUrl, table, changes) {
    return new Promise((resolve, reject) => {
      const url = `${serverUrl}/api/sync.php`;
      const protocol = url.startsWith('https') ? https : http;
      
      const postData = JSON.stringify({
        table: table,
        changes: changes.map(row => {
          const clean = { ...row };
          delete clean._sync_status;
          delete clean._sync_timestamp;
          return clean;
        })
      });
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = protocol.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success) {
              resolve(changes.length);
            } else {
              reject(new Error(json.message || 'Failed to upload data'));
            }
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }

  /* ========================================
     Status & Info
     ======================================== */

  async getStatus() {
    const status = {
      lastDownload: this.db.getSyncMetadata('last_download'),
      lastUpload: this.db.getSyncMetadata('last_upload'),
      pendingChanges: {},
      totalPending: 0
    };

    for (const table of this.tables) {
      const pending = this.db.getPendingChanges(table);
      status.pendingChanges[table] = pending.length;
      status.totalPending += pending.length;
    }

    return status;
  }

  async getPendingChangesCount() {
    let total = 0;
    
    for (const table of this.tables) {
      const pending = this.db.getPendingChanges(table);
      total += pending.length;
    }
    
    return total;
  }
}

module.exports = SyncManager;
