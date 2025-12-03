/* ========================================
   Geocoding Utility
   Free geocoding using Nominatim/Photon APIs
   NOTE: Coordinates are stored in database, not localStorage
   ======================================== */

window.Geocoding = {
  // Session cache only (not persisted)
  cache: {},
  lastRequestTime: 0,
  
  /**
   * Get coordinates for an address
   * Uses backend PHP proxy (Web) or direct Nominatim API (Electron)
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
      const isElectron = typeof window.electronAPI !== 'undefined';
      let result;
      
      if (isElectron) {
        // Electron: Direct Nominatim API call
        // Rate limiting: 1 request per second
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NikolPaintMaster/1.0'
          }
        });
        
        if (!response.ok) {
          console.warn('⚠️ Nominatim API failed:', response.status);
          return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const coords = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
          this.cache[cacheKey] = coords;
          console.log('✅ Found coordinates:', coords);
          return coords;
        }
      } else {
        // Web: Use backend PHP proxy (avoids CORS issues)
        const url = `/api/geocode.php?address=${encodeURIComponent(fullAddress)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn('⚠️ Geocoding API failed:', response.status);
          return null;
        }
        
        result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const coords = {
            lat: parseFloat(result.data[0].lat),
            lng: parseFloat(result.data[0].lon)
          };
          this.cache[cacheKey] = coords;
          console.log('✅ Found coordinates:', coords);
          return coords;
        }
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
  }
};

// No initialization needed - session cache only
