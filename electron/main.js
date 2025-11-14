/* ========================================
   Electron Main Process
   ======================================== */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./db/sqlite');
const Sync = require('./db/sync');

let mainWindow;
let db;
let syncManager;

// Development mode check
const isDev = process.argv.includes('--dev');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/assets/icons/icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
    db = new Database();
    await db.init();
    console.log('✅ SQLite database initialized');
    
    // Initialize sync manager
    syncManager = new Sync(db);
    console.log('✅ Sync manager initialized');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// App ready
app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

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
    return await db.getAll(table);
  } catch (error) {
    console.error(`Error getting all from ${table}:`, error);
    throw error;
  }
});

// Get single record by ID
ipcMain.handle('db:getById', async (event, table, id) => {
  try {
    return await db.getById(table, id);
  } catch (error) {
    console.error(`Error getting ${table} by id ${id}:`, error);
    throw error;
  }
});

// Insert new record
ipcMain.handle('db:insert', async (event, table, data) => {
  try {
    return await db.insert(table, data);
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
    throw error;
  }
});

// Update record
ipcMain.handle('db:update', async (event, table, id, data) => {
  try {
    return await db.update(table, id, data);
  } catch (error) {
    console.error(`Error updating ${table} id ${id}:`, error);
    throw error;
  }
});

// Delete record
ipcMain.handle('db:delete', async (event, table, id) => {
  try {
    return await db.delete(table, id);
  } catch (error) {
    console.error(`Error deleting from ${table} id ${id}:`, error);
    throw error;
  }
});

// Execute custom query
ipcMain.handle('db:query', async (event, sql, params) => {
  try {
    return await db.query(sql, params);
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
});

/* ========================================
   IPC Handlers - Sync Operations
   ======================================== */

// Check online status
ipcMain.handle('sync:checkOnline', async () => {
  try {
    return await syncManager.checkOnline();
  } catch (error) {
    console.error('Error checking online status:', error);
    return false;
  }
});

// Download data from server
ipcMain.handle('sync:download', async (event, serverUrl) => {
  try {
    const result = await syncManager.downloadFromServer(serverUrl);
    return result;
  } catch (error) {
    console.error('Error downloading from server:', error);
    throw error;
  }
});

// Upload data to server
ipcMain.handle('sync:upload', async (event, serverUrl) => {
  try {
    const result = await syncManager.uploadToServer(serverUrl);
    return result;
  } catch (error) {
    console.error('Error uploading to server:', error);
    throw error;
  }
});

// Get sync status
ipcMain.handle('sync:getStatus', async () => {
  try {
    return await syncManager.getStatus();
  } catch (error) {
    console.error('Error getting sync status:', error);
    throw error;
  }
});

// Get pending changes count
ipcMain.handle('sync:getPendingCount', async () => {
  try {
    return await syncManager.getPendingChangesCount();
  } catch (error) {
    console.error('Error getting pending changes:', error);
    return 0;
  }
});

console.log('🚀 Electron app starting...');
