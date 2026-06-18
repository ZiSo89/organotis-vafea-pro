/* ========================================
   Invoices View - Τιμολόγια
   ======================================== */


window.InvoicesView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-receipt"></i> Τιμολόγια</h1>
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
