/* ========================================
   Performance Optimizer - Mobile Performance
   Βελτιώσεις για καλύτερη απόδοση σε mobile
   ======================================== */

window.PerformanceOptimizer = {
  // Debounce timers
  debounceTimers: {},

  // Throttle last execution times
  throttleLastExecution: {},

  // Track memory usage
  memoryStats: {
    lastCleanup: Date.now(),
    cleanupInterval: 300000, // 5 minutes
  },

  /**
   * Initialize performance optimizations
   */
  init() {
    console.log('[Performance] Initializing optimizations...');

    // Setup passive event listeners for better scroll performance
    this.setupPassiveListeners();

    // Setup periodic memory cleanup
    this.setupMemoryCleanup();

    // Setup intersection observer for lazy loading
    this.setupLazyLoading();

    // Detect and optimize for low-end devices
    if (this.isLowEndDevice()) {
      this.applyLowEndOptimizations();
    }

    console.log('[Performance] Optimizations initialized');
  },

  /**
   * Debounce function - delays execution until after wait time has passed
   */
  debounce(func, wait, key) {
    return (...args) => {
      if (this.debounceTimers[key]) {
        clearTimeout(this.debounceTimers[key]);
      }

      this.debounceTimers[key] = setTimeout(() => {
        func.apply(this, args);
        delete this.debounceTimers[key];
      }, wait);
    };
  },

  /**
   * Throttle function - limits execution to once per wait time
   */
  throttle(func, wait, key) {
    return (...args) => {
      const now = Date.now();
      const lastExecution = this.throttleLastExecution[key] || 0;

      if (now - lastExecution >= wait) {
        this.throttleLastExecution[key] = now;
        func.apply(this, args);
      }
    };
  },

  /**
   * Setup passive event listeners for scroll/touch
   */
  setupPassiveListeners() {
    // Override addEventListener for scroll and touch events
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'touchend', 'wheel'];
      
      if (passiveEvents.includes(type) && typeof options !== 'object') {
        options = { passive: true };
      } else if (passiveEvents.includes(type) && typeof options === 'object' && options.passive === undefined) {
        options.passive = true;
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
  },

  /**
   * Setup periodic memory cleanup
   */
  setupMemoryCleanup() {
    setInterval(() => {
      this.cleanupMemory();
    }, this.memoryStats.cleanupInterval);
  },

  /**
   * Clean up memory - remove old data, clear caches
   */
  cleanupMemory() {
    console.log('[Performance] Running memory cleanup...');

    // Clear debounce timers
    Object.keys(this.debounceTimers).forEach(key => {
      if (this.debounceTimers[key]) {
        clearTimeout(this.debounceTimers[key]);
        delete this.debounceTimers[key];
      }
    });

    // Clear old cached data (if any caching mechanism exists)
    if (window.State && typeof window.State.clearCache === 'function') {
      window.State.clearCache();
    }

    // Force garbage collection hint (browser may ignore)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }

    this.memoryStats.lastCleanup = Date.now();
    console.log('[Performance] Memory cleanup complete');
  },

  /**
   * Setup intersection observer for lazy loading images/content
   */
  setupLazyLoading() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[Performance] IntersectionObserver not supported');
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before entering viewport
    });

    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Store observer for future use
    this.imageObserver = imageObserver;
  },

  /**
   * Detect if device is low-end (based on cores, memory, etc.)
   */
  isLowEndDevice() {
    // Check number of CPU cores
    const cores = navigator.hardwareConcurrency || 2;
    
    // Check device memory (if available)
    const memory = navigator.deviceMemory || 4; // GB
    
    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Consider low-end if:
    // - Less than 4 cores
    // - Less than 2GB RAM
    // - Mobile with less than 4 cores
    return cores < 4 || memory < 2 || (isMobile && cores < 4);
  },

  /**
   * Apply optimizations for low-end devices
   */
  applyLowEndOptimizations() {
    console.log('[Performance] Applying low-end device optimizations');

    // Reduce animation duration
    document.documentElement.style.setProperty('--transition-speed', '0.1s');

    // Disable complex animations
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
      .fade-in, .slide-in, .scale-in {
        animation: none !important;
      }
    `;
    document.head.appendChild(style);

    // Reduce batch size for large operations
    if (window.CONFIG) {
      window.CONFIG.BATCH_SIZE = 10; // Smaller batches
    }
  },

  /**
   * Optimize table rendering for large datasets
   */
  optimizeTableRendering(data, renderFunction, batchSize = 50) {
    if (data.length <= batchSize) {
      return renderFunction(data);
    }

    // Render in batches using requestAnimationFrame
    let currentBatch = 0;
    const batches = Math.ceil(data.length / batchSize);
    let html = '';

    const renderBatch = () => {
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);
      
      html += renderFunction(batch);
      currentBatch++;

      if (currentBatch < batches) {
        requestAnimationFrame(renderBatch);
      } else {
        return html;
      }
    };

    renderBatch();
    return html;
  },

  /**
   * Virtual scrolling helper for large lists
   */
  createVirtualScroller(container, items, rowHeight, renderItem) {
    const visibleCount = Math.ceil(container.clientHeight / rowHeight) + 2; // Buffer rows
    let scrollTop = 0;
    let startIndex = 0;

    const render = () => {
      const endIndex = Math.min(startIndex + visibleCount, items.length);
      const visibleItems = items.slice(startIndex, endIndex);
      
      container.innerHTML = visibleItems.map((item, index) => 
        renderItem(item, startIndex + index)
      ).join('');
      
      container.style.paddingTop = `${startIndex * rowHeight}px`;
      container.style.paddingBottom = `${(items.length - endIndex) * rowHeight}px`;
    };

    const onScroll = this.throttle(() => {
      scrollTop = container.scrollTop;
      const newStartIndex = Math.floor(scrollTop / rowHeight);
      
      if (newStartIndex !== startIndex) {
        startIndex = newStartIndex;
        requestAnimationFrame(render);
      }
    }, 16, 'virtualScroller'); // ~60fps

    container.addEventListener('scroll', onScroll);
    render();

    return {
      update: (newItems) => {
        items = newItems;
        render();
      },
      destroy: () => {
        container.removeEventListener('scroll', onScroll);
      }
    };
  },

  /**
   * Monitor performance metrics
   */
  getPerformanceMetrics() {
    if (!window.performance) {
      return null;
    }

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: paint?.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint?.find(p => p.name === 'first-contentful-paint')?.startTime,
      memory: performance.memory ? {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      } : null
    };
  },

  /**
   * Log performance metrics
   */
  logPerformanceMetrics() {
    const metrics = this.getPerformanceMetrics();
    if (metrics) {
      console.log('[Performance] Metrics:', metrics);
    }
  }
};

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    PerformanceOptimizer.init();
  });
} else {
  PerformanceOptimizer.init();
}
