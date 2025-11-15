/* ========================================
   Electron Preload Script
   Secure bridge between main and renderer
   ======================================== */

const { contextBridge, ipcRenderer } = require('electron');

// Database ready promise
let dbReadyResolve;
const dbReadyPromise = new Promise((resolve) => {
  dbReadyResolve = resolve;
});

// Listen for database ready event
ipcRenderer.on('db:ready', () => {
  console.log('✅ Database ready event received');
  dbReadyResolve(true);
});

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  
  /* ========================================
     Database Operations
     ======================================== */
  
  db: {
    // Wait for database to be ready
    waitReady: () => dbReadyPromise,
    
    // Get all records from a table
    getAll: (table) => ipcRenderer.invoke('db:getAll', table),
    
    // Get single record by ID
    getById: (table, id) => ipcRenderer.invoke('db:getById', table, id),
    
    // Insert new record
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    
    // Update record
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    
    // Delete record
    delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
    
    // Execute custom query
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    
    // Export database to JSON
    export: () => ipcRenderer.invoke('db:export'),
    
    // Import database from JSON
    import: (backupData) => ipcRenderer.invoke('db:import', backupData)
  },
  
  /* ========================================
     Sync Operations
     ======================================== */
  
  sync: {
    // Check if server is online
    checkOnline: () => ipcRenderer.invoke('sync:checkOnline'),
    
    // Download data from server
    download: (serverUrl) => ipcRenderer.invoke('sync:download', serverUrl),
    
    // Upload data to server
    upload: (serverUrl) => ipcRenderer.invoke('sync:upload', serverUrl),
    
    // Get sync status
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    
    // Get pending changes count
    getPendingCount: () => ipcRenderer.invoke('sync:getPendingCount')
  },
  
  /* ========================================
     Platform Info
     ======================================== */
  
  platform: {
    isElectron: true,
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

console.log('✅ Preload script loaded - Electron APIs exposed');
