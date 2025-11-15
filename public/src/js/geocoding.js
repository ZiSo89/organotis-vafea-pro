/* ========================================
   Geocoding Utility
   Free geocoding using Nominatim/Photon APIs
   ======================================== */

window.Geocoding = {
  cache: {},
  
  /**
   * Get coordinates for an address
   * Uses Photon API (free, fast, supports Greek) with Nominatim fallback
   */
  async getCoordinates(address, city, postalCode = '') {
    // Build full address
    const fullAddress = `${address}, ${city}, ${postalCode} Greece`.trim();
    
    // Check cache first
    const cacheKey = fullAddress.toLowerCase();
    if (this.cache[cacheKey]) {
      console.log('📍 Using cached coordinates for:', fullAddress);
      return this.cache[cacheKey];
    }
    
    console.log('🔍 Geocoding:', fullAddress);
    
    try {
      // Try Photon API first (better for Greek addresses, no rate limit)
      const coords = await this.geocodeWithPhoton(fullAddress);
      
      if (coords) {
        this.cache[cacheKey] = coords;
        this.saveCache();
        return coords;
      }
      
      // Fallback to Nominatim
      const coords2 = await this.geocodeWithNominatim(fullAddress);
      
      if (coords2) {
        this.cache[cacheKey] = coords2;
        this.saveCache();
        return coords2;
      }
      
      console.warn('⚠️ No coordinates found for:', fullAddress);
      return null;
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  },
  
  /**
   * Geocode using Photon API (Komoot - Free, no rate limit)
   */
  async geocodeWithPhoton(address) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lang=el`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('⚠️ Photon API failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates;
        // Note: GeoJSON format is [lng, lat]
        return {
          lat: coords[1],
          lng: coords[0]
        };
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Photon geocoding failed:', error);
      return null;
    }
  },
  
  /**
   * Geocode using Nominatim (OpenStreetMap - Free but with rate limit)
   */
  async geocodeWithNominatim(address) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
        q: address,
        format: 'json',
        limit: 1,
        'accept-language': 'el,en',
        countrycodes: 'gr'
      });
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PainterOrganizerApp/1.0'
        }
      });
      
      if (!response.ok) {
        console.warn('⚠️ Nominatim API failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Nominatim geocoding failed:', error);
      return null;
    }
  },
  
  /**
   * Load cache from localStorage
   */
  loadCache() {
    try {
      const cached = localStorage.getItem('geocode_cache');
      if (cached) {
        this.cache = JSON.parse(cached);
        console.log('📦 Loaded', Object.keys(this.cache).length, 'cached coordinates');
      }
    } catch (error) {
      console.error('❌ Error loading geocode cache:', error);
    }
  },
  
  /**
   * Save cache to localStorage
   */
  saveCache() {
    try {
      localStorage.setItem('geocode_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('❌ Error saving geocode cache:', error);
    }
  },
  
  /**
   * Initialize - load cache
   */
  init() {
    this.loadCache();
  }
};

// Initialize on startup
if (typeof window !== 'undefined' && window.Geocoding) {
  window.Geocoding.init();
}
