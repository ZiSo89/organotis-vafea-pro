(function (global) {
  function shouldSkipResumeRefresh(documentRef = global.document, modalApi = global.Modal) {
    if (modalApi?.currentModal) return true;

    const jobForm = documentRef?.getElementById?.('jobForm');
    if (jobForm && jobForm.style?.display === 'block') return true;

    const activeElement = documentRef?.activeElement;
    if (!activeElement) return false;

    if (activeElement.closest?.('#jobFormElement')) return true;
    if (activeElement.closest?.('.modal')) return true;
    if (activeElement.closest?.('.job-form-shell')) return true;

    const tagName = activeElement.tagName && activeElement.tagName.toUpperCase();
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  const api = {
    shouldSkipResumeRefresh,
  };

  global.ResumeRefreshGuard = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
