/* ========================================
   Map View - Χάρτης Πελατών & Επισκέψεων
   ======================================== */

window.MapView = {
  map: null,
  isLeaflet: false,
  isInitializing: false, // Prevent multiple simultaneous initializations
  currentInfoWindow: null, // Track currently open InfoWindow
  markers: {
    clients: [],
    upcoming: [],
    today: []
  },
  geocodeCache: {},
  requestCount: 0,
  maxRequests: 100,
  // Stored handlers to avoid duplicate event listeners
  showClientsHandler: null,
  showUpcomingHandler: null,
  showTodayHandler: null,
  scrollBtnHandler: null,
  // Geocode queue to process addresses in the background (throttled)
  geocodeQueue: [],
  geocodeQueueSet: new Set(),
  geocodeQueueRunning: false,
  geocodeIntervalMs: 1100,
  isElectron: typeof window !== 'undefined' && window.electronAPI !== undefined,

  render(container) {
    const isMobile = Utils.isMobile();
    const mapHeight = isMobile ? '450px' : '600px';
    
    container.innerHTML = `
      <style>
        /* Custom Leaflet popup styles */
        .leaflet-popup-content-wrapper {
          background: white !important;
          border-radius: 8px;
          box-shadow: 0 3px 14px rgba(0,0,0,0.4);
          padding: 0 !important;
          position: relative;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          background: white;
          width: auto !important;
          min-width: 200px;
        }
        .leaflet-popup-tip {
          background: white !important;
        }
        /* Hide default close button completely on mobile */
        @media (max-width: 768px) {
          .leaflet-popup-close-button {
            display: none !important;
          }
        }
        /* Desktop close button styling */
        @media (min-width: 769px) {
          .leaflet-popup-close-button {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            color: #666 !important;
            font-size: 18px !important;
            font-weight: bold !important;
            width: 20px !important;
            height: 20px !important;
            padding: 0 !important;
            line-height: 18px !important;
            text-align: center !important;
            border: none !important;
            background: white !important;
            z-index: 10000 !important;
            cursor: pointer !important;
          }
          .leaflet-popup-close-button:hover {
            color: #333 !important;
          }
        }
        .leaflet-container {
          font-family: inherit !important;
        }
        /* Fix popup positioning on mobile */
        @media (max-width: 768px) {
          .leaflet-popup {
            margin-bottom: 20px !important;
          }
        }
      </style>
      
      <div class="view-header">
        <h1><i class="fas fa-map-marked-alt"></i> Χάρτης</h1>
      </div>

      <!-- Map Controls -->
      <div class="card" style="margin-bottom: 1rem;">
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

    // Geocode status UI (below map)
    const statusEl = document.createElement('div');
    statusEl.id = 'geocodeStatus';
    statusEl.style = 'margin-top:1rem; padding:0.75rem; font-size:0.9rem; color:var(--color-text-muted); background: #f8f9fa; border-radius: 4px; text-align: center;';
    statusEl.innerText = '';
    container.appendChild(statusEl);

    // Event listeners (remove previous handlers to prevent duplicates)
    const showClientsEl = document.getElementById('showClients');
    if (showClientsEl) {
      if (this.showClientsHandler) showClientsEl.removeEventListener('change', this.showClientsHandler);
      this.showClientsHandler = () => this.toggleLayer('clients');
      showClientsEl.addEventListener('change', this.showClientsHandler);
    }

    const showUpcomingEl = document.getElementById('showUpcoming');
    if (showUpcomingEl) {
      if (this.showUpcomingHandler) showUpcomingEl.removeEventListener('change', this.showUpcomingHandler);
      this.showUpcomingHandler = () => this.toggleLayer('upcoming');
      showUpcomingEl.addEventListener('change', this.showUpcomingHandler);
    }

    const showTodayEl = document.getElementById('showToday');
    if (showTodayEl) {
      if (this.showTodayHandler) showTodayEl.removeEventListener('change', this.showTodayHandler);
      this.showTodayHandler = () => this.toggleLayer('today');
      showTodayEl.addEventListener('change', this.showTodayHandler);
    }
    
    // Scroll to top button (mobile only)
    if (isMobile) {
      const scrollBtn = document.getElementById('scrollToTopBtn');
      if (scrollBtn) {
        if (this.scrollBtnHandler) scrollBtn.removeEventListener('click', this.scrollBtnHandler);
        this.scrollBtnHandler = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollBtn.addEventListener('click', this.scrollBtnHandler);
      }
    }

    // Note: geocodeCache is now only used for this session, not persisted
    // Coordinates are stored in the database via State.update()
    
    // Reset initialization flag when rendering
    this.isInitializing = false;
    
    // Show initial status
    this.updateGeocodeStatus();

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
          // Check map container
          const mapContainer = document.getElementById('map');
          if (!mapContainer) {
            console.error('❌ Map container not found!');
            this.isInitializing = false;
            return;
          }
          
          const containerHeight = mapContainer.offsetHeight;
          const containerWidth = mapContainer.offsetWidth;
          
          if (containerHeight === 0 || containerWidth === 0) {
            console.error('❌ Map container has zero size!');
            this.isInitializing = false;
            return;
          }
          
          // Create new Leaflet map
          this.map = L.map('map').setView([40.8473, 25.8753], 14);
          this.isLeaflet = true;

          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(this.map);
          
          // Force Leaflet to recalculate size immediately
          this.map.invalidateSize();

          // Wait for tiles to load before adding markers
          setTimeout(() => {
            this.loadMap();
            this.isInitializing = false;
          }, 300);
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

      // Close InfoWindow when clicking on the map
      this.map.addListener('click', () => {
        if (this.currentInfoWindow) {
          this.currentInfoWindow.close();
        }
      });

      this.loadMap();
      this.isInitializing = false;
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      this.isInitializing = false;
    }
  },

  async loadMap(forceRefresh = false) {
    if (!this.map) {
      return;
    }

    // Clear existing markers
    this.clearMarkers();

    // Check if State.data exists
    if (!State.data) {
      console.error('❌ State.data is null!');
      Toast.error('Δεν υπάρχουν δεδομένα');
      return;
    }

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

    // Add client markers (blue)
    if (document.getElementById('showClients') && document.getElementById('showClients').checked) {
      for (const client of clients) {
        if (client.address && client.city) {
          // Use existing coordinates (from State or DB) if available to avoid extra geocoding
          await this.addMarker(client, 'clients', '#2196F3');
        }
      }
    }

    // Add upcoming visit markers (green)
    const showUpcomingCheckbox = document.getElementById('showUpcoming');
    if (showUpcomingCheckbox && showUpcomingCheckbox.checked) {
      for (const job of upcomingJobs) {
        const client = clients.find(c => c.id === job.clientId);
        if (client && client.address && client.city) {
          await this.addMarker(client, 'upcoming', '#4CAF50', job);
        }
      }
    }

    // Add today's visit markers (red)
    const showTodayCheckbox = document.getElementById('showToday');
    if (showTodayCheckbox && showTodayCheckbox.checked) {
      for (const job of todayJobs) {
        const client = clients.find(c => c.id === job.clientId);
        if (client && client.address && client.city) {
          await this.addMarker(client, 'today', '#F44336', job);
        }
      }
    }

    // Fit bounds to show all markers
    this.fitBounds();
  },

  async addMarker(client, type, color, job = null) {
    const address = `${client.address}, ${client.city}, ${client.postal || ''} Greece`;

    // Prefer using stored coordinates on the client object (from frontend geocoding or DB)
    let location = null;
    if (client.coordinates) {
      try {
        const coords = (typeof client.coordinates === 'string') ? JSON.parse(client.coordinates) : client.coordinates;
        // Accept either {lat,lng} or {latitude,longitude}
        if (coords && (coords.lat !== undefined || coords.latitude !== undefined)) {
          location = {
            lat: parseFloat(coords.lat !== undefined ? coords.lat : coords.latitude),
            lng: parseFloat(coords.lng !== undefined ? coords.lng : coords.longitude)
          };
        }
      } catch (e) {
        // Invalid JSON - ignore and fall back to geocoding
        location = null;
      }
    }

    // If no coordinates available, check cache; otherwise enqueue for background geocoding
    if (!location) {
      // Check cache first
      location = this.geocodeCache[address];

      // If not in cache, enqueue for background geocoding and return (don't block rendering)
      if (!location || location === 'ZERO_RESULTS') {
        this.enqueueForGeocoding(client, type, color, job, address);
        return;
      }
    }

    // Don't show markers without valid coordinates
    if (!location || location === 'ZERO_RESULTS') {
      return;
    }

    // Create marker based on map type
    let marker;
    
    if (this.isLeaflet) {
      // Use default Leaflet marker
      marker = L.marker([location.lat, location.lng]).addTo(this.map);
      
      // Popup content with white background
      const encodedAddress = encodeURIComponent(address);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      
      const popupContent = job ? `
        <div style="padding: 12px; min-width: 200px; background: white; position: relative;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold; padding-right: 24px;">${client.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;"><strong>📅 Επίσκεψη:</strong> ${Utils.formatDate(job.nextVisit)}</p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;"><strong>📊 Κατάσταση:</strong> ${job.status}</p>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #888;">📍 ${address}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="openJobFromMap('${job.id}')" 
                    style="flex: 1; min-width: 90px; padding: 8px 12px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              <i class="fas fa-briefcase"></i> Προβολή
            </button>
            <button onclick="window.open('${mapsUrl}', '_blank')" 
                    style="flex: 1; min-width: 90px; padding: 8px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              <i class="fas fa-route"></i> Οδηγίες
            </button>
          </div>
        </div>
      ` : `
        <div style="padding: 12px; min-width: 200px; background: white; position: relative;">
          <h3 style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold; padding-right: 24px;">${client.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;"><strong>📞</strong> ${client.phone ? `<a href="tel:${client.phone}" style="color: #4285F4; text-decoration: none;">${client.phone}</a>` : '-'}</p>
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;"><strong>📧</strong> ${client.email ? `<a href="mailto:${client.email}" style="color: #4285F4; text-decoration: none;">${client.email}</a>` : '-'}</p>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #888;">📍 ${address}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="openClientFromMap('${client.id}')" 
                    style="flex: 1; min-width: 90px; padding: 8px 12px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              <i class="fas fa-eye"></i> Προβολή
            </button>
            <button onclick="window.open('${mapsUrl}', '_blank')" 
                    style="flex: 1; min-width: 90px; padding: 8px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              <i class="fas fa-route"></i> Οδηγίες
            </button>
          </div>
        </div>
      `;
      
      // Bind popup with auto-pan to ensure it's visible
      const isMobile = Utils.isMobile();
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        minWidth: 200,
        closeButton: !isMobile, // Close button only on desktop
        autoClose: true, // Close when clicking another marker
        closeOnClick: true, // Close when clicking on the map
        autoPan: true,
        autoPanPaddingTopLeft: [20, 100],
        autoPanPaddingBottomRight: [20, 150],
        keepInView: true,
        className: 'custom-popup'
      });
      
      // Force pan on popup open to ensure it's fully visible
      marker.on('popupopen', (e) => {
        if (isMobile) {
          setTimeout(() => {
            const px = this.map.project(e.popup._latlng);
            px.y -= 180; // Offset upwards
            px.x += 40; // Offset right to show the right edge
            this.map.panTo(this.map.unproject(px), {animate: true, duration: 0.3});
          }, 100);
        }
      });
      
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
        <div style="padding: 12px; min-width: 250px; position: relative;">
          <button class="custom-close-btn" type="button"
                  style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.05); border: none; color: #999; font-size: 16px; cursor: pointer; line-height: 24px; padding: 0; z-index: 1000;">
            ×
          </button>
          <h3 style="margin: 0 0 12px 0; color: #333; padding-right: 30px;">${client.name}</h3>
          <p style="margin: 0 0 6px 0;"><strong>📅 Επίσκεψη:</strong> ${Utils.formatDate(job.nextVisit)}</p>
          <p style="margin: 0 0 6px 0;"><strong>📊 Κατάσταση:</strong> ${job.status}</p>
          <p style="margin: 0 0 12px 0;"><strong>📍 Διεύθυνση:</strong><br>${address}</p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="openJobFromMap('${job.id}')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-briefcase"></i> Προβολή
            </button>
            <button onclick="window.open('${mapsUrl}', '_blank')" 
                    style="flex: 1; min-width: 100px; padding: 8px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-route"></i> Οδηγίες
            </button>
          </div>
        </div>
      ` : `
        <div style="padding: 12px; min-width: 250px; position: relative;">
          <button class="custom-close-btn" type="button"
                  style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.05); border: none; color: #999; font-size: 16px; cursor: pointer; line-height: 24px; padding: 0; z-index: 1000;">
            ×
          </button>
          <h3 style="margin: 0 0 12px 0; color: #333; padding-right: 30px;">${client.name}</h3>
          <p style="margin: 0 0 6px 0;"><strong>📞 Τηλέφωνο:</strong> ${client.phone ? `<a href="tel:${client.phone}" style="color: #4285F4; text-decoration: none;">${client.phone}</a>` : '-'}</p>
          <p style="margin: 0 0 6px 0;"><strong>📧 Email:</strong> ${client.email ? `<a href="mailto:${client.email}" style="color: #4285F4; text-decoration: none;">${client.email}</a>` : '-'}</p>
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
        // Close any open InfoWindows first
        if (this.currentInfoWindow) {
          this.currentInfoWindow.close();
        }
        
        infoWindow.open(this.map, marker);
        this.currentInfoWindow = infoWindow;
        
        // Add close button functionality after InfoWindow opens
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          const closeBtn = document.querySelector('.custom-close-btn');
          if (closeBtn) {
            closeBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              infoWindow.close();
            };
          }
        });
      });
    }

    // Store marker
    this.markers[type].push(marker);
  },

  // Convert Greek to Greeklish for better geocoding results
  greeklishify(text) {
    if (!text) return '';
    
    const greekToLatin = {
      'α': 'a', 'ά': 'a', 'Α': 'A', 'Ά': 'A',
      'β': 'v', 'Β': 'V',
      'γ': 'g', 'Γ': 'G',
      'δ': 'd', 'Δ': 'D',
      'ε': 'e', 'έ': 'e', 'Ε': 'E', 'Έ': 'E',
      'ζ': 'z', 'Ζ': 'Z',
      'η': 'i', 'ή': 'i', 'Η': 'I', 'Ή': 'I',
      'θ': 'th', 'Θ': 'Th',
      'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i', 'Ι': 'I', 'Ί': 'I', 'Ϊ': 'I',
      'κ': 'k', 'Κ': 'K',
      'λ': 'l', 'Λ': 'L',
      'μ': 'm', 'Μ': 'M',
      'ν': 'n', 'Ν': 'N',
      'ξ': 'x', 'Ξ': 'X',
      'ο': 'o', 'ό': 'o', 'Ο': 'O', 'Ό': 'O',
      'π': 'p', 'Π': 'P',
      'ρ': 'r', 'Ρ': 'R',
      'σ': 's', 'ς': 's', 'Σ': 'S',
      'τ': 't', 'Τ': 'T',
      'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y', 'Υ': 'Y', 'Ύ': 'Y', 'Ϋ': 'Y',
      'φ': 'f', 'Φ': 'F',
      'χ': 'ch', 'Χ': 'Ch',
      'ψ': 'ps', 'Ψ': 'Ps',
      'ω': 'o', 'ώ': 'o', 'Ω': 'O', 'Ώ': 'O'
    };
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      // Handle double consonants (μπ, ντ, γκ, τσ, τζ)
      if (char === 'μ' && nextChar === 'π') {
        result += 'b';
        i++;
      } else if (char === 'Μ' && nextChar === 'π') {
        result += 'B';
        i++;
      } else if (char === 'ν' && nextChar === 'τ') {
        result += 'd';
        i++;
      } else if (char === 'Ν' && nextChar === 'τ') {
        result += 'D';
        i++;
      } else if (char === 'γ' && nextChar === 'κ') {
        result += 'g';
        i++;
      } else if (char === 'Γ' && nextChar === 'κ') {
        result += 'G';
        i++;
      } else if (char === 'τ' && nextChar === 'σ') {
        result += 'ts';
        i++;
      } else if (char === 'Τ' && nextChar === 'σ') {
        result += 'Ts';
        i++;
      } else if (char === 'τ' && nextChar === 'ζ') {
        result += 'tz';
        i++;
      } else if (char === 'Τ' && nextChar === 'ζ') {
        result += 'Tz';
        i++;
      } else if (char === 'ο' && nextChar === 'υ') {
        result += 'ou';
        i++;
      } else if (char === 'Ο' && nextChar === 'υ') {
        result += 'Ou';
        i++;
      } else if (char === 'ε' && nextChar === 'υ') {
        result += 'ef';
        i++;
      } else if (char === 'Ε' && nextChar === 'υ') {
        result += 'Ef';
        i++;
      } else if (char === 'α' && nextChar === 'υ') {
        result += 'af';
        i++;
      } else if (char === 'Α' && nextChar === 'υ') {
        result += 'Af';
        i++;
      } else {
        result += greekToLatin[char] || char;
      }
    }
    
    return result;
  },
  
  // Test the greeklishify function
  testGreeklish() {
    const testCases = [
      'Αλεξανδρούπολη',
      'Λεωφόρος Δημοκρατίας',
      'Μπότσαρη',
      'Κύπρου',
      'Γκούνη',
      'Ευριπίδου',
      'Μαυροκορδάτου',
      'Ντάφνη',
      'Τσακάλωφ',
      'Αγίου Νικολάου'
    ];
    
    console.log('🧪 Testing Greeklish conversion:');
    testCases.forEach(test => {
      console.log(`  "${test}" → "${this.greeklishify(test)}"`);
    });
  },

  async geocodeAddress(address) {
    try {
      const greeklishAddr = this.greeklishify(address);
      
      // Try multiple search patterns for better results
      const searchPatterns = [
        address, // Original address (Greek)
        greeklishAddr, // Full Greeklish version
        address.replace(/\s+/g, ' ').trim(), // Normalized spaces (Greek)
        greeklishAddr.replace(/\s+/g, ' ').trim(), // Normalized spaces (Greeklish)
        // Try without street number if first attempts fail
        address.replace(/\d+/g, '').replace(/\s+/g, ' ').trim(),
        greeklishAddr.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
      ];
      
      // Remove duplicates
      const uniquePatterns = [...new Set(searchPatterns)];
      
      for (let i = 0; i < uniquePatterns.length; i++) {
        const searchAddress = uniquePatterns[i];
        if (!searchAddress || searchAddress.length < 5) continue; // Skip invalid patterns
        
        // Use backend PHP proxy to avoid CORS issues
        const url = `/api/geocode.php?address=${encodeURIComponent(searchAddress)}`;
        
        if (i === 0) {
          console.log(`📡 Geocoding via backend: ${address}`);
        } else {
          console.log(`🔄 Attempt ${i + 1}/${uniquePatterns.length}: ${searchAddress}`);
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`⚠️ Geocode request failed: ${response.status}`);
          continue; // Try next pattern
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const location = result.data[0];
          console.log(`✅ Found: ${location.display_name}`);
          return {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon)
          };
        }
      }
      
      console.warn(`❌ No results after ${uniquePatterns.length} attempts: ${address}`);
      return 'ZERO_RESULTS';
    } catch (error) {
      console.error(`❌ Geocode error for ${address}:`, error);
      return 'ZERO_RESULTS';
    }
  },

  // Enqueue client address for background geocoding (throttled)
  enqueueForGeocoding(client, type, color, job, address) {
    if (!address) return;
    if (this.geocodeQueueSet.has(address)) return; // already enqueued
    this.geocodeQueueSet.add(address);
    this.geocodeQueue.push({ clientId: client.id, address, type, color, job });
    // Start processing if not already running
    if (!this.geocodeQueueRunning) {
      this.processGeocodeQueue();
    }
  },

  async processGeocodeQueue() {
    if (this.geocodeQueueRunning) return;
    this.geocodeQueueRunning = true;

    while (this.geocodeQueue.length > 0) {
      const item = this.geocodeQueue.shift();
        try {
        const location = await this.geocodeAddress(item.address);
        
        // Save to session cache (for this page load only)
        this.geocodeCache[item.address] = location;

        if (location && location !== 'ZERO_RESULTS') {
          // Persist coordinates to database via State.update()
          try {
            console.log(`💾 Saving coordinates to database for client ${item.clientId}:`, location);
            const result = await State.update('clients', item.clientId, { coordinates: { lat: location.lat, lng: location.lng } });
            console.log(`✅ Coordinates saved to database:`, result);
            
            // If update succeeded, read updated client and add marker
            const updatedClient = State.read('clients', item.clientId);
            if (updatedClient) {
              // Add marker now that coordinates exist
              await this.addMarker(updatedClient, item.type, item.color, item.job);
            }
          } catch (err) {
            console.error('❌ Failed to persist geocoded coordinates for', item.clientId, err);
          }
        }
      } catch (err) {
        console.error('Error processing geocode queue item', item, err);
      }

      // Update UI status
      this.updateGeocodeStatus();

      // Respect Nominatim rate limits
      await new Promise(resolve => setTimeout(resolve, this.geocodeIntervalMs));
    }

    // Finished
    this.geocodeQueueRunning = false;
    this.geocodeQueueSet.clear();
    this.updateGeocodeStatus();
  },

  updateGeocodeStatus() {
    const el = document.getElementById('geocodeStatus');
    if (!el) return;
    
    if (this.isElectron) {
      el.innerText = '📍 Offline mode: Χρήση αποθηκευμένων συντεταγμένων';
      return;
    }
    
    const queued = this.geocodeQueue.length;
    const running = this.geocodeQueueRunning ? 'running' : 'idle';
    el.innerText = `Geocode queue: ${queued} pending — status: ${running}`;
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
        const bounds = group.getBounds();
        
        this.map.fitBounds(bounds.pad(0.1));
        
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

window.openJobFromMap = function(jobId) {
  if (window.JobsView && typeof window.JobsView.viewJob === 'function') {
    window.JobsView.viewJob(jobId);
  } else {
    console.error('❌ JobsView.viewJob is not available');
  }
};
