/* ========================================
   Sync Manager
   Synchronizes data between MySQL and SQLite
   ======================================== */

const https = require('https');
const http = require('http');

function getSyncApiKey() {
  return process.env.PAINTER_SYNC_API_KEY
    || process.env.SYNC_API_KEY
    || 'electron-sync-key-2025';
}

function getHttpsOptions(serverUrl) {
  const insecure = process.env.ELECTRON_SYNC_INSECURE === '1'
    || process.env.ELECTRON_SYNC_INSECURE === 'true';
  if (serverUrl.startsWith('https') && !insecure) {
    return { rejectUnauthorized: true };
  }
  if (serverUrl.startsWith('https')) {
    return { rejectUnauthorized: false };
  }
  return {};
}

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
      'offers',
      'calendar_events',
      'settings'
    ];
  }

  /* ========================================
     Connectivity Check
     ======================================== */

  async checkOnline(serverUrl = null) {
    return new Promise((resolve) => {
      // If server URL provided, check the actual server
      // Otherwise check internet connectivity
      const url = serverUrl || 'https://www.google.com';
      const protocol = url.startsWith('https') ? https : http;
      
      console.log(`🔍 Checking connectivity to: ${url}`);
      
      const req = protocol.get(url, (res) => {
        console.log(`✅ Server responded with status: ${res.statusCode}`);
        // Accept any 2xx or 3xx response as "online"
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      
      req.on('error', (error) => {
        console.log(`❌ Connection error: ${error.message}`);
        resolve(false);
      });
      
      req.setTimeout(3000, () => {
        console.log(`⏱️ Connection timeout`);
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
      // First, download all data from server
      console.log('📦 Fetching all data from server...');
      const allData = {};
      
      for (const table of this.tables) {
        try {
          console.log(`📥 Fetching ${table}...`);
          allData[table] = await this.fetchTableData(serverUrl, table);
          console.log(`✅ Fetched ${allData[table] ? allData[table].length : 0} records from ${table}`);
          
          // Log first record as sample (if exists)
          if (allData[table] && allData[table].length > 0) {
            console.log(`   Sample: ${JSON.stringify(allData[table][0]).substring(0, 150)}...`);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${table}:`, error);
          results.tables[table] = {
            success: false,
            error: error.message
          };
          results.errors.push(`${table}: ${error.message}`);
          throw error; // Stop if we can't fetch data
        }
      }
      
      console.log('📊 Fetch summary:');
      for (const table of this.tables) {
        console.log(`   ${table}: ${allData[table] ? allData[table].length : 0} records`);
      }
      
      // Now clear and import all data in a transaction
      console.log('🔄 Clearing old data and importing new data...');
      const db = this.db.db;
      
      const importAll = db.transaction(() => {
        // Temporarily disable foreign key constraints for deletion
        console.log('🔓 Disabling foreign key constraints...');
        db.pragma('foreign_keys = OFF');
        
        // Delete all tables
        console.log('🗑️  Deleting old data from all tables...');
        for (const table of this.tables) {
          console.log(`🗑️  Clearing ${table}...`);
          const deleteResult = db.prepare(`DELETE FROM ${table}`).run();
          console.log(`   Deleted ${deleteResult.changes} rows from ${table}`);
          
          // Reset auto-increment counter
          try {
            db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
          } catch (e) {
            // Ignore if no sequence exists
          }
        }
        
        // Verify deletion
        console.log('🔍 Verifying deletion...');
        for (const table of this.tables) {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          console.log(`   ${table}: ${count.count} rows remaining`);
          if (count.count > 0) {
            throw new Error(`Failed to delete all data from ${table}. ${count.count} rows remaining.`);
          }
        }
        
        // Keep foreign keys DISABLED during import to avoid constraint errors
        console.log('⚠️  Keeping foreign key constraints disabled during import...');
        // Import in normal order (parents first, then children)
        for (const table of this.tables) {
          if (!allData[table]) {
            console.log(`⏭️  Skipping ${table} - no data fetched`);
            continue;
          }
          
          try {
            const data = allData[table];
            if (data && data.length > 0) {
              console.log(`📥 Importing ${data.length} records into ${table}...`);
              
              let importedCount = 0;
              for (const record of data) {
                try {
                  // Convert camelCase keys to snake_case for SQLite
                  const converted = this.convertKeysToSnakeCase(record, table);
                  
                  // Remove sync metadata fields if they exist
                  delete converted._sync_status;
                  delete converted._sync_timestamp;
                  
                  // Validate foreign keys - set to NULL if referenced record doesn't exist
                  if (table === 'calendar_events') {
                    if (converted.client_id) {
                      const clientExists = db.prepare('SELECT 1 FROM clients WHERE id = ?').get(converted.client_id);
                      if (!clientExists) {
                        console.warn(`⚠️  calendar_event #${converted.id}: client_id ${converted.client_id} not found, setting to NULL`);
                        converted.client_id = null;
                      }
                    }
                    if (converted.job_id) {
                      const jobExists = db.prepare('SELECT 1 FROM jobs WHERE id = ?').get(converted.job_id);
                      if (!jobExists) {
                        console.warn(`⚠️  calendar_event #${converted.id}: job_id ${converted.job_id} not found, setting to NULL`);
                        converted.job_id = null;
                      }
                    }
                  }
                  
                  const keys = Object.keys(converted);
                  const values = Object.values(converted);
                  
                  // Validate values
                  values.forEach((val, idx) => {
                    if (val !== null && typeof val === 'object') {
                      throw new TypeError(`Column ${keys[idx]} has invalid value type: ${typeof val}`);
                    }
                  });
                  
                  const placeholders = keys.map(() => '?').join(', ');
                  const sql = `INSERT INTO ${table} (${keys.join(', ')}, _sync_status, _sync_timestamp)
                               VALUES (${placeholders}, 'synced', ${Date.now()})`;
                  
                  db.prepare(sql).run(...values);
                  importedCount++;
                } catch (error) {
                  console.error(`❌ Error importing record #${importedCount + 1} into ${table}:`, error.message);
                  console.error(`   Record:`, JSON.stringify(record).substring(0, 200));
                  throw error; // Rollback transaction on error
                }
              }
              
              results.tables[table] = {
                success: true,
                records: importedCount
              };
              results.totalRecords += importedCount;
              console.log(`✅ Imported ${importedCount} records into ${table}`);
            } else {
              results.tables[table] = {
                success: true,
                records: 0
              };
              console.log(`⏭️  No data to import for ${table}`);
            }
          } catch (error) {
            console.error(`❌ Error processing ${table}:`, error);
            throw error; // Rollback transaction
          }
        }
      });
      
      // Execute transaction
      importAll();
      
      // Re-enable foreign key constraints after import
      console.log('🔒 Re-enabling foreign key constraints...');
      db.pragma('foreign_keys = ON');
      
      // Ensure all changes are written to disk
      console.log('💾 Committing changes to disk...');
      db.pragma('wal_checkpoint(FULL)');
      
      // Mark last sync time
      this.db.setSyncMetadata('last_download', new Date().toISOString());
      
      results.success = results.errors.length === 0;
      console.log(`📥 Download complete. Total records: ${results.totalRecords}`);
      console.log(`📊 Download summary:`, JSON.stringify(results, null, 2));
      
      return results;
    } catch (error) {
      console.error('❌ Download failed:', error);
      results.errors.push(error.message);
      results.success = false;
      return results;
    }
  }

  /* ========================================
     Upload to Server
     ======================================== */

  async uploadToServer(serverUrl) {
    console.log('📤 Starting upload to server...');
    console.log('📍 Server URL:', serverUrl);
    
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
          console.log(`📤 Checking pending changes for ${table}...`);
          const pendingChanges = this.db.getPendingChanges(table);
          console.log(`📦 Found ${pendingChanges.length} pending changes in ${table}`);
          
          if (pendingChanges.length === 0) {
            console.log(`⏭️  Skipping ${table} (no changes)`);
            results.tables[table] = {
              success: true,
              records: 0
            };
            continue;
          }

          // Log sample of pending changes
          console.log(`📄 Sample pending change for ${table}:`, JSON.stringify(pendingChanges[0]).substring(0, 200));
          
          console.log(`🌐 Uploading ${pendingChanges.length} changes to server for ${table}...`);
          const count = await this.uploadTableData(serverUrl, table, pendingChanges);
          console.log(`✅ Server accepted ${count} changes for ${table}`);
          
          // Mark as synced
          const ids = pendingChanges
            .filter(row => row._sync_status !== 'deleted')
            .map(row => row.id);
          
          if (ids.length > 0) {
            console.log(`🔄 Marking ${ids.length} records as synced in ${table}`);
            this.db.markAsSynced(table, ids);
          }
          
          // Actually delete records marked for deletion
          const deletedIds = pendingChanges
            .filter(row => row._sync_status === 'deleted')
            .map(row => row.id);
          
          if (deletedIds.length > 0) {
            console.log(`🗑️  Deleting ${deletedIds.length} records from local ${table}`);
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
          console.error(`❌ Error stack:`, error.stack);
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
      console.log(`📊 Upload results:`, JSON.stringify(results, null, 2));
      
      return results;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      console.error('❌ Upload error stack:', error.stack);
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
    console.log(`[Sync] Converting keys for table ${table}, valid columns:`, Array.from(validColumns));
    const converted = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = this.camelToSnake(key);
        console.log(`[Sync]   ${key} → ${snakeKey} (valid: ${validColumns.has(snakeKey)})`);
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
    console.log(`[Sync] Converted keys:`, Object.keys(converted));
    return converted;
  }

  // Fetch data from server for a table
  async fetchTableData(serverUrl, table) {
    return new Promise((resolve, reject) => {
      // Special case: calendar_events uses calendar.php endpoint
      const endpoint = table === 'calendar_events' ? 'calendar' : table;
      const url = `${serverUrl}/api/${endpoint}.php?action=list`;
      console.log(`🌐 Fetching: ${url}`);
      
      const protocol = url.startsWith('https') ? https : http;
      
      const options = {
        headers: {
          'X-Sync-API-Key': getSyncApiKey()
        },
        ...getHttpsOptions(url)
      };
      
      protocol.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log(`📦 Response for ${table}:`, JSON.stringify(json).substring(0, 300));
            if (json.success) {
              resolve(json.data || []);
            } else {
              console.error(`❌ Server returned error for ${table}:`, json.message);
              console.error(`📄 Full response:`, data);
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
      console.log(`⏭️  No data to import for ${table}`);
      return 0;
    }

    console.log(`📦 Importing ${data.length} records into ${table}...`);
    const db = this.db.db;
    
    try {
      // Begin transaction for better performance
      const insertMany = db.transaction((records) => {
        let successCount = 0;
        for (const record of records) {
          try {
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
            successCount++;
          } catch (error) {
            console.error(`❌ Error importing record into ${table}:`, error.message, record);
            // Continue with other records even if one fails
          }
        }
        return successCount;
      });

      const imported = insertMany(data);
      console.log(`✅ Imported ${imported}/${data.length} records into ${table}`);
      
      // Ensure changes are committed to disk
      db.pragma('wal_checkpoint(FULL)');
      
      return imported;
    } catch (error) {
      console.error(`❌ Transaction error importing ${table}:`, error);
      throw error;
    }
  }

  // Upload table data to server
  async uploadTableData(serverUrl, table, changes) {
    return new Promise((resolve, reject) => {
      const url = `${serverUrl}/api/sync.php`;
      console.log(`🌐 Upload URL: ${url}`);
      console.log(`📦 Uploading ${changes.length} changes for table: ${table}`);
      
      const protocol = url.startsWith('https') ? https : http;
      
      const postData = JSON.stringify({
        table: table,
        changes: changes.map(row => {
          const clean = { ...row };
          delete clean._sync_timestamp;
          return clean;
        })
      });
      
      console.log(`📤 Payload size: ${Buffer.byteLength(postData)} bytes`);
      console.log(`📄 First 300 chars of payload:`, postData.substring(0, 300));
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-Sync-API-Key': getSyncApiKey()
        },
        ...getHttpsOptions(url)
      };
      
      console.log(`🔑 Request headers:`, options.headers);
      
      const req = protocol.request(url, options, (res) => {
        console.log(`📡 Response status: ${res.statusCode}`);
        console.log(`📡 Response headers:`, res.headers);
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`📥 Response received (${data.length} bytes)`);
          console.log(`📄 Response data:`, data.substring(0, 500));
          
          try {
            const json = JSON.parse(data);
            console.log(`✅ Parsed JSON response:`, json);
            
            if (json.success) {
              console.log(`✅ Upload successful for ${table}: ${changes.length} records`);
              resolve(changes.length);
            } else {
              console.error(`❌ Server returned error for ${table}:`, json.message);
              console.error(`📄 Full response:`, data);
              reject(new Error(json.message || 'Failed to upload data'));
            }
          } catch (error) {
            console.error(`❌ Failed to parse JSON response for ${table}:`, error.message);
            console.error(`📄 Raw response:`, data);
            reject(new Error('Invalid JSON response: ' + error.message));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`❌ Request error for ${table}:`, error);
        console.error(`❌ Error code:`, error.code);
        console.error(`❌ Error stack:`, error.stack);
        reject(error);
      });
      
      req.on('timeout', () => {
        console.error(`⏱️  Request timeout for ${table}`);
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      console.log(`📤 Sending request...`);
      req.write(postData);
      req.end();
      console.log(`📤 Request sent for ${table}`);
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
