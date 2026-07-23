/**
 * API Service Layer - Οργανωτής Βαφέα Pro
 * Centralized API communication with error handling
 */

class APIService {
    constructor() {
        // In Electron, use the configured server URL, otherwise use relative paths
        if (typeof window.electronAPI !== 'undefined') {
            this.baseURL = localStorage.getItem('syncServerUrl') || 'https://nikolpaintmaster.e-gata.gr';
        } else {
            this.baseURL = window.location.origin.includes('localhost:8000') 
                ? 'http://localhost:8000/api'
                : '/api';
        }
        
        this.authChecked = false;
        this.offlineMode = false;
        this.isElectron = typeof window.electronAPI !== 'undefined';
        
        // Auto-detect offline mode in Electron
        if (this.isElectron) {
            this.checkOnlineStatus();
        }
    }

    /**
     * Check if online and set offline mode accordingly
     */
    async checkOnlineStatus() {
        if (!this.isElectron) {
            this.offlineMode = !navigator.onLine;
            return;
        }
        
        try {
            const isOnline = await window.electronAPI.sync.checkOnline();
            this.offlineMode = !isOnline;
        } catch (error) {
            this.offlineMode = false;
        }
    }

    /**
     * Route request to online or offline service
     */
    async routeRequest(table, action, data = null, id = null) {
        // Force offline mode in Electron (always use SQLite)
        if (this.isElectron) {
            return this.handleOfflineRequest(table, action, data, id);
        }
        
        // Web version uses online API
        return this.handleOnlineRequest(table, action, data, id);
    }

    /**
     * Handle request via online API
     */
    async handleOnlineRequest(table, action, data, id) {
        let endpoint = `/${table}.php?action=${action}`;
        let options = {};
        let result;
        
        if (action === 'list') {
            result = await this.request(endpoint);
        } else if (action === 'get' && id) {
            endpoint += `&id=${id}`;
            result = await this.request(endpoint);
        } else if (action === 'create' && data) {
            options = { method: 'POST', body: JSON.stringify(data) };
            result = await this.request(endpoint, options);
        } else if (action === 'update' && id && data) {
            endpoint += `&id=${id}`;
            options = { method: 'PUT', body: JSON.stringify(data) };
            result = await this.request(endpoint, options);
        } else if (action === 'delete' && id) {
            endpoint += `&id=${id}`;
            options = { method: 'DELETE', body: JSON.stringify({ id }) };
            result = await this.request(endpoint, options);
        }
        
        return window.DataMappers ? window.DataMappers.unwrap(result, result) : (result?.data ?? result);
    }

