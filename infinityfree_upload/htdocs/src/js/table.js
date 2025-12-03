/* ========================================
   Table Utilities
   ======================================== */

const Table = {
  // Sort table data
  sort(data, key, direction = 'asc') {
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Handle dates
      if (key.includes('date') || key.includes('Date')) {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();

      if (direction === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  },

  // Setup sortable table headers
  setupSorting(tableElement, onSort) {
    const headers = tableElement.querySelectorAll('th[data-sort]');
    
    headers.forEach(header => {
      header.style.cursor = 'pointer';
      header.innerHTML += ' <i class="fas fa-sort"></i>';

      header.addEventListener('click', () => {
        const key = header.dataset.sort;
        const currentDirection = header.dataset.direction || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';

        // Update all headers
        headers.forEach(h => {
          h.dataset.direction = '';
          const icon = h.querySelector('i');
          if (icon) icon.className = 'fas fa-sort';
        });

        // Update clicked header
        header.dataset.direction = newDirection;
        const icon = header.querySelector('i');
        if (icon) {
          icon.className = newDirection === 'asc' 
            ? 'fas fa-sort-up' 
            : 'fas fa-sort-down';
        }

        onSort(key, newDirection);
      });
    });
  },

  // Generate table HTML from data
  generate(data, columns, options = {}) {
    const {
      sortable = false,
      actions = [],
      emptyMessage = 'Δεν βρέθηκαν εγγραφές'
    } = options;

    if (data.length === 0) {
      return `<div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>${emptyMessage}</p>
      </div>`;
    }

    let html = '<table class="data-table"><thead><tr>';

    // Headers
    columns.forEach(col => {
      const sortAttr = sortable && col.sortable !== false 
        ? `data-sort="${col.key}"` 
        : '';
      html += `<th ${sortAttr}>${col.label}</th>`;
    });

    if (actions.length > 0) {
      html += '<th>Ενέργειες</th>';
    }

    html += '</tr></thead><tbody>';

    // Rows
    data.forEach(item => {
      html += '<tr>';

      columns.forEach(col => {
        const value = col.render 
          ? col.render(item[col.key], item) 
          : item[col.key];
        html += `<td>${value || '-'}</td>`;
      });

      if (actions.length > 0) {
        html += '<td class="actions">';
        actions.forEach(action => {
          html += `<button class="btn-icon ${action.class || ''}" 
                          onclick="${action.onClick}('${item.id}')" 
                          title="${action.label}">
                    <i class="${action.icon}"></i>
                  </button>`;
        });
        html += '</td>';
      }

      html += '</tr>';
    });

    html += '</tbody></table>';

    return html;
  }
};
