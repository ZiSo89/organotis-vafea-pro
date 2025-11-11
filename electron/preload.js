/* ========================================
   Electron Preload Script
   Secure bridge between main and renderer
   ======================================== */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  
  /* ========================================
     Database Operations
     ======================================== */
  
  db: {
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
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params)
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
