/* ========================================
   Map View - Χάρτης Πελατών & Επισκέψεων
   ======================================== */

window.MapView = {
  map: null,
  isLeaflet: false,
  isInitializing: false, // Prevent multiple simultaneous initializations
  markers: {
    clients: [],
    upcoming: [],
    today: []
  },
  geocodeCache: {},
  requestCount: 0,
  maxRequests: 100,

  render(container) {
    const isMobile = Utils.isMobile();
    const mapHeight = isMobile ? '450px' : '600px';
    
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-map-marked-alt"></i> Χάρτης</h1>
      </div>

      <!-- Map Controls -->
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
            <label class="toggle-switch" title="Εμφάνιση όλων των πελατών με διεύθυνση">
              <input type="checkbox" id="showClients" checked>
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                <span style="color: #2196F3; font-size: 1.2rem;">⬤</span> Πελάτες
              </span>
            </label>
            
            <label class="toggle-switch" title="Επισκέψεις που προγραμματίζονται τις επόμενες 7 ημέρες">
              <input type="checkbox" id="showUpcoming" checked>
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                <span style="color: #4CAF50; font-size: 1.2rem;">⬤</span> Επόμενες Επισκέψεις
              </span>
            </label>
            
            <label class="toggle-switch" title="Επισκέψεις που έχουν προγραμματιστεί για σήμερα">
              <input type="checkbox" id="showToday" checked>
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                <span style="color: #F44336; font-size: 1.2rem;">⬤</span> Σημερινές Επισκέψεις
              </span>
            </label>
          </div>
          
          <div style="display: flex; gap: 1rem; align-items: center;">
            <button class="btn btn-secondary" id="refreshMapBtn">
              <i class="fas fa-sync-alt"></i> Ανανέωση
            </button>
            <span id="geocodeCount" style="color: #666; font-size: 0.9rem; white-space: nowrap;">
              Requests: ${this.requestCount}/${this.maxRequests}
            </span>
          </div>
        </div>
      </div>

      <!-- Map Container -->
      <div class="card" style="padding: 0; overflow: hidden; position: relative;">
        <div id="map" style="width: 100%; height: ${mapHeight};"></div>
        ${isMobile ? `
          <button id="scrollToTopBtn" style="
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--color-primary);
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            z-index: 1000;
          " title="Πήγαινε στην αρχή">
            <i class="fas fa-arrow-up"></i>
          </button>
        ` : ''}
      </div>
    `;

    // Event listeners
    document.getElementById('showClients').addEventListener('change', () => this.toggleLayer('clients'));
    document.getElementById('showUpcoming').addEventListener('change', () => this.toggleLayer('upcoming'));
    document.getElementById('showToday').addEventListener('change', () => this.toggleLayer('today'));
    document.getElementById('refreshMapBtn').addEventListener('click', () => this.loadMap(true));
    
    // Scroll to top button (mobile only)
    if (isMobile) {
      const scrollBtn = document.getElementById('scrollToTopBtn');
      if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }

    // Load geocode cache from localStorage
    const cached = localStorage.getItem('geocode_cache');
    if (cached) {
      this.geocodeCache = JSON.parse(cached);
    }

    // Reset initialization flag when rendering
    this.isInitializing = false;

    // Wait for Google Maps to be ready, then initialize
    this.waitForGoogleMaps();
  },

  waitForGoogleMaps(attempts = 0) {
    // Prevent multiple simultaneous initialization attempts
    if (this.isInitializing) {
      return;
    }
    
    const maxAttempts = 20;
    
    // Check if Google Maps is already loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
      this.isInitializing = true;
      setTimeout(() => {
        this.initMap();
        this.isInitializing = false;
      }, 100);
      return;
    }
    
    // First attempt: Try to load Google Maps
    if (attempts === 0 && typeof loadGoogleMaps === 'function') {
      this.isInitializing = true;
      loadGoogleMaps()
        .then(() => {
          setTimeout(() => {
            this.initMap();
            this.isInitializing = false;
          }, 100);
        })
        .catch((err) => {
          this.initLeafletMap();
          this.isInitializing = false;
        });
      return;
    }
    
    // Continue waiting if already loading
    if (attempts < maxAttempts) {
      setTimeout(() => this.waitForGoogleMaps(attempts + 1), 200);
    } else {
      // Timeout - fallback to Leaflet
      this.isInitializing = true;
      this.initLeafletMap();
    }
  },

  initLeafletMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Map element not found!');
      this.isInitializing = false;
      return;
    }

    // Load Leaflet if not already loaded
    if (typeof L === 'undefined') {
      this.loadLeafletLibrary().then(() => {
        this.createLeafletMap();
      }).catch(error => {
        console.error('❌ Failed to load Leaflet:', error);
        mapElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;"><p><i class="fas fa-exclamation-triangle"></i> Αποτυχία φόρτωσης χάρτη</p></div>';
        this.isInitializing = false;
      });
    } else {
      this.createLeafletMap();
    }
  },

  loadLeafletLibrary() {
    return new Promise((resolve, reject) => {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  createLeafletMap() {
    try {
      const mapElement = document.getElementById('map');
      
      // Destroy existing map if it exists
      if (this.map) {
        this.clearMarkers();
        
        if (this.isLeaflet && this.map.remove) {
          this.map.remove();
        }
        
        this.map = null;
      }
      
      // Clear the map container completely
      mapElement.innerHTML = '';
      
      // Remove Leaflet's internal references
      if (mapElement._leaflet_id) {
        delete mapElement._leaflet_id;
      }
      
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        try {
          // Create new Leaflet map
          this.map = L.map('map').setView([40.8473, 25.8753], 14);
          this.isLeaflet = true;

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(this.map);

          this.loadMap();
          this.isInitializing = false;
        } catch (innerError) {
          console.error('❌ Error creating Leaflet map:', innerError);
          this.isInitializing = false;
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error initializing Leaflet map:', error);
      this.isInitializing = false;
    }
  },

  initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Map element not found!');
      this.isInitializing = false;
      return;
    }

    // Check if we need to create a new map instance
    let needsNewInstance = !this.map || this.isLeaflet;
    
    if (this.map && !this.isLeaflet && typeof google !== 'undefined' && google.maps) {
      // Verify the map's DOM element still exists and matches
      try {
        const currentMapDiv = this.map.getDiv();
        if (!currentMapDiv || !document.body.contains(currentMapDiv)) {
          needsNewInstance = true;
        } else {
          this.loadMap();
          this.isInitializing = false;
          return;
        }
      } catch (e) {
        needsNewInstance = true;
      }
    }

    // Center on Alexandroupoli
    const center = { lat: 40.8473, lng: 25.8753 };
    
    try {
      this.map = new google.maps.Map(mapElement, {
        zoom: 14,
        center: center,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      });
      this.isLeaflet = false;

      this.loadMap();
      this.isInitializing = false;
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      this.isInitializing = false;
    }
  },

  async loadMap(forceRefresh = false) {
    if (!this.map) return;

    // Clear existing markers
    this.clearMarkers();

    const clients = State.data.clients || [];
    const jobs = State.data.jobs || [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get upcoming jobs
    const upcomingJobs = jobs.filter(job => {
      if (!job.nextVisit) return false;
      const visitDate = new Date(job.nextVisit);
      visitDate.setHours(0, 0, 0, 0);
      return visitDate >= today && visitDate <= nextWeek;
    });

    // Get today's jobs
    const todayJobs = upcomingJobs.filter(job => {
      const visitDate = new Date(job.nextVisit);
      visitDate.setHours(0, 0, 0, 0);
      return visitDate.getTime() === today.getTime();
    });

    let addedMarkers = 0;

    // Add client markers (blue)
    if (document.getElementById('showClients').checked) {
      for (const client of clients) {
        if (client.address && client.city) {
          await this.addMarker(client, 'clients', '#2196F3');
          addedMarkers++;
        }
      }
    }

    // Add upcoming visit markers (green)
    if (document.getElementById('showUpcoming').checked) {
      for (const job of upcomingJobs) {
        const client = clients.find(c => c.id === job.clientId);
        if (client && client.address && client.city) {
          await this.addMarker(client, 'upcoming', '#4CAF50', job);
          addedMarkers++;
        }
      }
    }

    // Add today's visit markers (red)
    if (document.getElementById('showToday').checked) {
      for (const job of todayJobs) {
        const client = clients.find(c => c.id === job.clientId);
        if (client && client.address && client.city) {
          await this.addMarker(client, 'today', '#F44336', job);
          addedMarkers++;
        }
      }
    }

    // Update request count
    document.getElementById('geocodeCount').textContent = 
      `Requests: ${this.requestCount}/${this.maxRequests}`;

    // Fit bounds to show all markers
    this.fitBounds();
  },

  async addMarker(client, type, color, job = null) {
    const address = `${client.address}, ${client.city}, ${client.postal || ''} Greece`;
    
    // Check cache first
    let location = this.geocodeCache[address];
    
    if (!location || location === 'ZERO_RESULTS') {
      // Geocode if not in cache
      location = await this.geocodeAddress(address);
      
      // Save to cache
      this.geocodeCache[address] = location;
      localStorage.setItem('geocode_cache', JSON.stringify(this.geocodeCache));
      
      // Small delay to respect Nominatim usage policy (max 1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!location || location === 'ZERO_RESULTS') {
      console.warn('Could not geocode:', address);
      return;
    }

    // Create marker based on map type
    let marker;
    
    if (this.isLeaflet) {
      // Leaflet marker
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      marker = L.marker([location.lat, location.lng], { icon }).addTo(this.map);
      
      // Popup content
      const encodedAddress = encodeURIComponent(address);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      
      const popupContent = job ? `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${client.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📅 Επίσκεψη:</strong> ${Utils.formatDate(job.nextVisit)}</p>
          <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📊 Κατάσταση:</strong> ${job.status}</p>
          <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>📍</strong> ${address}</p>
          <button onclick="window.open('${mapsUrl}', '_blank')" 
                  style="width: 100%; padding: 6px 10px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <i class="fas fa-route"></i> Οδηγίες
          </button>
        </div>
      ` : `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${client.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📞</strong> ${client.phone || '-'}</p>
          <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>📧</strong> ${client.email || '-'}</p>
          <p style="margin: 0 0 8px 0; font-size: 12px;"><strong>📍</strong> ${address}</p>
          <button onclick="window.open('${mapsUrl}', '_blank')" 
                  style="width: 100%; padding: 6px 10px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <i class="fas fa-route"></i> Οδηγίες
          </button>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
    } else {
      // Google Maps marker
      marker = new google.maps.Marker({
        position: location,
        map: this.map,
        title: client.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      // Info window
      const encodedAddress = encodeURIComponent(address);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      
      const infoContent = job ? `
        <div style="padding: 12px; min-width: 250px;">
          <h3 style="margin: 0 0 12px 0; color: #333;">${client.name}</h3>
          <p style="margin: 0 0 6px 0;"><strong>📅 Επίσκεψη:</strong> ${Utils.formatDate(job.nextVisit)}</p>
          <p style="margin: 0 0 6px 0;"><strong>📊 Κατάσταση:</strong> ${job.status}</p>
          <p style="margin: 0 0 12px 0;"><strong>📍 Διεύθυνση:</strong><br>${address}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="openJobFromMap('${job.id}')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-eye"></i> Προβολή
            </button>
            <button onclick="window.open('${mapsUrl}', '_blank')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-route"></i> Οδηγίες
            </button>
          </div>
        </div>
      ` : `
        <div style="padding: 12px; min-width: 250px;">
          <h3 style="margin: 0 0 12px 0; color: #333;">${client.name}</h3>
          <p style="margin: 0 0 6px 0;"><strong>📞 Τηλέφωνο:</strong> ${client.phone || '-'}</p>
          <p style="margin: 0 0 6px 0;"><strong>📧 Email:</strong> ${client.email || '-'}</p>
          <p style="margin: 0 0 12px 0;"><strong>📍 Διεύθυνση:</strong><br>${address}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="openClientFromMap('${client.id}')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-eye"></i> Προβολή
            </button>
            <button onclick="window.open('${mapsUrl}', '_blank')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-route"></i> Οδηγίες
            </button>
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });
    }

    // Store marker
    this.markers[type].push(marker);
  },

  async geocodeAddress(address) {
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      // Try multiple query formats for better results
      const queries = [
        // Original full address
        `${address}`,
        // Without postal code
        address.replace(/\d{5}\s*Greece/, 'Greece'),
        // Just street and city
        address.split(',').slice(0, 2).join(',') + ', Greece'
      ];
      
      for (const query of queries) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=gr&addressdetails=1`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Painter-Organizer-App/1.0'
          }
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Nominatim request failed: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
        
        // Wait a bit before trying next query
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.warn(`❌ Nominatim: No results for any format of ${address}`);
      return 'ZERO_RESULTS';
    } catch (error) {
      console.error(`❌ Geocode error for ${address}:`, error);
      return 'ZERO_RESULTS';
    }
  },

  toggleLayer(type) {
    const visible = document.getElementById(`show${type.charAt(0).toUpperCase() + type.slice(1)}`).checked;
    
    this.markers[type].forEach(marker => {
      try {
        if (this.isLeaflet) {
          if (marker && marker.remove && marker.addTo) {
            if (visible) {
              marker.addTo(this.map);
            } else {
              marker.remove();
            }
          }
        } else {
          if (marker && marker.setVisible) {
            marker.setVisible(visible);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error toggling marker:', error);
      }
    });
  },

  clearMarkers() {
    Object.values(this.markers).forEach(markerArray => {
      markerArray.forEach(marker => {
        try {
          if (this.isLeaflet) {
            if (marker && marker.remove) {
              marker.remove();
            }
          } else {
            if (marker && marker.setMap) {
              marker.setMap(null);
            }
          }
        } catch (error) {
          console.warn('⚠️ Error removing marker:', error);
        }
      });
      markerArray.length = 0;
    });
  },

  fitBounds() {
    if (this.isLeaflet) {
      // Leaflet fit bounds
      const allMarkers = [];
      Object.values(this.markers).forEach(markerArray => {
        allMarkers.push(...markerArray);
      });
      
      if (allMarkers.length > 0) {
        const group = L.featureGroup(allMarkers);
        this.map.fitBounds(group.getBounds().pad(0.1));
        
        // Don't zoom in too much
        if (this.map.getZoom() > 15) {
          this.map.setZoom(15);
        }
      }
    } else {
      // Google Maps fit bounds
      const bounds = new google.maps.LatLngBounds();
      let hasMarkers = false;

      Object.values(this.markers).forEach(markerArray => {
        markerArray.forEach(marker => {
          if (marker.getVisible()) {
            bounds.extend(marker.getPosition());
            hasMarkers = true;
          }
        });
      });

      if (hasMarkers) {
        this.map.fitBounds(bounds);
        
        // Don't zoom in too much for single marker
        const listener = google.maps.event.addListener(this.map, 'idle', () => {
          if (this.map.getZoom() > 15) this.map.setZoom(15);
          google.maps.event.removeListener(listener);
        });
      }
    }
  }
};

// Global callback for Google Maps
window.initMap = function() {
  window.googleMapsLoaded = true;
};

// Global helper functions for map popup buttons
window.openJobFromMap = function(jobId) {
  if (window.JobsView && typeof window.JobsView.viewJob === 'function') {
    window.JobsView.viewJob(jobId);
  } else {
    console.error('❌ JobsView.viewJob is not available');
  }
};

window.openClientFromMap = function(clientId) {
  if (window.ClientsView && typeof window.ClientsView.viewClient === 'function') {
    window.ClientsView.viewClient(clientId);
  } else {
    console.error('❌ ClientsView.viewClient is not available');
  }
};
