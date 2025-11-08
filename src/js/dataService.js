/**
 * Data Service - Dual Mode (Online/Offline) Data Management
 * Handles automatic fallback to localStorage when server is unavailable
 */

class DataService {
    constructor() {
        // Auto-detect environment: local or production
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Detect if running on PHP built-in server (port 8000) or XAMPP (port 80)
        const port = window.location.port;
        const isBuiltInServer = port === '8000' || port === '8080';
        
        this.apiUrl = isLocal 
            ? (isBuiltInServer 
                ? `http://localhost:${port}/api`  // PHP built-in server
                : 'http://localhost/painter-app/api')  // XAMPP
            : 'https://nikolpaintmaster.e-gata.gr/api'; // Production
        
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.lastSync = localStorage.getItem('lastSyncTime') || null;
        
        console.log(`🌐 DataService initialized in ${isLocal ? 'LOCAL' : 'PRODUCTION'} mode`);
        console.log(`📡 API URL: ${this.apiUrl}`);
        
        // Load sync queue from storage
        const savedQueue = localStorage.getItem('syncQueue');
        if (savedQueue) {
            this.syncQueue = JSON.parse(savedQueue);
        }
        
        // Monitor connection status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Check server availability on init
        this.checkServerStatus();
        
        // Periodic server check every 30 seconds
        setInterval(() => this.checkServerStatus(), 30000);
    }

