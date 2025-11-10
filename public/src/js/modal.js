/* ========================================
   Modal System
   ======================================== */

const Modal = {
  container: null,
  currentModal: null,

  init() {
    this.container = document.getElementById('modalContainer');
    
    // Close on backdrop click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });
  },

  open(options = {}) {
    if (!this.container) this.init();

    const {
      title = 'Modal',
      content = '',
      size = '', // 'sm', 'lg', 'xl', 'full'
      footer = '',
      onClose = null
    } = options;

    const modal = document.createElement('div');
    modal.className = `modal ${size ? 'modal-' + size : ''}`;
    
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="Close">
          ✕
        </button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    // Close button
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => {
      this.close();
      if (onClose) onClose();
    };

    this.container.innerHTML = '';
    this.container.appendChild(modal);
    this.container.classList.add('active');
    this.currentModal = modal;

    // Focus management
    setTimeout(() => {
      const firstInput = modal.querySelector('input, select, textarea, button');
      if (firstInput) firstInput.focus();
    }, 100);

    return modal;
  },

  close() {
    if (this.container) {
      this.container.classList.remove('active');
      setTimeout(() => {
        this.container.innerHTML = '';
        this.currentModal = null;
      }, 300);
    }
  },

  // Confirm Dialog
  confirm(options = {}) {
    const {
      title = 'Επιβεβαίωση',
      message = 'Είστε σίγουροι;',
      confirmText = 'Επιβεβαίωση',
      cancelText = 'Ακύρωση',
      onConfirm = null,
      onCancel = null
    } = options;

    return new Promise((resolve) => {
      const footer = `
        <button class="btn-ghost" data-action="cancel">${cancelText}</button>
        <button class="btn-primary" data-action="confirm">${confirmText}</button>
      `;

      const modal = this.open({
        title,
        content: `<p>${message}</p>`,
        footer,
        size: 'sm'
      });

      modal.querySelector('[data-action="confirm"]').onclick = () => {
        this.close();
        if (onConfirm) onConfirm();
        resolve(true);
      };

      modal.querySelector('[data-action="cancel"]').onclick = () => {
        this.close();
        if (onCancel) onCancel();
        resolve(false);
      };
    });
  },

  // Alert Dialog
  alert(message, title = 'Ειδοποίηση') {
    const footer = `<button class="btn-primary" data-action="ok">OK</button>`;

    const modal = this.open({
      title,
      content: `<p>${message}</p>`,
      footer,
      size: 'sm'
    });

    modal.querySelector('[data-action="ok"]').onclick = () => {
      this.close();
    };
  },

  // Form Modal - για γρήγορη προσθήκη
  form(options = {}) {
    const {
      title = 'Φόρμα',
      fields = [],
      onSubmit = null
    } = options;

    const formFields = fields.map(field => {
      const {
        name,
        label,
        type = 'text',
        value = '',
        options = [],
        required = false
      } = field;

      let input = '';
      if (type === 'select') {
        const opts = options.map(opt => 
          `<option value="${opt}">${opt}</option>`
        ).join('');
        input = `<select id="${name}" name="${name}" ${required ? 'required' : ''}>${opts}</select>`;
      } else if (type === 'textarea') {
        input = `<textarea id="${name}" name="${name}" ${required ? 'required' : ''}>${value}</textarea>`;
      } else {
        input = `<input type="${type}" id="${name}" name="${name}" value="${value}" ${required ? 'required' : ''} />`;
      }

      return `
        <div class="form-group">
          <label for="${name}">${label}${required ? ' *' : ''}</label>
          ${input}
        </div>
      `;
    }).join('');

    const footer = `
      <button class="btn-ghost" data-action="cancel">Ακύρωση</button>
      <button class="btn-primary" data-action="submit">Αποθήκευση</button>
    `;

    const modal = this.open({
      title,
      content: `<form id="modalForm">${formFields}</form>`,
      footer
    });

    const form = modal.querySelector('#modalForm');
    const submitBtn = modal.querySelector('[data-action="submit"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');

    submitBtn.onclick = (e) => {
      e.preventDefault();
      
      // Collect form data
      const formData = {};
      fields.forEach(field => {
        const element = form.querySelector(`[name="${field.name}"]`);
        formData[field.name] = element.value;
      });

      // Validation
      if (form.checkValidity()) {
        if (onSubmit) onSubmit(formData);
        this.close();
      } else {
        Toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      }
    };

    cancelBtn.onclick = () => {
      this.close();
    };
  }
};
