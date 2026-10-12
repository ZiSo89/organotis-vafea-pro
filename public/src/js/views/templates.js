/* ========================================
   Templates View - Πρότυπα Εργασιών
   ======================================== */


window.TemplatesView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-copy"></i> Templates</h1>
      </div>
      <div class="card">
        ${UIPrimitives.emptyState({
          icon: 'fas fa-hammer',
          title: 'Σε ανάπτυξη...',
          description: 'Αυτή η λειτουργία θα είναι σύντομα διαθέσιμη',
          cta: '<button type="button" class="btn btn-primary" onclick="window.location.hash = "#dashboard"">Επιστροφή στο Dashboard</button>'
        })}
      </div>
    `;
  }
};
