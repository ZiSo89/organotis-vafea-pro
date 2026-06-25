(function (global) {
  const CORE_DATA_KEYS = ['clients', 'jobs', 'suppliers', 'inventory'];

  function hasCoreData(data) {
    const source = data || {};
    return CORE_DATA_KEYS.some((key) => Array.isArray(source[key]) && source[key].length > 0);
  }

  function shouldKeepLoadingOverlay({ data, isPwaInstalled = false, sessionStorageValue = null }) {
    if (!isPwaInstalled) return false;
    if (sessionStorageValue) return false;
    return !hasCoreData(data);
  }

  const api = {
    hasCoreData,
    shouldKeepLoadingOverlay,
  };

  global.PwaBootstrap = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
