/* ========================================
   Maps Loader - On-demand Google Maps loading
   ======================================== */

// Dummy callback to prevent errors
window.initMap = function() {};

// Load Google Maps on demand (only when needed)
let googleMapsPromise = null;

window.loadGoogleMaps = function() {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCFxHYMfECQqM3hzLKwxEQ0PYqQJt_RRXE&libraries=places&callback=initMap';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};
