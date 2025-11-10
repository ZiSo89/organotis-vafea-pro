/* ========================================
   Settings View - Ρυθμίσεις
   ======================================== */

window.SettingsView = {
  // Event handlers stored to prevent duplicates
  companyFormHandler: null,
  pricingFormHandler: null,
  
  saveCompany(e) {
    e.preventDefault();
    
    const companyData = {
      name: document.getElementById('companyName').value,
      vat: document.getElementById('companyVat').value,
      address: document.getElementById('companyAddress').value,
      phone: document.getElementById('companyPhone').value
    };
    
    localStorage.setItem('company_settings', JSON.stringify(companyData));
    
    // Update sidebar
    const sidebarName = document.getElementById('sidebarCompanyName');
    if (sidebarName) {
      sidebarName.textContent = companyData.name ? `Οργανωτής Βαφέα ${companyData.name}` : 'Οργανωτής Βαφέα';
    }
    
    Toast.success('Τα στοιχεία επιχείρησης αποθηκεύτηκαν');
  },

  savePricing(e) {
    e.preventDefault();
    
    const pricingData = {
      hourlyRate: parseFloat(document.getElementById('defaultHourlyRate').value) || 25,
      vat: parseFloat(document.getElementById('defaultVat').value) || 24,
      travelCost: parseFloat(document.getElementById('defaultTravelCost').value) || 0.5
    };
    
    localStorage.setItem('pricing_settings', JSON.stringify(pricingData));
    Toast.success('Οι προεπιλογές τιμολόγησης αποθηκεύτηκαν');
  },

  async exportDatabase() {
    try {
      const apiUrl = window.API?.baseURL || '/api';
      const response = await fetch(`${apiUrl}/backup.php?action=export`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      Toast.success('Η βάση δεδομένων εξήχθη επιτυχώς!');
    } catch (error) {
      console.error('Export error:', error);
      Toast.error('Σφάλμα κατά την εξαγωγή της βάσης');
    }
  },

  importDatabase() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (!confirm('ΠΡΟΣΟΧΗ: Η εισαγωγή θα διαγράψει όλα τα υπάρχοντα δεδομένα! Συνέχεια;')) {
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('backup', file);
        
        const apiUrl = window.API?.baseURL || '/api';
        const response = await fetch(`${apiUrl}/backup.php?action=import`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          Toast.success('Η βάση δεδομένων εισήχθη επιτυχώς!');
          setTimeout(() => location.reload(), 1500);
        } else {
          console.error('Import error details:', result);
          const errorMsg = result.error || 'Σφάλμα κατά την εισαγωγή';
          const debugInfo = result.debug ? ` (${result.debug.file}:${result.debug.line})` : '';
          Toast.error(errorMsg + debugInfo);
        }
      } catch (error) {
        console.error('Import error:', error);
        Toast.error('Σφάλμα κατά την εισαγωγή της βάσης');
      }
    };
    input.click();
  },

  async exportExcel() {
    try {
      // Ελέγχουμε αν υπάρχει η βιβλιοθήκη ExcelJS
      if (typeof ExcelJS === 'undefined') {
        Toast.error('Η βιβλιοθήκη ExcelJS δεν είναι διαθέσιμη');
        return;
      }

      Toast.info('Προετοιμασία δεδομένων για εξαγωγή...');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Οργανωτής Βαφέα Pro';
      workbook.created = new Date();
      
      // Helper function για formatting ημερομηνιών
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      };
      
      // Helper function για styling headers
      const styleHeaderRow = (worksheet) => {
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 25;
        
        headerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      };
      
      // Helper function για zebra striping
      const styleDataRows = (worksheet, startRow) => {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= startRow) return; // Skip header and any rows before data
          
          const isEven = rowNumber % 2 === 0;
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF3F4F6' : 'FFFFFFFF' }
          };
          
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
          });
        });
      };
      
      // Helper function για auto-fit columns
      const autoFitColumns = (worksheet) => {
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      };
      
      // Φόρτωση δεδομένων
      const clients = State.read('clients') || [];
      const workers = State.read('workers') || [];
      const materials = State.read('inventory') || [];
      const jobs = State.read('jobs') || [];
      const offers = State.read('offers') || [];
      const invoices = State.read('invoices') || [];
      const templates = State.read('templates') || [];
      
      // Helper για lookup
      const getClientName = (id) => clients.find(c => c.id == id)?.name || `ID: ${id}`;
      
      console.log('📊 Creating workbook with ExcelJS...');
      console.log('Jobs data:', jobs);
      
      // Υπολογισμός οικονομικών
      const totalRevenue = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      const totalCosts = jobs.reduce((sum, j) => sum + parseFloat(j.materialsCost || j.materials_cost || 0), 0);
      const totalProfit = totalRevenue - totalCosts;
      const paidInvoices = invoices.filter(i => i.isPaid || i.is_paid);
      const paidAmount = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      
      // 1. METADATA SHEET
      const metaSheet = workbook.addWorksheet('Πληροφορίες');
      
      // Τίτλος
      const titleRow = metaSheet.addRow(['Οργανωτής Βαφέα - Αναφορά Δεδομένων']);
      metaSheet.mergeCells('A1:B1');
      const titleCell = metaSheet.getCell('A1');
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 30;
      
      metaSheet.addRow([]);
      
      // Πληροφορίες Export με styling
      const dateRow = metaSheet.addRow(['Ημερομηνία Export', formatDate(new Date())]);
      dateRow.font = { bold: true };
      dateRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      
      const timeRow = metaSheet.addRow(['Ώρα Export', new Date().toLocaleTimeString('el-GR')]);
      timeRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      
      const versionRow = metaSheet.addRow(['Έκδοση', '1.0']);
      versionRow.font = { bold: true };
      versionRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      
      metaSheet.addRow([]);
      
      // Στατιστικά - Header
      const statsHeaderRow = metaSheet.addRow(['Στατιστικά Δεδομένων', '']);
      metaSheet.mergeCells(`A${statsHeaderRow.number}:B${statsHeaderRow.number}`);
      const statsHeaderCell = metaSheet.getCell(`A${statsHeaderRow.number}`);
      statsHeaderCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      statsHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }
      };
      statsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statsHeaderRow.height = 25;
      
      metaSheet.addRow(['Πελάτες', clients.length]);
      metaSheet.addRow(['Εργάτες', workers.length]);
      metaSheet.addRow(['Υλικά', materials.length]);
      metaSheet.addRow(['Εργασίες', jobs.length]);
      metaSheet.addRow(['Προσφορές', offers.length]);
      metaSheet.addRow(['Τιμολόγια', invoices.length]);
      metaSheet.addRow(['Πρότυπα', templates.length]);
      metaSheet.addRow([]);
      
      // Οικονομικά - Header
      const financeHeaderRow = metaSheet.addRow(['Οικονομικά Στοιχεία', '']);
      metaSheet.mergeCells(`A${financeHeaderRow.number}:B${financeHeaderRow.number}`);
      const financeHeaderCell = metaSheet.getCell(`A${financeHeaderRow.number}`);
      financeHeaderCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      financeHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' }
      };
      financeHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      financeHeaderRow.height = 25;
      
      metaSheet.addRow(['Σύνολο Τιμολογίων', `€${totalRevenue.toFixed(2)}`]);
      metaSheet.addRow(['Εισπραχθέντα', `€${paidAmount.toFixed(2)}`]);
      metaSheet.addRow(['Κόστος Υλικών', `€${totalCosts.toFixed(2)}`]);
      
      // Καθαρό Κέρδος με conditional formatting
      const profitRow = metaSheet.addRow(['Καθαρό Κέρδος', `€${totalProfit.toFixed(2)}`]);
      profitRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: totalProfit >= 0 ? 'FF10B981' : 'FFEF4444' }
        };
        cell.alignment = { vertical: 'middle' };
      });
      profitRow.height = 25;
      
      // Column widths
      metaSheet.getColumn(1).width = 30;
      metaSheet.getColumn(2).width = 25;
      
      // Borders για όλα τα κελιά με δεδομένα (από γραμμή 3 μέχρι το τέλος)
      for (let i = 3; i <= metaSheet.lastRow.number; i++) {
        const row = metaSheet.getRow(i);
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (!cell.border) {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
          }
        });
      }
      
      console.log('✅ Metadata sheet created');

      // 2. JOBS (Εργασίες) - ΠΡΩΤΟ ΜΕΤΑ ΤΑ METADATA
      if (jobs.length > 0) {
        const jobsSheet = workbook.addWorksheet('Εργασίες');
        jobsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Πελάτης', key: 'client', width: 25 },
          { header: 'Τίτλος', key: 'title', width: 25 },
          { header: 'Τύπος', key: 'type', width: 20 },
          { header: 'Ημερομηνία', key: 'date', width: 15 },
          { header: 'Δωμάτια', key: 'rooms', width: 12 },
          { header: 'Εμβαδόν', key: 'area', width: 12 },
          { header: 'Εργάτες', key: 'workers', width: 30 },
          { header: 'Χρώματα', key: 'paints', width: 30 },
          { header: 'Κόστος Υλικών', key: 'materialsCost', width: 18 },
          { header: 'Κατάσταση', key: 'status', width: 18 },
          { header: 'Συνολικό Κόστος', key: 'totalCost', width: 18 },
          { header: 'Εξοφλήθηκε', key: 'isPaid', width: 15 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];
        
        jobs.forEach(j => {
          console.log('Processing job:', j.id, 'assigned_workers:', j.assigned_workers, 'paints:', j.paints);
          
          // Parse workers - ΔΙΟΡΘΩΜΕΝΟ
          let workersStr = '';
          try {
            const assignedWorkersField = j.assigned_workers || j.assignedWorkers;
            console.log('Raw assigned_workers field:', assignedWorkersField, 'type:', typeof assignedWorkersField);
            
            if (assignedWorkersField) {
              let assignedWorkers;
              
              // Αν είναι ήδη array, χρησιμοποίησε το
              if (Array.isArray(assignedWorkersField)) {
                assignedWorkers = assignedWorkersField;
              } else if (typeof assignedWorkersField === 'string') {
                // Αν είναι string, κάνε parse
                assignedWorkers = JSON.parse(assignedWorkersField);
              }
              
              console.log('Parsed assigned workers:', assignedWorkers);
              
              if (assignedWorkers && assignedWorkers.length > 0) {
                workersStr = assignedWorkers.map(w => {
                  if (typeof w === 'object') {
                    return w.workerName || w.name || '';
                  }
                  return w;
                }).filter(name => name).join(', ');
              }
            }
          } catch (e) {
            console.error('Error parsing workers for job', j.id, ':', e);
            workersStr = '';
          }
          console.log('Final workers string:', workersStr);
          
          // Parse paints - ΔΙΟΡΘΩΜΕΝΟ
          let paintsStr = '';
          try {
            const paintsField = j.paints;
            console.log('Raw paints field:', paintsField, 'type:', typeof paintsField);
            
            if (paintsField) {
              let paints;
              
              // Αν είναι ήδη array, χρησιμοποίησε το
              if (Array.isArray(paintsField)) {
                paints = paintsField;
              } else if (typeof paintsField === 'string') {
                // Αν είναι string, κάνε parse
                paints = JSON.parse(paintsField);
              }
              
              console.log('Parsed paints:', paints);
              
              if (paints && paints.length > 0) {
                paintsStr = paints.map(p => {
                  if (typeof p === 'object') {
                    return `${p.name || ''}${p.code ? ` (${p.code})` : ''}`;
                  }
                  return p;
                }).filter(name => name).join(', ');
              }
            }
          } catch (e) {
            console.error('Error parsing paints for job', j.id, ':', e);
            paintsStr = '';
          }
          console.log('Final paints string:', paintsStr);
          
          jobsSheet.addRow({
            id: j.id,
            client: getClientName(j.clientId || j.client_id),
            title: j.title,
            type: j.type || '',
            date: formatDate(j.date),
            rooms: j.rooms || '',
            area: j.area || '',
            workers: workersStr,
            paints: paintsStr,
            materialsCost: `€${parseFloat(j.materialsCost || j.materials_cost || 0).toFixed(2)}`,
            status: j.status || '',
            totalCost: `€${parseFloat(j.totalCost || j.total_cost || 0).toFixed(2)}`,
            isPaid: (j.isPaid || j.is_paid) ? 'Ναι' : 'Όχι',
            notes: j.notes || ''
          });
        });
        
        // Summary
        const totalCost = jobs.reduce((sum, j) => sum + parseFloat(j.totalCost || j.total_cost || 0), 0);
        const paidJobs = jobs.filter(j => j.isPaid || j.is_paid).length;
        jobsSheet.addRow({
          id: '',
          client: 'ΣΥΝΟΛΑ',
          title: `${jobs.length} εργασίες`,
          type: `${paidJobs} εξοφλημένες`,
          date: '',
          rooms: '',
          area: '',
          workers: '',
          paints: '',
          materialsCost: '',
          status: '',
          totalCost: `€${totalCost.toFixed(2)}`,
          isPaid: '',
          notes: ''
        });
        
        styleHeaderRow(jobsSheet);
        styleDataRows(jobsSheet, 1);
        
        const lastRow = jobsSheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB3B' }
        };
        
        jobsSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Jobs sheet created');
      }

      // 3. CLIENTS
      if (clients.length > 0) {
        const clientsSheet = workbook.addWorksheet('Πελάτες');
        clientsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Όνομα', key: 'name', width: 25 },
          { header: 'Τηλέφωνο', key: 'phone', width: 15 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Διεύθυνση', key: 'address', width: 30 },
          { header: 'Πόλη', key: 'city', width: 20 },
          { header: 'ΤΚ', key: 'postalCode', width: 10 },
          { header: 'ΑΦΜ', key: 'afm', width: 15 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];
        
        clients.forEach(c => {
          clientsSheet.addRow({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            city: c.city || '',
            postalCode: c.postal_code || c.postalCode || '',
            afm: c.afm || '',
            notes: c.notes || ''
          });
        });
        
        styleHeaderRow(clientsSheet);
        styleDataRows(clientsSheet, 1);
        clientsSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Clients sheet created');
      }

      // 4. WORKERS
      if (workers.length > 0) {
        const workersSheet = workbook.addWorksheet('Εργάτες');
        workersSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Όνομα', key: 'name', width: 25 },
          { header: 'Τηλέφωνο', key: 'phone', width: 15 },
          { header: 'Ειδικότητα', key: 'specialty', width: 20 },
          { header: 'Ωριαία Αμοιβή', key: 'hourlyRate', width: 15 },
          { header: 'Ημερήσια Αμοιβή', key: 'dailyRate', width: 15 },
          { header: 'Κατάσταση', key: 'status', width: 15 },
          { header: 'Ημ/νία Πρόσληψης', key: 'hireDate', width: 20 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];
        
        workers.forEach(w => {
          workersSheet.addRow({
            id: w.id,
            name: w.name,
            phone: w.phone || '',
            specialty: w.specialty || '',
            hourlyRate: `€${parseFloat(w.hourlyRate || w.hourly_rate || 0).toFixed(2)}`,
            dailyRate: `€${parseFloat(w.dailyRate || w.daily_rate || 0).toFixed(2)}`,
            status: w.status === 'active' ? 'Ενεργός' : 'Ανενεργός',
            hireDate: formatDate(w.hireDate || w.hire_date),
            notes: w.notes || ''
          });
        });
        
        styleHeaderRow(workersSheet);
        styleDataRows(workersSheet, 1);
        workersSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Workers sheet created');
      }

      // 5. MATERIALS
      if (materials.length > 0) {
        const materialsSheet = workbook.addWorksheet('Υλικά');
        materialsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Όνομα', key: 'name', width: 30 },
          { header: 'Μονάδα', key: 'unit', width: 12 },
          { header: 'Τιμή/Μονάδα', key: 'unitPrice', width: 15 },
          { header: 'Απόθεμα', key: 'stock', width: 12 },
          { header: 'Ελάχιστο Απόθεμα', key: 'minStock', width: 18 },
          { header: 'Κατηγορία', key: 'category', width: 20 }
        ];
        
        materials.forEach(m => {
          materialsSheet.addRow({
            id: m.id,
            name: m.name,
            unit: m.unit,
            unitPrice: `€${parseFloat(m.unitPrice || m.unit_price || 0).toFixed(2)}`,
            stock: parseFloat(m.stock || 0).toFixed(2),
            minStock: parseFloat(m.minStock || m.min_stock || 0).toFixed(2),
            category: m.category || ''
          });
        });
        
        // Summary row
        const totalValue = materials.reduce((sum, m) => 
          sum + (parseFloat(m.unitPrice || m.unit_price || 0) * parseFloat(m.stock || 0)), 0
        );
        materialsSheet.addRow({
          id: '',
          name: 'ΣΥΝΟΛΟ',
          unit: '',
          unitPrice: '',
          stock: '',
          minStock: '',
          category: `Συνολική Αξία: €${totalValue.toFixed(2)}`
        });
        
        styleHeaderRow(materialsSheet);
        styleDataRows(materialsSheet, 1);
        
        // Bold the summary row
        const lastRow = materialsSheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB3B' }
        };
        
        materialsSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Materials sheet created');
      }

      // 6. OFFERS
      if (offers.length > 0) {
        const offersSheet = workbook.addWorksheet('Προσφορές');
        offersSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Αριθμός Προσφοράς', key: 'offerNumber', width: 20 },
          { header: 'Πελάτης', key: 'client', width: 25 },
          { header: 'Ημερομηνία', key: 'date', width: 15 },
          { header: 'Ισχύει έως', key: 'validUntil', width: 15 },
          { header: 'Υποσύνολο', key: 'subtotal', width: 15 },
          { header: 'ΦΠΑ', key: 'tax', width: 12 },
          { header: 'Έκπτωση', key: 'discount', width: 12 },
          { header: 'Σύνολο', key: 'total', width: 15 },
          { header: 'Κατάσταση', key: 'status', width: 15 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];
        
        offers.forEach(o => {
          let statusText = 'Εκκρεμεί';
          if (o.status === 'accepted') statusText = 'Αποδεκτή';
          else if (o.status === 'rejected') statusText = 'Απορρίφθηκε';
          
          offersSheet.addRow({
            id: o.id,
            offerNumber: o.offerNumber || o.offer_number || '',
            client: getClientName(o.clientId || o.client_id),
            date: formatDate(o.date),
            validUntil: formatDate(o.validUntil || o.valid_until),
            subtotal: `€${parseFloat(o.subtotal || 0).toFixed(2)}`,
            tax: `€${parseFloat(o.tax || 0).toFixed(2)}`,
            discount: `€${parseFloat(o.discount || 0).toFixed(2)}`,
            total: `€${parseFloat(o.total || 0).toFixed(2)}`,
            status: statusText,
            notes: o.notes || ''
          });
        });
        
        // Summary
        const totalOffers = offers.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        offersSheet.addRow({
          id: '',
          offerNumber: 'ΣΥΝΟΛΟ',
          client: `${offers.length} προσφορές`,
          date: '',
          validUntil: '',
          subtotal: '',
          tax: '',
          discount: '',
          total: `€${totalOffers.toFixed(2)}`,
          status: '',
          notes: ''
        });
        
        styleHeaderRow(offersSheet);
        styleDataRows(offersSheet, 1);
        
        const lastRow = offersSheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB3B' }
        };
        
        offersSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Offers sheet created');
      }

      // 7. INVOICES
      if (invoices.length > 0) {
        const invoicesSheet = workbook.addWorksheet('Τιμολόγια');
        invoicesSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Αριθμός Τιμολογίου', key: 'invoiceNumber', width: 20 },
          { header: 'Πελάτης', key: 'client', width: 25 },
          { header: 'Εργασία ID', key: 'jobId', width: 12 },
          { header: 'Ημερομηνία', key: 'date', width: 15 },
          { header: 'Υποσύνολο', key: 'subtotal', width: 15 },
          { header: 'ΦΠΑ', key: 'tax', width: 12 },
          { header: 'Έκπτωση', key: 'discount', width: 12 },
          { header: 'Σύνολο', key: 'total', width: 15 },
          { header: 'Εξοφλήθηκε', key: 'isPaid', width: 15 },
          { header: 'Ημ/νία Πληρωμής', key: 'paidDate', width: 20 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];
        
        invoices.forEach(i => {
          invoicesSheet.addRow({
            id: i.id,
            invoiceNumber: i.invoiceNumber || i.invoice_number || '',
            client: getClientName(i.clientId || i.client_id),
            jobId: i.jobId || i.job_id || '',
            date: formatDate(i.date),
            subtotal: `€${parseFloat(i.subtotal || 0).toFixed(2)}`,
            tax: `€${parseFloat(i.tax || 0).toFixed(2)}`,
            discount: `€${parseFloat(i.discount || 0).toFixed(2)}`,
            total: `€${parseFloat(i.total || 0).toFixed(2)}`,
            isPaid: (i.isPaid || i.is_paid) ? 'Ναι' : 'Όχι',
            paidDate: formatDate(i.paidDate || i.paid_date),
            notes: i.notes || ''
          });
        });
        
        // Summary
        const totalInvoices = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
        const paidInvoices = invoices.filter(i => i.isPaid || i.is_paid);
        const paidAmount = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
        
        invoicesSheet.addRow({
          id: '',
          invoiceNumber: 'ΣΥΝΟΛΑ',
          client: `${invoices.length} τιμολόγια`,
          jobId: `${paidInvoices.length} εξοφλημένα`,
          date: '',
          subtotal: '',
          tax: '',
          discount: '',
          total: `€${totalInvoices.toFixed(2)}`,
          isPaid: '',
          paidDate: `Εισπραχθέντα: €${paidAmount.toFixed(2)}`,
          notes: ''
        });
        
        styleHeaderRow(invoicesSheet);
        styleDataRows(invoicesSheet, 1);
        
        const lastRow = invoicesSheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB3B' }
        };
        
        invoicesSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Invoices sheet created');
      }

      // 8. TEMPLATES
      if (templates.length > 0) {
        const templatesSheet = workbook.addWorksheet('Πρότυπα');
        templatesSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Όνομα', key: 'name', width: 30 },
          { header: 'Κατηγορία', key: 'category', width: 20 },
          { header: 'Περιγραφή', key: 'description', width: 40 },
          { header: 'Εκτιμώμενη Διάρκεια (ημέρες)', key: 'estimatedDuration', width: 25 }
        ];
        
        templates.forEach(t => {
          templatesSheet.addRow({
            id: t.id,
            name: t.name,
            category: t.category || '',
            description: t.description || '',
            estimatedDuration: t.estimatedDuration || t.estimated_duration || ''
          });
        });
        
        styleHeaderRow(templatesSheet);
        styleDataRows(templatesSheet, 1);
        templatesSheet.views = [{ state: 'frozen', ySplit: 1 }];
        console.log('✅ Templates sheet created');
      }

      // Export file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Organotis_Vafea_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      saveAs(blob, fileName);
      
      console.log('✅ File exported successfully with ExcelJS');
      Toast.success('Τα δεδομένα εξήχθησαν σε Excel επιτυχώς!');
      
    } catch (error) {
      console.error('Excel export error:', error);
      Toast.error('Σφάλμα κατά την εξαγωγή σε Excel');
    }
  },

  loadCompanyData() {
    // Default company data
    const defaultData = {
      name: 'Νικολαΐδη',
      vat: '123456789',
      address: 'Θάσου 8',
      phone: '+306978093442'
    };
    
    // Get saved data or use defaults
    let companyData = JSON.parse(localStorage.getItem('company_settings') || 'null');
    
    // If no saved data, save and use defaults
    if (!companyData) {
      companyData = defaultData;
      localStorage.setItem('company_settings', JSON.stringify(companyData));
      
      // Update sidebar immediately
      const sidebarName = document.getElementById('sidebarCompanyName');
      if (sidebarName) {
        sidebarName.textContent = `Οργανωτής Βαφέα ${companyData.name}`;
      }
    }
    
    // Populate form fields
    if (companyData.name) {
      document.getElementById('companyName').value = companyData.name;
    }
    if (companyData.vat) {
      document.getElementById('companyVat').value = companyData.vat;
    }
    if (companyData.address) {
      document.getElementById('companyAddress').value = companyData.address;
    }
    if (companyData.phone) {
      document.getElementById('companyPhone').value = companyData.phone;
    }
  },
  
  loadPricingData() {
    // Get saved pricing data
    const pricingData = JSON.parse(localStorage.getItem('pricing_settings') || 'null');
    
    if (pricingData) {
      if (pricingData.hourlyRate !== undefined) {
        document.getElementById('defaultHourlyRate').value = pricingData.hourlyRate;
      }
      if (pricingData.vat !== undefined) {
        document.getElementById('defaultVat').value = pricingData.vat;
      }
      if (pricingData.travelCost !== undefined) {
        document.getElementById('defaultTravelCost').value = pricingData.travelCost;
      }
    }
  },

  render(container) {
    
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-cog"></i> Ρυθμίσεις</h1>
      </div>

      <div class="settings-grid">
        <div class="card">
          <h3><i class="fas fa-building"></i> Στοιχεία Επιχείρησης</h3>
          <form class="form-grid" id="companyForm">
            <div class="form-group">
              <label>Επωνυμία</label>
              <input type="text" id="companyName" placeholder="π.χ. Νικολαΐδη" value="Νικολαΐδη">
            </div>
            <div class="form-group">
              <label>ΑΦΜ</label>
              <input type="text" id="companyVat" placeholder="123456789" value="123456789">
            </div>
            <div class="form-group">
              <label>Διεύθυνση</label>
              <input type="text" id="companyAddress" placeholder="π.χ. Θάσου 8" value="Θάσου 8">
            </div>
            <div class="form-group">
              <label>Τηλέφωνο</label>
              <input type="tel" id="companyPhone" placeholder="+30..." value="+306978093442">
            </div>
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Αποθήκευση
              </button>
            </div>
          </form>
        </div>

        <div class="card">
          <h3><i class="fas fa-euro-sign"></i> Προεπιλογές Τιμολόγησης</h3>
          <form class="form-grid" id="pricingForm">
            <div class="form-group">
              <label>Ωριαία Αμοιβή (€)</label>
              <input type="number" id="defaultHourlyRate" value="25" step="0.5">
            </div>
            <div class="form-group">
              <label>ΦΠΑ (%)</label>
              <input type="number" id="defaultVat" value="24" step="1">
            </div>
            <div class="form-group">
              <label>Κόστος Μετακίνησης (€/km)</label>
              <input type="number" id="defaultTravelCost" value="0.5" step="0.1">
            </div>
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Αποθήκευση
              </button>
            </div>
          </form>
        </div>

        <div class="card">
          <h3><i class="fas fa-database"></i> Διαχείριση Δεδομένων</h3>
          <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px;">
            <button class="btn btn-primary" id="exportJsonBtn">
              <i class="fas fa-download"></i> Export JSON
            </button>
            <button class="btn btn-warning" id="importJsonBtn">
              <i class="fas fa-upload"></i> Import JSON
            </button>
            <button class="btn btn-success" id="exportExcelBtn">
              <i class="fas fa-file-excel"></i> Export Excel
            </button>
          </div>
        </div>

        <div class="card">
          <h3><i class="fas fa-palette"></i> Εμφάνιση</h3>
          <div class="button-group">
            <button class="btn btn-secondary" id="toggleThemeBtn">
              <i class="fas fa-adjust"></i> Toggle Dark/Light Mode
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Load saved company data
    this.loadCompanyData();
    this.loadPricingData();
    
    // Attach event listeners (remove old ones first to prevent duplicates)
    const companyForm = document.getElementById('companyForm');
    if (companyForm) {
      if (this.companyFormHandler) {
        companyForm.removeEventListener('submit', this.companyFormHandler);
      }
      this.companyFormHandler = (e) => this.saveCompany(e);
      companyForm.addEventListener('submit', this.companyFormHandler);
    }
    
    const pricingForm = document.getElementById('pricingForm');
    if (pricingForm) {
      if (this.pricingFormHandler) {
        pricingForm.removeEventListener('submit', this.pricingFormHandler);
      }
      this.pricingFormHandler = (e) => this.savePricing(e);
      pricingForm.addEventListener('submit', this.pricingFormHandler);
    }
    
    // Data management buttons
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => this.exportDatabase());
    document.getElementById('importJsonBtn')?.addEventListener('click', () => this.importDatabase());
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportExcel());
    
    // Theme toggle button
    document.getElementById('toggleThemeBtn')?.addEventListener('click', () => Theme.toggle());
  }
};
