/**
 * API Service Layer - Οργανωτής Βαφέα Pro
 * Centralized API communication with error handling and authentication
 */

class APIService {
    constructor() {
        this.baseURL = window.location.origin.includes('localhost:8000') 
            ? 'http://localhost:8000/api'
            : '/api';
        this.authChecked = false;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Include cookies for session
            ...options,
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();

            // Handle authentication errors
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Μη εξουσιοδοτημένη πρόσβαση');
            }

            // Handle other errors
            if (!response.ok || !data.success) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Handle unauthorized access
     */
    handleUnauthorized() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    /**
     * Check authentication status
     */
    async checkAuth() {
        try {
            const data = await this.request('/auth.php?action=check');
            this.authChecked = true;
            return data.authenticated;
        } catch (error) {
            this.authChecked = false;
            return false;
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await this.request('/auth.php?action=logout', { method: 'POST' });
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Redirect anyway
            window.location.href = 'login.html';
        }
    }

    // ==================== CLIENTS ====================

    async getClients() {
        const data = await this.request('/clients.php');
        return data.data;
    }

    async getClient(id) {
        const data = await this.request(`/clients.php?id=${id}`);
        return data.data;
    }

    async createClient(clientData) {
        const data = await this.request('/clients.php', {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
        return data.data;
    }

    async updateClient(id, clientData) {
        const data = await this.request(`/clients.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData),
        });
        return data.data;
    }

    async deleteClient(id) {
        await this.request(`/clients.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== WORKERS ====================

    async getWorkers() {
        const data = await this.request('/workers.php');
        return data.data;
    }

    async getWorker(id) {
        const data = await this.request(`/workers.php?id=${id}`);
        return data.data;
    }

    async createWorker(workerData) {
        const data = await this.request('/workers.php', {
            method: 'POST',
            body: JSON.stringify(workerData),
        });
        return data.data;
    }

    async updateWorker(id, workerData) {
        const data = await this.request(`/workers.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(workerData),
        });
        return data.data;
    }

    async deleteWorker(id) {
        await this.request(`/workers.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== MATERIALS ====================

    async getMaterials() {
        const data = await this.request('/materials.php');
        return data.data;
    }

    async getMaterial(id) {
        const data = await this.request(`/materials.php?id=${id}`);
        return data.data;
    }

    async createMaterial(materialData) {
        const data = await this.request('/materials.php', {
            method: 'POST',
            body: JSON.stringify(materialData),
        });
        return data.data;
    }

    async updateMaterial(id, materialData) {
        const data = await this.request(`/materials.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(materialData),
        });
        return data.data;
    }

    async deleteMaterial(id) {
        await this.request(`/materials.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== JOBS ====================

    async getJobs() {
        const data = await this.request('/jobs.php');
        return data.data;
    }

    async getJob(id) {
        const data = await this.request(`/jobs.php?id=${id}`);
        return data.data;
    }

    async createJob(jobData) {
        const data = await this.request('/jobs.php', {
            method: 'POST',
            body: JSON.stringify(jobData),
        });
        return data.data;
    }

    async updateJob(id, jobData) {
        const data = await this.request(`/jobs.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(jobData),
        });
        return data.data;
    }

    async deleteJob(id) {
        await this.request(`/jobs.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== OFFERS ====================

    async getOffers() {
        const data = await this.request('/offers.php');
        return data.data;
    }

    async getOffer(id) {
        const data = await this.request(`/offers.php?id=${id}`);
        return data.data;
    }

    async createOffer(offerData) {
        const data = await this.request('/offers.php', {
            method: 'POST',
            body: JSON.stringify(offerData),
        });
        return data.data;
    }

    async updateOffer(id, offerData) {
        const data = await this.request(`/offers.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(offerData),
        });
        return data.data;
    }

    async deleteOffer(id) {
        await this.request(`/offers.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== INVOICES ====================

    async getInvoices() {
        const data = await this.request('/invoices.php');
        return data.data;
    }

    async getInvoice(id) {
        const data = await this.request(`/invoices.php?id=${id}`);
        return data.data;
    }

    async createInvoice(invoiceData) {
        const data = await this.request('/invoices.php', {
            method: 'POST',
            body: JSON.stringify(invoiceData),
        });
        return data.data;
    }

    async updateInvoice(id, invoiceData) {
        const data = await this.request(`/invoices.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData),
        });
        return data.data;
    }

    async deleteInvoice(id) {
        await this.request(`/invoices.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ==================== TEMPLATES ====================

    async getTemplates() {
        const data = await this.request('/templates.php');
        return data.data;
    }

    async getTemplate(id) {
        const data = await this.request(`/templates.php?id=${id}`);
        return data.data;
    }

    async createTemplate(templateData) {
        const data = await this.request('/templates.php', {
            method: 'POST',
            body: JSON.stringify(templateData),
        });
        return data.data;
    }

    async updateTemplate(id, templateData) {
        const data = await this.request(`/templates.php?id=${id}`, {
            method: 'PUT',
            body: JSON.stringify(templateData),
        });
        return data.data;
    }

    async deleteTemplate(id) {
        await this.request(`/templates.php?id=${id}`, {
            method: 'DELETE',
        });
        return true;
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

            return {
                totalClients: clients.length,
                totalWorkers: workers.length,
                totalMaterials: materials.length,
                activeJobs: jobs.filter(j => j.status === 'in-progress').length,
                pendingJobs: jobs.filter(j => j.status === 'pending').length,
                completedJobs: jobs.filter(j => j.status === 'completed').length,
                unpaidInvoices: invoices.filter(i => !i.isPaid).length,
                lowStockMaterials: materials.filter(m => parseFloat(m.stock) <= parseFloat(m.minStock)).length,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
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