    /**
     * Handle request via offline SQLite
     */
    async handleOfflineRequest(table, action, data, id) {
        if (!window.OfflineService) {
            throw new Error('Offline service not available');
        }
        
        let result;
        
        if (action === 'list') {
            result = await window.OfflineService.getAll(table);
        } else if (action === 'get' && id) {
            result = await window.OfflineService.getById(table, id);
        } else if (action === 'create' && data) {
            result = await window.OfflineService.insert(table, data);
            console.log('[API] Insert result:', result);
            // After insert, return the newly created record
            if (result.success && result.data) {
                // Check if we have the full record in result.data.record
                if (result.data.record) {
                    console.log('[API] Returning record from insert:', result.data.record);
                    return result.data.record;
                }
                // Otherwise, fetch it by id
                if (result.data.id) {
                    console.log('[API] Fetching newly created record by id:', result.data.id);
                    const newRecord = await window.OfflineService.getById(table, result.data.id);
                    return window.DataMappers ? window.DataMappers.extractRecord(newRecord) : newRecord.data;
                }
            }
        } else if (action === 'update' && id && data) {
            result = await window.OfflineService.update(table, id, data);
            console.log('[API] Update result:', result);
            // After update, return the updated record
            if (result.success && result.data) {
                // Check if we have the full record in result.data.record
                if (result.data.record) {
                    console.log('[API] Returning record from update:', result.data.record);
                    return result.data.record;
                }
            }
            // Fallback: fetch the updated record
            const updatedRecord = await window.OfflineService.getById(table, id);
            return window.DataMappers ? window.DataMappers.extractRecord(updatedRecord) : updatedRecord.data;
        } else if (action === 'delete' && id) {
            result = await window.OfflineService.delete(table, id);
            return !!result.success;
        }
        
        // For list and get operations, return the data directly
        if (result && result.success) {
            return window.DataMappers ? window.DataMappers.unwrap(result, result.data) : result.data;
        } else {
            throw new Error(result?.message || 'Operation failed');
        }
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        console.log('[API] Request:', endpoint, options.method || 'GET');

        // Abort requests that hang (common on PWA cold-start / flaky mobile
        // networks) so they fail fast and can be retried, instead of blocking
        // the whole data load indefinitely.
        const timeoutMs = options.timeoutMs || 15000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Include cookies for session
            signal: controller.signal,
            ...options,
        };
        // `timeoutMs` is our own option, not a valid fetch init field.
        delete config.timeoutMs;

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();
            console.log('[API] Response:', endpoint, 'Status:', response.status);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error(data.message || data.error || 'Μη διαθέσιμη πρόσβαση');
            }

            // Handle other errors
            if (!response.ok || !data.success) {
                console.error('[API] Error response:', endpoint, data);
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            console.log('[API] Success:', endpoint, 'Data:', data);
            return data;
        } catch (error) {
            console.error('[API] Request failed:', endpoint, error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Handle unauthorized access
     */
    handleUnauthorized() {
        console.warn('[API] Received 401 response, but login is disabled');
    }

    /**
     * Check authentication status
     */
    async checkAuth() {
        this.authChecked = true;
        return true;
    }

    /**
     * Logout compatibility no-op
     */
    async logout() {
        window.location.href = 'index.html';
    }

    // ==================== GENERIC HTTP METHODS ====================

    /**
     * GET request
     */
    async get(endpoint) {
        // Remove leading slash if endpoint starts with /api to avoid double /api/api
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`;
        const response = await fetch(url, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${cleanEndpoint}`;
        const response = await fetch(url, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    // ==================== CLIENTS ====================

    async getClients() {
        return await this.routeRequest('clients', 'list');
    }

    async getClient(id) {
        return await this.routeRequest('clients', 'get', null, id);
    }

    async createClient(clientData) {
        return await this.routeRequest('clients', 'create', clientData);
    }

    async updateClient(id, clientData) {
        return await this.routeRequest('clients', 'update', clientData, id);
    }

    async deleteClient(id) {
        return await this.routeRequest('clients', 'delete', null, id);
    }

    // ==================== WORKERS ====================

    async getWorkers() {
        return await this.routeRequest('workers', 'list');
    }

    async getWorker(id) {
        return await this.routeRequest('workers', 'get', null, id);
    }

    async createWorker(workerData) {
        return await this.routeRequest('workers', 'create', workerData);
    }

    async updateWorker(id, workerData) {
        return await this.routeRequest('workers', 'update', workerData, id);
    }

    async deleteWorker(id) {
        return await this.routeRequest('workers', 'delete', null, id);
    }

    // ==================== MATERIALS ====================

    async getMaterials() {
        return await this.routeRequest('materials', 'list');
    }

    async getMaterial(id) {
        return await this.routeRequest('materials', 'get', null, id);
    }

    async createMaterial(materialData) {
        return await this.routeRequest('materials', 'create', materialData);
    }

    async updateMaterial(id, materialData) {
        return await this.routeRequest('materials', 'update', materialData, id);
    }

    async deleteMaterial(id) {
        return await this.routeRequest('materials', 'delete', null, id);
    }

    async getMaterialDuplicateGroups() {
        if (this.isElectron && window.OfflineService?.getMaterialDuplicateGroups) {
            const result = await window.OfflineService.getMaterialDuplicateGroups();
            return result.success ? result.data : [];
        }
        const result = await this.request('/material_duplicates.php');
        return result.data || [];
    }

    async mergeMaterialDuplicates(primaryId, duplicateIds) {
        if (this.isElectron && window.OfflineService?.mergeMaterialDuplicates) {
            const result = await window.OfflineService.mergeMaterialDuplicates(primaryId, duplicateIds);
            if (!result.success) throw new Error(result.message || 'Η συγχώνευση απέτυχε');
            return result.data;
        }
        const result = await this.request('/material_duplicates.php', {
            method: 'POST',
            body: JSON.stringify({ primaryId, duplicateIds })
        });
        return result.data;
    }

    async getMaterialStockMovements() {
        return await this.routeRequest('material_stock_movements', 'list');
    }

    async createMaterialStockMovement(movementData) {
        return await this.routeRequest('material_stock_movements', 'create', movementData);
    }

    // ==================== WAREHOUSE / SUPPLIERS ====================

    async getSuppliers() {
        return await this.routeRequest('suppliers', 'list');
    }

    async getSupplier(id) {
        return await this.routeRequest('suppliers', 'get', null, id);
    }

    async createSupplier(supplierData) {
        return await this.routeRequest('suppliers', 'create', supplierData);
    }

    async updateSupplier(id, supplierData) {
        return await this.routeRequest('suppliers', 'update', supplierData, id);
    }

    async deleteSupplier(id) {
        return await this.routeRequest('suppliers', 'delete', null, id);
    }

    async getMaterialPurchases() {
        return await this.routeRequest('material_purchases', 'list');
    }

    async getMaterialPurchase(id) {
        return await this.routeRequest('material_purchases', 'get', null, id);
    }

    async createMaterialPurchase(purchaseData) {
        return await this.routeRequest('material_purchases', 'create', purchaseData);
    }

    async updateMaterialPurchase(id, purchaseData) {
        return await this.routeRequest('material_purchases', 'update', purchaseData, id);
    }

    async deleteMaterialPurchase(id) {
        return await this.routeRequest('material_purchases', 'delete', null, id);
    }

    async getSupplierPayments() {
        return await this.routeRequest('supplier_payments', 'list');
    }

    async getSupplierPayment(id) {
        return await this.routeRequest('supplier_payments', 'get', null, id);
    }

    async createSupplierPayment(paymentData) {
        return await this.routeRequest('supplier_payments', 'create', paymentData);
    }

    async updateSupplierPayment(id, paymentData) {
        return await this.routeRequest('supplier_payments', 'update', paymentData, id);
    }

    async deleteSupplierPayment(id) {
        return await this.routeRequest('supplier_payments', 'delete', null, id);
    }

    // ==================== JOB PAYMENTS ====================

    async getJobPayments() {
        return await this.routeRequest('job_payments', 'list');
    }

    async createJobPayment(paymentData) {
        return await this.routeRequest('job_payments', 'create', paymentData);
    }

    async updateJobPayment(id, paymentData) {
        return await this.routeRequest('job_payments', 'update', paymentData, id);
    }

    async deleteJobPayment(id) {
        return await this.routeRequest('job_payments', 'delete', null, id);
    }

    // ==================== JOBS ====================

    async getJobs() {
        return await this.routeRequest('jobs', 'list');
    }

    async getJob(id) {
        return await this.routeRequest('jobs', 'get', null, id);
    }

    async getActiveJobActivity(jobId) {
        return await this.get(`/job_visits.php?job_id=${encodeURIComponent(jobId)}&active=1`);
    }

    async getJobVisits(jobId) {
        return await this.get(`/job_visits.php?job_id=${encodeURIComponent(jobId)}`);
    }

    async updateJobVisit(visitId, payload) {
        return await this.put(`/job_visits.php?id=${encodeURIComponent(visitId)}`, payload);
    }

    async deleteJobVisit(visitId) {
        return await this.delete(`/job_visits.php?id=${encodeURIComponent(visitId)}`);
    }

    async toggleJobActivity(jobId, payload = {}) {
        return await this.post('/job_visits.php?action=toggle', {
            jobId: Number(jobId),
            ...payload
        });
    }

    async createJob(jobData) {
        return await this.routeRequest('jobs', 'create', jobData);
    }

    async updateJob(id, jobData) {
        return await this.routeRequest('jobs', 'update', jobData, id);
    }

    async deleteJob(id) {
        return await this.routeRequest('jobs', 'delete', null, id);
    }

    // ==================== OFFERS ====================

    async getOffers() {
        return await this.routeRequest('offers', 'list');
    }

    async getOffer(id) {
        return await this.routeRequest('offers', 'get', null, id);
    }

    async createOffer(offerData) {
        return await this.routeRequest('offers', 'create', offerData);
    }

    async updateOffer(id, offerData) {
        return await this.routeRequest('offers', 'update', offerData, id);
    }

    async deleteOffer(id) {
        return await this.routeRequest('offers', 'delete', null, id);
    }

    // ==================== INVOICES ====================

    async getInvoices() {
        return await this.routeRequest('invoices', 'list');
    }

    async getInvoice(id) {
        return await this.routeRequest('invoices', 'get', null, id);
    }

    async createInvoice(invoiceData) {
        return await this.routeRequest('invoices', 'create', invoiceData);
    }

    async updateInvoice(id, invoiceData) {
        return await this.routeRequest('invoices', 'update', invoiceData, id);
    }

    async deleteInvoice(id) {
        return await this.routeRequest('invoices', 'delete', null, id);
    }

    // ==================== TEMPLATES ====================

    async getTemplates() {
        return await this.routeRequest('templates', 'list');
    }

    async getTemplate(id) {
        return await this.routeRequest('templates', 'get', null, id);
    }

    async createTemplate(templateData) {
        return await this.routeRequest('templates', 'create', templateData);
    }

    async updateTemplate(id, templateData) {
        return await this.routeRequest('templates', 'update', templateData, id);
    }

    async deleteTemplate(id) {
        return await this.routeRequest('templates', 'delete', null, id);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        try {
            const [clients, workers, materials, jobs, invoices] = await Promise.all([
                this.getClients(),
                this.getWorkers(),
                this.getMaterials(),
                this.getJobs(),
                this.getInvoices(),
            ]);

            // Helper to safely access is_paid field (handles both snake_case and camelCase)
            const isUnpaid = (invoice) => {
                const isPaid = invoice.is_paid !== undefined ? invoice.is_paid : invoice.isPaid;
                return !isPaid || isPaid === 0 || isPaid === '0' || isPaid === false;
            };

            // Helper to safely access stock fields
            const isLowStock = (material) => {
                const stock = parseFloat(material.stock || 0);
                const minStock = parseFloat(material.min_stock !== undefined ? material.min_stock : material.minStock || 0);
                return stock <= minStock;
            };

            return {
                totalClients: clients.length,
                totalWorkers: workers.length,
                totalMaterials: materials.length,
                activeJobs: jobs.filter(j => j.status === 'in-progress' || j.status === 'Σε εξέλιξη').length,
                pendingJobs: jobs.filter(j => j.status === 'pending' || j.status === 'Υποψήφιος' || j.status === 'Προγραμματισμένη').length,
                completedJobs: jobs.filter(j => j.status === 'completed' || j.status === 'Ολοκληρώθηκε').length,
                unpaidInvoices: invoices.filter(isUnpaid).length,
                lowStockMaterials: materials.filter(isLowStock).length,
            };
        } catch (error) {
            throw error;
        }
    }
}

// Create singleton instance
const API = new APIService();

// Make it globally available
if (typeof window !== 'undefined') {
    window.API = API;
}
