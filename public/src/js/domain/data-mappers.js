/* ========================================
   Data Mappers / Response Normalization
   ======================================== */

const DataMappers = {
  unwrap(response, fallback = null) {
    if (response === undefined || response === null) return fallback;

    if (response.success !== undefined && response.data !== undefined) {
      return response.data ?? fallback;
    }

    if (response.data !== undefined && Object.keys(response).length <= 2) {
      return response.data ?? fallback;
    }

    return response;
  },

  extractCollection(response, fallback = []) {
    const data = this.unwrap(response, fallback);

    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.records)) return data.records;
    if (data && Array.isArray(data.items)) return data.items;

    return fallback;
  },

  extractRecord(response, fallback = null) {
    const data = this.unwrap(response, fallback);

    if (Array.isArray(data)) return data[0] ?? fallback;
    if (data && typeof data === 'object' && data.record) return data.record;

    return data && typeof data === 'object' ? data : fallback;
  },

  normalizeId(value) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : String(value);
  },

  parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || value === 'null' || value === 'undefined') return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[DataMappers] Invalid JSON array:', error);
      return [];
    }
  }
};

window.DataMappers = DataMappers;
