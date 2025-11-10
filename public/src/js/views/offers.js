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
        <div class="empty-state">
          <i class="fas fa-hammer fa-3x" style="color: var(--color-warning);"></i>
          <h2>Σε ανάπτυξη...</h2>
          <p class="text-muted">Αυτή η λειτουργία θα είναι σύντομα διαθέσιμη</p>
        </div>
      </div>
    `;
  }
};
