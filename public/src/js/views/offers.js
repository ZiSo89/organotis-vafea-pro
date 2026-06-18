/* ========================================
   Offers View - Προσφορές
   ======================================== */


window.OffersView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-file-invoice"></i> Προσφορές</h1>
      </div>
      <div class="card">
        ${UIPrimitives.emptyState({
          icon: 'fas fa-hammer',
          title: 'Σε ανάπτυξη...',
          description: 'Αυτή η λειτουργία θα είναι σύντομα διαθέσιμη'
        })}
      </div>
    `;
  }
};
