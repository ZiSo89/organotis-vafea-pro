/* ========================================
   Electron Main Process
   ======================================== */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Development mode check (also silences verbose console output in production)
const isDev = process.argv.includes('--dev') || process.env.PAINTER_DEBUG === '1';
if (!isDev) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

// Log file setup
const logDir = app.getPath('logs');
const logFile = path.join(logDir, 'main.log');

// Simple logger
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  log('❌ Uncaught Exception: ' + error.message);
  log('Stack: ' + error.stack);
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled Rejection at: ' + promise + ', reason: ' + reason);
  console.error('Unhandled Rejection:', reason);
});

log('🚀 Electron app starting...');
log('📁 Log file: ' + logFile);

const Database = require('./db/sqlite');
const Sync = require('./db/sync');

let mainWindow;
let db;
let syncManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/assets/icons/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: false,
      enableRemoteModule: false,
      // Allow text selection and input focus
      disableBlinkFeatures: ''
    },
    show: false,
    backgroundColor: '#1a1a2e'
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database
async function initDatabase() {
  try {
    log('📦 Initializing database...');
    db = new Database();
    await db.init();
    log('✅ SQLite database initialized');
    
    // Initialize sync manager
    syncManager = new Sync(db);
    log('✅ Sync manager initialized');
    
    return true;
  } catch (error) {
    log('❌ Database initialization failed: ' + error.message);
    log('Stack: ' + error.stack);
    return false;
  }
}

// App ready
app.whenReady().then(async () => {
  log('📱 App ready event fired');
  const dbReady = await initDatabase();
  if (!dbReady) {
    log('❌ Failed to initialize database, exiting...');
    app.quit();
    return;
  }
  
  log('🪟 Creating window...');
  createWindow();
  
  // Notify renderer that database is ready
  mainWindow.webContents.on('did-finish-load', () => {
    log('📱 Window loaded, database ready');
    mainWindow.webContents.send('db:ready', { ready: true });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

/* ========================================
   IPC Handlers - Database Operations
   ======================================== */

// Get all data from a table
ipcMain.handle('db:getAll', async (event, table) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const data = await db.getAll(table);
    return { success: true, data };
  } catch (error) {
    console.error(`Error getting all from ${table}:`, error);
    return { success: false, message: error.message };
  }
});

// Get single record by ID
ipcMain.handle('db:getById', async (event, table, id) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const data = await db.getById(table, id);
    return { success: true, data };
  } catch (error) {
    console.error(`Error getting ${table} by id ${id}:`, error);
    return { success: false, message: error.message };
  }
});

// Insert new record
ipcMain.handle('db:insert', async (event, table, data) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db.insert(table, data);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { success: false, message: error.message };
  }
});

// Update record
ipcMain.handle('db:update', async (event, table, id, data) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db.update(table, id, data);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error updating ${table} id ${id}:`, error);
    return { success: false, message: error.message };
  }
});

// Delete record
ipcMain.handle('db:delete', async (event, table, id) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = await db.delete(table, id);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error deleting from ${table} id ${id}:`, error);
    return { success: false, message: error.message };
  }
});

// Execute custom query
ipcMain.handle('db:query', async (event, sql, params) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const data = await db.query(sql, params);
    return { success: true, data };
  } catch (error) {
    console.error('Error executing query:', error);
    return { success: false, message: error.message };
  }
});

/* ========================================
   IPC Handlers - Sync Operations
   ======================================== */

// Check online status
ipcMain.handle('sync:checkOnline', async (event, serverUrl) => {
  try {
    if (!syncManager) {
      return false;
    }
    return await syncManager.checkOnline(serverUrl);
  } catch (error) {
    console.error('Error checking online status:', error);
    return false;
  }
});

// Download data from server
ipcMain.handle('sync:download', async (event, serverUrl) => {
  try {
    log('📥 [IPC] Download request received');
    log('📍 [IPC] Server URL: ' + serverUrl);
    
    if (!syncManager) {
      log('❌ [IPC] Sync manager not initialized');
      throw new Error('Sync manager not initialized');
    }
    
    log('🚀 [IPC] Starting download process...');
    const result = await syncManager.downloadFromServer(serverUrl);
    
    log('✅ [IPC] Download completed');
    log('📊 [IPC] Download result: ' + JSON.stringify(result, null, 2));
    
    // Notify renderer that data has been refreshed (after a small delay to ensure DB commits)
    setTimeout(() => {
      if (mainWindow && mainWindow.webContents) {
        log('📢 [IPC] Sending data-refreshed event to renderer');
        mainWindow.webContents.send('data-refreshed', { 
          source: 'download',
          totalRecords: result.totalRecords,
          tables: result.tables
        });
      }
    }, 100);
    
    return result;
  } catch (error) {
    log('❌ [IPC] Download error: ' + error.message);
    log('❌ [IPC] Error stack: ' + error.stack);
    console.error('Error downloading from server:', error);
    throw error;
  }
});

// Upload data to server
ipcMain.handle('sync:upload', async (event, serverUrl) => {
  try {
    log('📤 [IPC] Upload request received');
    log('📍 [IPC] Server URL: ' + serverUrl);
    
    if (!syncManager) {
      log('❌ [IPC] Sync manager not initialized');
      throw new Error('Sync manager not initialized');
    }
    
    log('🚀 [IPC] Starting upload process...');
    const result = await syncManager.uploadToServer(serverUrl);
    
    log('✅ [IPC] Upload completed');
    log('📊 [IPC] Upload result: ' + JSON.stringify(result, null, 2));
    
    // Notify renderer that data has been uploaded (no need to reload data)
    if (result.success) {
      setTimeout(() => {
        if (mainWindow && mainWindow.webContents) {
          log('📢 [IPC] Sending data-uploaded event to renderer');
          mainWindow.webContents.send('data-uploaded', { 
            source: 'upload',
            totalRecords: result.totalRecords,
            tables: result.tables
          });
        }
      }, 100);
    }
    
    return result;
  } catch (error) {
    log('❌ [IPC] Upload error: ' + error.message);
    log('❌ [IPC] Error stack: ' + error.stack);
    console.error('Error uploading to server:', error);
    throw error;
  }
});

// Get sync status
ipcMain.handle('sync:getStatus', async () => {
  try {
    if (!syncManager) {
      return null;
    }
    return await syncManager.getStatus();
  } catch (error) {
    console.error('Error getting sync status:', error);
    return null;
  }
});

// Get pending changes count
ipcMain.handle('sync:getPendingCount', async () => {
  try {
    if (!syncManager) {
      return 0;
    }
    return await syncManager.getPendingChangesCount();
  } catch (error) {
    console.error('Error getting pending changes:', error);
    return 0;
  }
});

/* ========================================
   IPC Handlers - Backup & Restore
   ======================================== */

// Export database to JSON
ipcMain.handle('db:export', async () => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const backup = db.exportToJSON();
    return { success: true, data: backup };
  } catch (error) {
    console.error('Error exporting database:', error);
    return { success: false, error: error.message };
  }
});

// Import database from JSON
ipcMain.handle('db:import', async (event, backupData) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const result = db.importFromJSON(backupData);
    return { success: true };
  } catch (error) {
    console.error('Error importing database:', error);
    return { success: false, error: error.message };
  }
});

console.log('🚀 Electron app starting...');
