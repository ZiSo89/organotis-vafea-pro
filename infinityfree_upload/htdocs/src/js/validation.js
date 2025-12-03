/* ========================================
   Validation - Έλεγχος Δεδομένων
   ======================================== */

const Validation = {
  // Email Validation
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Phone Validation (Ελληνικά νούμερα)
  isValidPhone(phone) {
    // Αποδεχόμενα formats: 6900000000, 210-1234567, +30 6900000000
    const regex = /^(\+30)?[\s-]?[26][0-9]{9}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
  },

  // Postal Code Validation (Ελλάδα - 5 ψηφία)
  isValidPostalCode(postal) {
    const regex = /^\d{5}$/;
    return regex.test(postal);
  },

  // Number Validation
  isValidNumber(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  },

  // Required Field
  isRequired(value) {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  },

  // ID Format Validation
  isValidId(id, prefix) {
    const regex = new RegExp(`^${prefix}-\\d{4,}$`);
    return regex.test(id);
  },

  // Date Validation
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  // Future Date Check
  isFutureDate(dateString) {
    const date = new Date(dateString);
    return date > new Date();
  },

  // Validate Client
  validateClient(client) {
    const errors = [];

    if (!this.isRequired(client.name)) {
      errors.push('Το όνομα είναι υποχρεωτικό');
    }

    if (client.email && !this.isValidEmail(client.email)) {
      errors.push('Μη έγκυρο email');
    }

    if (client.phone && !this.isValidPhone(client.phone)) {
      errors.push('Μη έγκυρο τηλέφωνο (πρέπει να είναι 10 ψηφία)');
    }

    if (client.postal && !this.isValidPostalCode(client.postal)) {
      errors.push('Μη έγκυρος ταχυδρομικός κώδικας (5 ψηφία)');
    }

    if (client.id && Utils.idExists('clients', client.id)) {
      // Έλεγχος για duplicate μόνο αν είναι νέα εγγραφή
      const existing = State.data.clients.find(c => c.id === client.id);
      if (!existing || existing.name !== client.name) {
        errors.push('Το ID υπάρχει ήδη');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate Paint
  validatePaint(paint) {
    const errors = [];

    if (!this.isRequired(paint.name) && !this.isRequired(paint.code)) {
      errors.push('Απαιτείται τουλάχιστον όνομα ή κωδικός χρώματος');
    }

    if (paint.size && !this.isValidNumber(paint.size, 0)) {
      errors.push('Μη έγκυρο μέγεθος κάδου');
    }

    if (paint.qty && !this.isValidNumber(paint.qty, 0)) {
      errors.push('Μη έγκυρη ποσότητα');
    }

    if (paint.cost && !this.isValidNumber(paint.cost, 0)) {
      errors.push('Μη έγκυρο κόστος');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate Job
  validateJob(job) {
    const errors = [];

    if (!this.isRequired(job.clientId)) {
      errors.push('Επιλέξτε πελάτη');
    }

    if (job.date && !this.isValidDate(job.date)) {
      errors.push('Μη έγκυρη ημερομηνία');
    }

    if (job.area && !this.isValidNumber(job.area, 0)) {
      errors.push('Μη έγκυρη επιφάνεια');
    }

    if (job.materialsCost && !this.isValidNumber(job.materialsCost, 0)) {
      errors.push('Μη έγκυρο κόστος υλικών');
    }

    if (job.hours && !this.isValidNumber(job.hours, 0)) {
      errors.push('Μη έγκυρες ώρες εργασίας');
    }

    if (job.hourlyRate && !this.isValidNumber(job.hourlyRate, 0)) {
      errors.push('Μη έγκυρο ωρομίσθιο');
    }

    if (job.vat && !this.isValidNumber(job.vat, 0, 100)) {
      errors.push('Το ΦΠΑ πρέπει να είναι 0-100%');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate Offer
  validateOffer(offer) {
    const errors = [];

    if (!this.isRequired(offer.id)) {
      errors.push('Το ID προσφοράς είναι υποχρεωτικό');
    }

    if (!this.isRequired(offer.job)) {
      errors.push('Επιλέξτε εργασία');
    }

    if (!this.isValidNumber(offer.net, 0)) {
      errors.push('Μη έγκυρη καθαρή αξία');
    }

    if (offer.vat && !this.isValidNumber(offer.vat, 0, 100)) {
      errors.push('Το ΦΠΑ πρέπει να είναι 0-100%');
    }

    if (offer.id && Utils.idExists('offers', offer.id)) {
      const existing = State.data.offers.find(o => o.id === offer.id);
      if (!existing || existing.job !== offer.job) {
        errors.push('Το ID προσφοράς υπάρχει ήδη');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validate Invoice
  validateInvoice(invoice) {
    const errors = [];

    if (!this.isRequired(invoice.id)) {
      errors.push('Το ID τιμολογίου είναι υποχρεωτικό');
    }

    if (!this.isRequired(invoice.offer)) {
      errors.push('Επιλέξτε προσφορά');
    }

    if (!this.isValidNumber(invoice.net, 0)) {
      errors.push('Μη έγκυρη καθαρή αξία');
    }

    if (invoice.vat && !this.isValidNumber(invoice.vat, 0, 100)) {
      errors.push('Το ΦΠΑ πρέπει να είναι 0-100%');
    }

    if (invoice.id && Utils.idExists('invoices', invoice.id)) {
      const existing = State.data.invoices.find(i => i.id === invoice.id);
      if (!existing || existing.offer !== invoice.offer) {
        errors.push('Το ID τιμολογίου υπάρχει ήδη');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Show validation errors
  showErrors(errors) {
    if (errors.length > 0) {
      const errorMessage = errors.join('<br>');
      Toast.error(errorMessage);
      return false;
    }
    return true;
  }
};
