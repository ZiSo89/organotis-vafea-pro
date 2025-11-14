/* ========================================
   Search & Filter System
   ======================================== */

const Search = {
  // Generic search function
  search(items, query, fields = []) {
    if (!query || query.trim() === '') return items;

    const searchTerm = query.toLowerCase().trim();

    return items.filter(item => {
      // Search in specified fields
      if (fields.length > 0) {
        return fields.some(field => {
          const value = item[field];
          if (!value) return false;
          return String(value).toLowerCase().includes(searchTerm);
        });
      }

      // Search in all string fields
      return Object.values(item).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    });
  },

  // Filter by multiple criteria
  filter(items, filters = {}) {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === '' || value === null || value === undefined) return true;
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    });
  },

  // Highlight search terms in text
  highlight(text, query) {
    if (!query || !text) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
};
