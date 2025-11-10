/* ========================================
   Statistics View - Στατιστικά & Αναφορές
   ======================================== */


window.StatisticsView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-chart-bar"></i> Στατιστικά</h1>
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
