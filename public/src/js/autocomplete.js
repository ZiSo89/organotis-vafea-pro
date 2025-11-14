/* ========================================
   Autocomplete System
   ======================================== */

const Autocomplete = {
  // Setup autocomplete για input field
  setup(inputElement, dataSource, options = {}) {
    const {
      minChars = 1,
      maxResults = 10,
      onSelect = () => {},
      displayKey = 'name',
      valueKey = 'id'
    } = options;

    let currentFocus = -1;
    const listId = `autocomplete-list-${Date.now()}`;

    // Create datalist element
    const datalist = document.createElement('datalist');
    datalist.id = listId;
    inputElement.setAttribute('list', listId);
    inputElement.parentNode.appendChild(datalist);

    // Update suggestions
    function updateSuggestions() {
      const value = inputElement.value.toLowerCase();
      datalist.innerHTML = '';

      if (value.length < minChars) return;

      const filtered = dataSource
        .filter(item => {
          const text = typeof item === 'string' ? item : item[displayKey];
          return text.toLowerCase().includes(value);
        })
        .slice(0, maxResults);

      filtered.forEach(item => {
        const option = document.createElement('option');
        option.value = typeof item === 'string' ? item : item[displayKey];
        if (typeof item !== 'string') {
          option.dataset.id = item[valueKey];
        }
        datalist.appendChild(option);
      });
    }

    // Event listeners
    inputElement.addEventListener('input', updateSuggestions);
    inputElement.addEventListener('change', () => {
      const selected = dataSource.find(item => {
        const text = typeof item === 'string' ? item : item[displayKey];
        return text === inputElement.value;
      });
      if (selected) onSelect(selected);
    });

    return {
      update(newDataSource) {
        dataSource = newDataSource;
        updateSuggestions();
      },
      destroy() {
        datalist.remove();
      }
    };
  }
};
