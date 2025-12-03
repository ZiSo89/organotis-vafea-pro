/* ========================================
   Pagination System
   ======================================== */

const Pagination = {
  currentPage: 1,
  itemsPerPage: 20,

  // Paginate data array
  paginate(data, page = 1, perPage = this.itemsPerPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
  },

  // Generate pagination HTML
  render(totalItems, currentPage = 1, perPage = this.itemsPerPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / perPage);

    if (totalPages <= 1) return '';

    let html = '<div class="pagination">';

    // Previous button
    html += `<button class="btn-page" 
                     ${currentPage === 1 ? 'disabled' : ''} 
                     onclick="(${onPageChange})(${currentPage - 1})">
              <i class="fas fa-chevron-left"></i>
            </button>`;

    // Page numbers
    const range = this.getPageRange(currentPage, totalPages);
    
    range.forEach(page => {
      if (page === '...') {
        html += '<span class="page-ellipsis">...</span>';
      } else {
        html += `<button class="btn-page ${page === currentPage ? 'active' : ''}" 
                         onclick="(${onPageChange})(${page})">
                  ${page}
                </button>`;
      }
    });

    // Next button
    html += `<button class="btn-page" 
                     ${currentPage === totalPages ? 'disabled' : ''} 
                     onclick="(${onPageChange})(${currentPage + 1})">
              <i class="fas fa-chevron-right"></i>
            </button>`;

    html += '</div>';

    return html;
  },

  // Get page number range to display
  getPageRange(current, total) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, current - delta);
      i <= Math.min(total - 1, current + delta);
      i++
    ) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push('...', total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots;
  },

  // Calculate info text
  getInfoText(totalItems, currentPage, perPage) {
    const start = (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, totalItems);
    return `Εμφάνιση ${start}-${end} από ${totalItems}`;
  }
};
