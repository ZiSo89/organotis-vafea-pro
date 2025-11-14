/* ========================================
   Offline Service
   Handles local database operations via Electron API
   ======================================== */

window.OfflineService = {
  
  // Check if running in Electron
  isElectron() {
    return typeof window.electronAPI !== 'undefined';
  },

  /* ========================================
     Database Operations
     ======================================== */

  async getAll(table) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const data = await window.electronAPI.db.getAll(table);
      return { success: true, data };
    } catch (error) {
      console.error(`Error getting all ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async getById(table, id) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const data = await window.electronAPI.db.getById(table, id);
      return { success: true, data };
    } catch (error) {
      console.error(`Error getting ${table} by id:`, error);
      return { success: false, message: error.message };
    }
  },

  async insert(table, data) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const result = await window.electronAPI.db.insert(table, data);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async update(table, id, data) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const result = await window.electronAPI.db.update(table, id, data);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async delete(table, id) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const result = await window.electronAPI.db.delete(table, id);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async query(sql, params = []) {
    if (!this.isElectron()) {
      throw new Error('Offline mode only available in Electron app');
    }
    
    try {
      const data = await window.electronAPI.db.query(sql, params);
      return { success: true, data };
    } catch (error) {
      console.error('Error executing query:', error);
      return { success: false, message: error.message };
    }
  },

  /* ========================================
     Sync Operations
     ======================================== */

  async checkOnline() {
    if (!this.isElectron()) {
      return navigator.onLine;
    }
    
    try {
      return await window.electronAPI.sync.checkOnline();
    } catch (error) {
      console.error('Error checking online status:', error);
      return false;
    }
  },

  async downloadFromServer(serverUrl) {
    if (!this.isElectron()) {
      throw new Error('Sync only available in Electron app');
    }
    
    try {
      Toast.info('Λήψη δεδομένων από server...');
      const result = await window.electronAPI.sync.download(serverUrl);
      
      if (result.success) {
        Toast.success(`✅ Λήψη ολοκληρώθηκε! ${result.totalRecords} εγγραφές`);
      } else {
        Toast.warning(`⚠️ Λήψη με σφάλματα: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error downloading from server:', error);
      Toast.error('Σφάλμα κατά τη λήψη δεδομένων');
      return { success: false, message: error.message };
    }
  },

  async uploadToServer(serverUrl) {
    if (!this.isElectron()) {
      throw new Error('Sync only available in Electron app');
    }
    
    try {
      Toast.info('Αποστολή δεδομένων στον server...');
      const result = await window.electronAPI.sync.upload(serverUrl);
      
      if (result.success) {
        Toast.success(`✅ Αποστολή ολοκληρώθηκε! ${result.totalRecords} αλλαγές`);
      } else {
        Toast.warning(`⚠️ Αποστολή με σφάλματα: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error uploading to server:', error);
      Toast.error('Σφάλμα κατά την αποστολή δεδομένων');
      return { success: false, message: error.message };
    }
  },

  async getSyncStatus() {
    if (!this.isElectron()) {
      return null;
    }
    
    try {
      return await window.electronAPI.sync.getStatus();
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  },

  async getPendingCount() {
    if (!this.isElectron()) {
      return 0;
    }
    
    try {
      return await window.electronAPI.sync.getPendingCount();
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  },

  /* ========================================
     Table-Specific Helpers
     ======================================== */

  // Clients
  async getClients() {
    return await this.getAll('clients');
  },

  async getClient(id) {
    return await this.getById('clients', id);
  },

  async createClient(data) {
    return await this.insert('clients', data);
  },

  async updateClient(id, data) {
    return await this.update('clients', id, data);
  },

  async deleteClient(id) {
    return await this.delete('clients', id);
  },

  // Jobs
  async getJobs() {
    return await this.getAll('jobs');
  },

  async getJob(id) {
    return await this.getById('jobs', id);
  },

  async createJob(data) {
    return await this.insert('jobs', data);
  },

  async updateJob(id, data) {
    return await this.update('jobs', id, data);
  },

  async deleteJob(id) {
    return await this.delete('jobs', id);
  },

  // Workers
  async getWorkers() {
    return await this.getAll('workers');
  },

  async getWorker(id) {
    return await this.getById('workers', id);
  },

  async createWorker(data) {
    return await this.insert('workers', data);
  },

  async updateWorker(id, data) {
    return await this.update('workers', id, data);
  },

  async deleteWorker(id) {
    return await this.delete('workers', id);
  },

  // Materials
  async getMaterials() {
    return await this.getAll('materials');
  },

  async getMaterial(id) {
    return await this.getById('materials', id);
  },

  async createMaterial(data) {
    return await this.insert('materials', data);
  },

  async updateMaterial(id, data) {
    return await this.update('materials', id, data);
  },

  async deleteMaterial(id) {
    return await this.delete('materials', id);
  },

  // Invoices
  async getInvoices() {
    return await this.getAll('invoices');
  },

  async getInvoice(id) {
    return await this.getById('invoices', id);
  },

  async createInvoice(data) {
    return await this.insert('invoices', data);
  },

  async updateInvoice(id, data) {
    return await this.update('invoices', id, data);
  },

  async deleteInvoice(id) {
    return await this.delete('invoices', id);
  },

  // Offers
  async getOffers() {
    return await this.getAll('offers');
  },

  async getOffer(id) {
    return await this.getById('offers', id);
  },

  async createOffer(data) {
    return await this.insert('offers', data);
  },

  async updateOffer(id, data) {
    return await this.update('offers', id, data);
  },

  async deleteOffer(id) {
    return await this.delete('offers', id);
  },

  // Templates
  async getTemplates() {
    return await this.getAll('templates');
  },

  async getTemplate(id) {
    return await this.getById('templates', id);
  },

  async createTemplate(data) {
    return await this.insert('templates', data);
  },

  async updateTemplate(id, data) {
    return await this.update('templates', id, data);
  },

  async deleteTemplate(id) {
    return await this.delete('templates', id);
  }
};