    /**
     * Check if server is available
     */
    async checkServerStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.apiUrl}/ping.php`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            this.isOnline = response.ok;
            this.updateUIStatus();
            return response.ok;
        } catch (error) {
            this.isOnline = false;
            this.updateUIStatus();
            return false;
        }
    }

    /**
     * Update UI offline/online indicator
     */
    updateUIStatus() {
        const indicator = document.getElementById('offlineIndicator');
        if (indicator) {
            if (this.isOnline) {
                indicator.classList.add('hidden');
                // Try to sync pending changes when online
                if (this.syncQueue.length > 0) {
                    this.processSyncQueue();
                }
            } else {
                indicator.classList.remove('hidden');
            }
        }
    }

    /**
     * Handle online event
     */
    handleOnline() {
        console.log('✅ Connection restored - syncing data...');
        this.isOnline = true;
        this.updateUIStatus();
        this.processSyncQueue();
    }

    /**
     * Handle offline event
     */
    handleOffline() {
        console.log('⚠️ Connection lost - switching to offline mode');
        this.isOnline = false;
        this.updateUIStatus();
        if (typeof toast !== 'undefined') {
            toast.show('Λειτουργία Offline - Τα δεδομένα θα συγχρονιστούν όταν επανέλθει η σύνδεση', 'warning');
        }
    }

    /**
     * Main data operation method
     * @param {string} collection - Data collection name (clients, jobs, workers, inventory)
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {object} data - Data to send
     * @param {string|number} id - Item ID for PUT/DELETE operations
     */
    async operate(collection, method = 'GET', data = null, id = null) {
        // Try online first if available
        if (this.isOnline) {
            try {
                return await this.serverOperation(collection, method, data, id);
            } catch (error) {
                console.warn('⚠️ Server operation failed, falling back to local:', error);
                // Fall back to local storage
                return this.localOperation(collection, method, data, id);
            }
        } else {
            // Offline mode - use local storage
            const result = this.localOperation(collection, method, data, id);
            
            // Queue for sync if it's a write operation
            if (method !== 'GET') {
                this.addToSyncQueue(collection, method, data, id);
            }
            
            return result;
        }
    }

    /**
     * Server-based operations
     */
    async serverOperation(collection, method, data, id) {
        const endpoint = id ? `${collection}.php?id=${id}` : `${collection}.php`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('app_auth_token') || ''}`
            },
            credentials: 'include'
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.apiUrl}/${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        
        // Update local cache with server data
        if (method === 'GET') {
            this.updateLocalCache(collection, result);
        }
        
        return result;
    }

    /**
     * Local storage operations
     */
    localOperation(collection, method, data, id) {
        const storageKey = `app_${collection}`;
        let items = JSON.parse(localStorage.getItem(storageKey) || '[]');

        switch(method) {
            case 'GET':
                if (id) {
                    return items.find(item => item.id === id) || null;
                }
                return items;

            case 'POST':
                const newItem = {
                    ...data,
                    id: this.generateLocalId(),
                    created_at: new Date().toISOString(),
                    _local: true, // Mark as local creation
                    _synced: false
                };
                items.push(newItem);
                localStorage.setItem(storageKey, JSON.stringify(items));
                return newItem;

            case 'PUT':
                const updateIndex = items.findIndex(item => item.id === id);
                if (updateIndex !== -1) {
                    items[updateIndex] = {
                        ...items[updateIndex],
                        ...data,
                        updated_at: new Date().toISOString(),
                        _modified: true, // Mark as modified
                        _synced: false
                    };
                    localStorage.setItem(storageKey, JSON.stringify(items));
                    return items[updateIndex];
                }
                return null;

            case 'DELETE':
                const deleteIndex = items.findIndex(item => item.id === id);
                if (deleteIndex !== -1) {
                    const deletedItem = items[deleteIndex];
                    
                    // If item was created locally, remove it completely
                    if (deletedItem._local) {
                        items.splice(deleteIndex, 1);
                    } else {
                        // Mark for deletion on server
                        items[deleteIndex]._deleted = true;
                        items[deleteIndex]._synced = false;
                    }
                    
                    localStorage.setItem(storageKey, JSON.stringify(items));
                    return { success: true };
                }
                return { success: false };

            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    /**
     * Add operation to sync queue
     */
    addToSyncQueue(collection, method, data, id) {
        const queueItem = {
            collection,
            method,
            data,
            id,
            timestamp: new Date().toISOString()
        };
        
        this.syncQueue.push(queueItem);
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
        
        console.log(`📝 Added to sync queue: ${method} ${collection}`, queueItem);
    }

    /**
     * Process sync queue
     */
    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log(`🔄 Processing ${this.syncQueue.length} items in sync queue...`);
        
        const failedItems = [];

        for (const item of this.syncQueue) {
            try {
                await this.serverOperation(item.collection, item.method, item.data, item.id);
                console.log(`✅ Synced: ${item.method} ${item.collection}`);
            } catch (error) {
                console.error(`❌ Sync failed for ${item.collection}:`, error);
                failedItems.push(item);
            }
        }

        // Update queue with failed items only
        this.syncQueue = failedItems;
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
        
        if (failedItems.length === 0) {
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            this.lastSync = new Date().toISOString();
            if (typeof toast !== 'undefined') {
                toast.show('Όλα τα δεδομένα συγχρονίστηκαν επιτυχώς!', 'success');
            }
        } else {
            if (typeof toast !== 'undefined') {
                toast.show(`${failedItems.length} εγγραφές δεν συγχρονίστηκαν`, 'warning');
            }
        }
    }

    /**
     * Full sync from server to local
     */
    async fullSync() {
        if (!this.isOnline) {
            if (typeof toast !== 'undefined') {
                toast.show('Δεν υπάρχει σύνδεση για συγχρονισμό', 'error');
            }
            return false;
        }

        try {
            const collections = ['clients', 'jobs', 'workers', 'inventory'];
            
            for (const collection of collections) {
                const serverData = await this.serverOperation(collection, 'GET');
                this.updateLocalCache(collection, serverData);
                console.log(`✅ Synced ${collection}: ${serverData.length} items`);
            }
            
            localStorage.setItem('lastSyncTime', new Date().toISOString());
            this.lastSync = new Date().toISOString();
            
            if (typeof toast !== 'undefined') {
                toast.show('Πλήρης συγχρονισμός ολοκληρώθηκε!', 'success');
            }
            return true;
        } catch (error) {
            console.error('❌ Full sync failed:', error);
            if (typeof toast !== 'undefined') {
                toast.show('Σφάλμα στον συγχρονισμό', 'error');
            }
            return false;
        }
    }

    /**
     * Update local cache with server data
     */
    updateLocalCache(collection, data) {
        const storageKey = `app_${collection}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`💾 Updated local cache for ${collection}`);
    }

    /**
     * Generate unique local ID
     */
    generateLocalId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export local database as JSON
     */
    exportLocalDatabase() {
        const collections = ['clients', 'jobs', 'workers', 'inventory'];
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            syncQueue: this.syncQueue,
            lastSync: this.lastSync,
            data: {}
        };

        collections.forEach(collection => {
            exportData.data[collection] = JSON.parse(
                localStorage.getItem(`app_${collection}`) || '[]'
            );
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `painter_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📦 Database exported successfully');
    }

    /**
     * Import local database from JSON file
     */
    async importLocalDatabase(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.version || !importData.data) {
                throw new Error('Invalid backup file format');
            }

            // Backup current data first
            this.exportLocalDatabase();

            // Import new data
            Object.keys(importData.data).forEach(collection => {
                localStorage.setItem(`app_${collection}`, 
                    JSON.stringify(importData.data[collection]));
            });

            // Import sync queue and last sync time
            if (importData.syncQueue) {
                this.syncQueue = importData.syncQueue;
                localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
            }
            
            if (importData.lastSync) {
                this.lastSync = importData.lastSync;
                localStorage.setItem('lastSyncTime', this.lastSync);
            }

            if (typeof toast !== 'undefined') {
                toast.show('Δεδομένα εισήχθησαν επιτυχώς!', 'success');
            }
            
            console.log('📥 Database imported successfully');
            
            // Reload the current view if router exists
            if (typeof router !== 'undefined' && router.currentRoute) {
                router.navigate(router.currentRoute);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Import failed:', error);
            if (typeof toast !== 'undefined') {
                toast.show('Σφάλμα κατά την εισαγωγή δεδομένων', 'error');
            }
            return false;
        }
    }

    /**
     * Get sync status information
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            lastSync: this.lastSync,
            pendingChanges: this.syncQueue.length,
            syncQueue: this.syncQueue
        };
    }

    /**
     * Clear all local data
     */
    clearLocalData() {
        const collections = ['clients', 'jobs', 'workers', 'inventory'];
        collections.forEach(collection => {
            localStorage.removeItem(`app_${collection}`);
        });
        localStorage.removeItem('syncQueue');
        this.syncQueue = [];
        console.log('🗑️ All local data cleared');
    }
}

// Initialize global data service
const dataService = new DataService();
