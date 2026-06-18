/* ========================================
   Settings View - Ρυθμίσεις
   ======================================== */

window.SettingsView = {
  // Event handlers stored to prevent duplicates
  companyFormHandler: null,
  pricingFormHandler: null,
  
  async saveCompany(e) {
    e.preventDefault();
    console.log('[Settings] Saving company settings...');
    
    const companyData = {
      name: document.getElementById('companyName').value,
      taxId: document.getElementById('companyTaxId').value,
      address: document.getElementById('companyAddress').value,
      phone: document.getElementById('companyPhone').value
    };
    
    const success = await SettingsService.set('company_settings', companyData);
    
    if (success) {
      // Update sidebar
      const sidebarName = document.getElementById('sidebarCompanyName');
      if (sidebarName) {
        sidebarName.textContent = companyData.name || 'Τέχνη και Χρώμα';
      }
      
      Toast.success('Τα στοιχεία επιχείρησης αποθηκεύτηκαν');
    } else {
      Toast.error('Σφάλμα κατά την αποθήκευση');
    }
  },

  async savePricing(e) {
    e.preventDefault();
    console.log('[Settings] Saving pricing settings...');
    
    const pricingData = {
      hourlyRate: parseFloat(document.getElementById('defaultHourlyRate').value) || 25,
      travelCost: parseFloat(document.getElementById('defaultTravelCost').value) || 0.5
    };
    
    const success = await SettingsService.savePricing(pricingData);
    
    if (success) {
      Toast.success('Οι προεπιλογές τιμολόγησης αποθηκεύτηκαν');
    } else {
      Toast.error('Σφάλμα κατά την αποθήκευση');
    }
  },

  async exportDatabase() {
    try {
      let backupData;
      
      // Check if running in Electron
      if (window.electronAPI) {
        // Use Electron API for export
        console.log('📤 Exporting via Electron API...');
        const result = await window.electronAPI.db.export();
        
        if (!result.success) {
          throw new Error(result.error || 'Export failed');
        }
        
        backupData = result.data;
      } else {
        // Use PHP API for web app
        console.log('📤 Exporting via PHP API...');
        const apiUrl = window.API?.baseURL || '/api';
        const response = await fetch(`${apiUrl}/backup.php?action=export`);
        if (!response.ok) throw new Error('Export failed');
        
        backupData = await response.json();
      }
      
      // Download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
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
      
      // Show confirmation modal instead of alert
      Modal.confirm({
        title: 'ΠΡΟΣΟΧΗ',
        message: 'Η εισαγωγή θα διαγράψει όλα τα υπάρχοντα δεδομένα!',
        confirmText: 'Συνέχεια',
        cancelText: 'Ακύρωση',
        onConfirm: async () => {
          await this.performImport(file);
        }
      });
    };
    input.click();
  },

  async performImport(file) {
    try {
      // Read file content
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);
        
        // Check if running in Electron
        if (window.electronAPI) {
          // Use Electron API for import
          console.log('📥 Importing via Electron API...');
          const result = await window.electronAPI.db.import(backupData);
          
          if (result.success) {
            Toast.success('Η βάση δεδομένων εισήχθη επιτυχώς!');
            setTimeout(() => location.reload(), 1500);
          } else {
            console.error('Import error:', result.error);
            Toast.error(result.error || 'Σφάλμα κατά την εισαγωγή');
          }
        } else {
          // Use PHP API for web app
          console.log('📥 Importing via PHP API...');
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
        }
    } catch (error) {
      console.error('❌ Import error:', error);
      Toast.error('Σφάλμα κατά την ανάγνωση του αρχείου');
    }
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
      workbook.creator = 'Τέχνη και Χρώμα';
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
      const stockMovements = State.read('materialStockMovements') || [];
      const suppliers = State.read('suppliers') || [];
      const materialPurchases = State.read('materialPurchases') || [];
      const supplierPayments = State.read('supplierPayments') || [];
      const jobs = State.read('jobs') || [];
      const offers = State.read('offers') || [];
      const invoices = State.read('invoices') || [];
      const templates = State.read('templates') || [];
      
      // Helper για lookup
      const getClientName = (id) => clients.find(c => c.id == id)?.name || `ID: ${id}`;
      
      console.log('📊 Excel Export - Υπολογισμός οικονομικών...');
      
      // Υπολογισμός οικονομικών
      // Τα έσοδα προέρχονται από όλα τα τιμολόγια
      const totalRevenue = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      
      // Τα κόστη προέρχονται από όλες τις εργασίες
      const totalCosts = jobs.reduce((sum, j) => sum + parseFloat(j.materialsCost || j.materials_cost || 0), 0);
      
      // Τα κέρδη υπολογίζονται μόνο από εξοφλημένες εργασίες
      const paidJobs = jobs.filter(j => {
        const status = (j.status || '').toLowerCase();
        return status.includes('εξοφλ') || status === 'paid';
      });
      
      const paidJobsRevenue = paidJobs.reduce((sum, j) => sum + parseFloat(j.totalCost || j.total_cost || 0), 0);
      const paidJobsCosts = paidJobs.reduce((sum, j) => sum + parseFloat(j.materialsCost || j.materials_cost || 0), 0);
      const totalProfit = paidJobsRevenue - paidJobsCosts;
      
      console.log(`✅ Εξοφλημένες εργασίες: ${paidJobs.length}/${jobs.length}`);
      console.log(`💰 Έσοδα εξοφλημένων: €${paidJobsRevenue.toFixed(2)}`);
      console.log(`💸 Κόστη εξοφλημένων: €${paidJobsCosts.toFixed(2)}`);
      console.log(`📈 Καθαρό κέρδος: €${totalProfit.toFixed(2)}`);
      
      const paidInvoices = invoices.filter(i => i.isPaid || i.is_paid);
      const paidAmount = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      
      // 1. METADATA SHEET
      const metaSheet = workbook.addWorksheet('Πληροφορίες');
      
      // Τίτλος
      const titleRow = metaSheet.addRow(['Τέχνη και Χρώμα - Αναφορά Δεδομένων']);
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
      metaSheet.addRow(['Κινήσεις Αποθήκης', stockMovements.length]);
      metaSheet.addRow(['Καταστήματα', suppliers.length]);
      metaSheet.addRow(['Αγορές Υλικών', materialPurchases.length]);
      metaSheet.addRow(['Πληρωμές Καταστημάτων', supplierPayments.length]);
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
      

      // 2. JOBS (Εργασίες) - ΠΡΩΤΟ ΜΕΤΑ ΤΑ METADATA
      if (jobs.length > 0) {
        const jobsSheet = workbook.addWorksheet('Εργασίες');
        jobsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Πελάτης', key: 'client', width: 25 },
          { header: 'Τίτλος', key: 'title', width: 25 },
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
          
          // Parse workers - ΔΙΟΡΘΩΜΕΝΟ
          let workersStr = '';
          try {
            const assignedWorkersField = j.assigned_workers || j.assignedWorkers;
            
            if (assignedWorkersField) {
              let assignedWorkers;
              
              // Αν είναι ήδη array, χρησιμοποίησε το
              if (Array.isArray(assignedWorkersField)) {
                assignedWorkers = assignedWorkersField;
              } else if (typeof assignedWorkersField === 'string') {
                // Αν είναι string, κάνε parse
                assignedWorkers = JSON.parse(assignedWorkersField);
              }
              
              
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
          
          // Parse paints - ΔΙΟΡΘΩΜΕΝΟ
          let paintsStr = '';
          try {
            const paintsField = j.paints;
            
            if (paintsField) {
              let paints;
              
              // Αν είναι ήδη array, χρησιμοποίησε το
              if (Array.isArray(paintsField)) {
                paints = paintsField;
              } else if (typeof paintsField === 'string') {
                // Αν είναι string, κάνε parse
                paints = JSON.parse(paintsField);
              }
              
              
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
          
          jobsSheet.addRow({
            id: j.id,
            client: getClientName(j.clientId || j.client_id),
            title: j.title,
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
      }

      // 6. SUPPLIERS
      if (suppliers.length > 0) {
        const suppliersSheet = workbook.addWorksheet('Καταστήματα');
        suppliersSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Όνομα', key: 'name', width: 30 },
          { header: 'Τηλέφωνο', key: 'phone', width: 18 },
          { header: 'Διεύθυνση', key: 'address', width: 35 },
          { header: 'Σύνολο Αγορών', key: 'totalPurchases', width: 18 },
          { header: 'Πληρωμένα', key: 'totalPaid', width: 18 },
          { header: 'Υπόλοιπο', key: 'balance', width: 18 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];

        suppliers.forEach(s => {
          suppliersSheet.addRow({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            address: s.address || '',
            totalPurchases: `€${parseFloat(s.totalPurchases || s.total_purchases || 0).toFixed(2)}`,
            totalPaid: `€${parseFloat(s.totalPaid || s.total_paid || 0).toFixed(2)}`,
            balance: `€${parseFloat(s.balance || 0).toFixed(2)}`,
            notes: s.notes || ''
          });
        });

        styleHeaderRow(suppliersSheet);
        styleDataRows(suppliersSheet, 1);
        suppliersSheet.views = [{ state: 'frozen', ySplit: 1 }];
      }

      // 7. MATERIAL PURCHASES
      if (materialPurchases.length > 0) {
        const purchasesSheet = workbook.addWorksheet('Αγορές Υλικών');
        purchasesSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Ημερομηνία', key: 'purchaseDate', width: 15 },
          { header: 'Κατάστημα', key: 'supplier', width: 30 },
          { header: 'Σύνολο', key: 'totalCost', width: 15 },
          { header: 'Πληρωμένο στην αγορά', key: 'paidAmount', width: 22 },
          { header: 'Υπόλοιπο αγοράς', key: 'balance', width: 18 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];

        materialPurchases.forEach(p => {
          purchasesSheet.addRow({
            id: p.id,
            purchaseDate: formatDate(p.purchaseDate || p.purchase_date),
            supplier: p.supplierName || p.supplier_name || '',
            totalCost: `€${parseFloat(p.totalCost || p.total_cost || 0).toFixed(2)}`,
            paidAmount: `€${parseFloat(p.paidAmount || p.paid_amount || 0).toFixed(2)}`,
            balance: `€${parseFloat(p.balance || 0).toFixed(2)}`,
            notes: p.notes || ''
          });
        });

        styleHeaderRow(purchasesSheet);
        styleDataRows(purchasesSheet, 1);
        purchasesSheet.views = [{ state: 'frozen', ySplit: 1 }];
      }

      // 8. SUPPLIER PAYMENTS
      if (supplierPayments.length > 0) {
        const paymentsSheet = workbook.addWorksheet('Πληρωμές Καταστημάτων');
        paymentsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Ημερομηνία', key: 'paymentDate', width: 15 },
          { header: 'Κατάστημα', key: 'supplier', width: 30 },
          { header: 'Αγορά ID', key: 'purchaseId', width: 12 },
          { header: 'Ποσό', key: 'amount', width: 15 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];

        supplierPayments.forEach(p => {
          paymentsSheet.addRow({
            id: p.id,
            paymentDate: formatDate(p.paymentDate || p.payment_date),
            supplier: p.supplierName || p.supplier_name || '',
            purchaseId: p.purchaseId || p.purchase_id || '',
            amount: `€${parseFloat(p.amount || 0).toFixed(2)}`,
            notes: p.notes || ''
          });
        });

        styleHeaderRow(paymentsSheet);
        styleDataRows(paymentsSheet, 1);
        paymentsSheet.views = [{ state: 'frozen', ySplit: 1 }];
      }

      // 9. STOCK MOVEMENTS
      if (stockMovements.length > 0) {
        const movementsSheet = workbook.addWorksheet('Κινήσεις Αποθήκης');
        movementsSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Ημερομηνία', key: 'movementDate', width: 15 },
          { header: 'Υλικό', key: 'material', width: 30 },
          { header: 'Τύπος', key: 'movementType', width: 18 },
          { header: 'Ποσότητα', key: 'quantity', width: 14 },
          { header: 'Πριν', key: 'previousStock', width: 14 },
          { header: 'Μετά', key: 'newStock', width: 14 },
          { header: 'Μονάδα', key: 'unit', width: 12 },
          { header: 'Αναφορά', key: 'reference', width: 18 },
          { header: 'Σημειώσεις', key: 'notes', width: 30 }
        ];

        stockMovements.forEach(m => {
          movementsSheet.addRow({
            id: m.id,
            movementDate: formatDate(m.movementDate || m.movement_date),
            material: m.materialName || m.material_name || '',
            movementType: m.movementType || m.movement_type || '',
            quantity: parseFloat(m.quantity || 0).toFixed(2),
            previousStock: parseFloat(m.previousStock || m.previous_stock || 0).toFixed(2),
            newStock: parseFloat(m.newStock || m.new_stock || 0).toFixed(2),
            unit: m.unit || '',
            reference: `${m.referenceType || m.reference_type || ''} ${m.referenceId || m.reference_id || ''}`.trim(),
            notes: m.notes || ''
          });
        });

        styleHeaderRow(movementsSheet);
        styleDataRows(movementsSheet, 1);
        movementsSheet.views = [{ state: 'frozen', ySplit: 1 }];
      }

      // 10. OFFERS
      if (offers.length > 0) {
        const offersSheet = workbook.addWorksheet('Προσφορές');
        offersSheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Αριθμός Προσφοράς', key: 'offerNumber', width: 20 },
          { header: 'Πελάτης', key: 'client', width: 25 },
          { header: 'Ημερομηνία', key: 'date', width: 15 },
          { header: 'Ισχύει έως', key: 'validUntil', width: 15 },
          { header: 'Υποσύνολο', key: 'subtotal', width: 15 },
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
      }

      // Export file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Organotis_Vafea_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      saveAs(blob, fileName);
      
      Toast.success('Τα δεδομένα εξήχθησαν σε Excel επιτυχώς!');
      
    } catch (error) {
      console.error('Excel export error:', error);
      Toast.error('Σφάλμα κατά την εξαγωγή σε Excel');
    }
  },

  async loadCompanyData() {
    console.log('[Settings] Loading company data...');
    
    // Default company data
    const defaultData = {
      name: 'Νικολαΐδη',
      taxId: '123456789',
      address: 'Θάσου 8',
      phone: '+306978093442'
    };
    
    // Get saved data or use defaults
    let companyData = await SettingsService.get('company_settings', null);
    
    // If no saved data, save and use defaults
    if (!companyData) {
      console.log('[Settings] No company data found, using defaults');
      companyData = defaultData;
      await SettingsService.set('company_settings', companyData);
      
      // Update sidebar immediately
      const sidebarName = document.getElementById('sidebarCompanyName');
      if (sidebarName) {
        sidebarName.textContent = companyData.name || 'Τέχνη και Χρώμα';
      }
    }
    
    console.log('[Settings] Company data:', companyData);
    
    // Populate form fields
    if (companyData.name) {
      document.getElementById('companyName').value = companyData.name;
    }
    if (companyData.taxId) {
      document.getElementById('companyTaxId').value = companyData.taxId;
    }
    if (companyData.address) {
      document.getElementById('companyAddress').value = companyData.address;
    }
    if (companyData.phone) {
      document.getElementById('companyPhone').value = companyData.phone;
    }
  },
  
  async loadPricingData() {
    console.log('[Settings] Loading pricing data...');
    
    // Get saved pricing data with defaults
    const pricingData = await SettingsService.getPricing();
    
    console.log('[Settings] Pricing data:', pricingData);
    
    if (pricingData) {
      if (pricingData.hourlyRate !== undefined) {
        document.getElementById('defaultHourlyRate').value = pricingData.hourlyRate;
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

      <div class="settings-grid settings-accordion">
        <div class="card">
          <h3><i class="fas fa-building"></i> Στοιχεία Επιχείρησης</h3>
          <form class="form-grid" id="companyForm">
            <div class="form-group">
              <label>Επωνυμία</label>
              <input type="text" id="companyName" placeholder="π.χ. Νικολαΐδη" value="Νικολαΐδη">
            </div>
            <div class="form-group">
              <label>ΑΦΜ</label>
              <input type="text" id="companyTaxId" placeholder="123456789" value="123456789">
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
              <input type="number" id="defaultHourlyRate" value="25" min="0" step="1">
            </div>
            <div class="form-group">
              <label>Κόστος Μετακίνησης (€/km)</label>
              <input type="number" id="defaultTravelCost" value="0.5" min="0" step="0.01">
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

        <!-- Sync Card (Electron Only) -->
        <div class="card" id="syncCard" style="display: none;">
          <h3><i class="fas fa-sync"></i> Συγχρονισμός Δεδομένων</h3>
          <p style="color: var(--color-text-muted); margin-bottom: 15px;">
            Συγχρονίστε τα δεδομένα σας μεταξύ του server και της τοπικής βάσης για λειτουργία offline.
          </p>
          
          <!-- Server URL Configuration -->
          <div style="margin-bottom: 20px; padding: 15px; background: var(--color-bg-light); border-radius: 8px; border: 1px solid var(--color-border);">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--color-text);">
              <i class="fas fa-server"></i> Διεύθυνση Server
            </h4>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input 
                type="text" 
                id="serverUrlInput" 
                class="form-control" 
                placeholder="π.χ. http://localhost:8000 ή https://yourserver.com"
                style="flex: 1;"
              />
              <button class="btn btn-primary" id="saveServerUrlBtn" style="white-space: nowrap;">
                <i class="fas fa-save"></i> Αποθήκευση
              </button>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: var(--color-text-muted);">
              <i class="fas fa-info-circle"></i> 
              <strong>Localhost:</strong> http://localhost:8000 (για τοπικό server) <br>
              <strong>Online:</strong> https://yourserver.com (για παραγωγή)
            </div>
          </div>
          
          <div id="syncStatus" style="margin-bottom: 15px; padding: 10px; background: var(--color-bg); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Κατάσταση:</span>
              <span id="onlineStatus"><i class="fas fa-circle"></i> Έλεγχος...</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Server URL:</span>
              <span id="currentServerUrl" style="font-family: monospace; font-size: 12px; color: var(--color-primary);">-</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Τελευταία Λήψη:</span>
              <span id="lastDownload">-</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Τελευταία Αποστολή:</span>
              <span id="lastUpload">-</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Εκκρεμείς Αλλαγές:</span>
              <span id="pendingChanges">0</span>
            </div>
          </div>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button class="btn btn-primary" id="downloadBtn">
              <i class="fas fa-cloud-download-alt"></i> Λήψη από Server
            </button>
            <button class="btn btn-success" id="uploadBtn">
              <i class="fas fa-cloud-upload-alt"></i> Αποστολή στον Server
            </button>
            <button class="btn btn-secondary" id="refreshStatusBtn">
              <i class="fas fa-sync"></i> Ανανέωση Κατάστασης
            </button>
          </div>
        </div>

        <!-- Google Calendar Card (Web only) -->
        <div class="card" id="googleCalendarCard" style="display: none;">
          <h3><i class="fab fa-google"></i> Google Calendar</h3>
          <p style="color: var(--color-text-muted); margin-bottom: 15px;">
            Συγχρονίστε αμφίδρομα τις επισκέψεις του ημερολογίου με το Google Calendar σας.
          </p>

          <div id="googleStatus" style="margin-bottom: 15px; padding: 10px; background: var(--color-bg); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Κατάσταση:</span>
              <span id="googleConnState"><i class="fas fa-circle"></i> Έλεγχος...</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Τελευταίος συγχρονισμός:</span>
              <span id="googleLastSync">-</span>
            </div>
          </div>

          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button class="btn btn-primary" id="googleConnectBtn">
              <i class="fab fa-google"></i> Σύνδεση με Google
            </button>
            <button class="btn btn-success" id="googleSyncBtn" style="display: none;" title="Φέρνει αλλαγές/διαγραφές που έγιναν κατευθείαν στο Google. Οι αλλαγές της εφαρμογής στέλνονται αυτόματα.">
              <i class="fas fa-cloud-download-alt"></i> Εισαγωγή αλλαγών από Google
            </button>
            <button class="btn btn-danger" id="googleDisconnectBtn" style="display: none;">
              <i class="fas fa-unlink"></i> Αποσύνδεση
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
    this.setupSettingsAccordion(container);
    
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
    
    // Initialize sync UI if in Electron
    this.initSyncUI();

    // Initialize Google Calendar UI (web only)
    this.initGoogleCalendarUI();
  },

  /* ========================================
     Google Calendar (Web only)
     ======================================== */

  async initGoogleCalendarUI() {
    const card = document.getElementById('googleCalendarCard');
    if (!card) return;

    // OAuth ζει στον PHP server -> διαθέσιμο μόνο στην web έκδοση (όχι Electron)
    if (OfflineService.isElectron()) return;

    card.style.display = 'block';

    // Toast από το OAuth redirect (?gcal=connected | error)
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    if (gcal === 'connected') {
      Toast.success('✅ Συνδέθηκε με Google Calendar');
    } else if (gcal === 'error') {
      Toast.error('❌ Αποτυχία σύνδεσης με Google Calendar');
    }
    if (gcal) {
      // Καθάρισε το query param
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
    }

    document.getElementById('googleConnectBtn')?.addEventListener('click', () => {
      window.location.href = '/api/google_oauth.php?action=connect';
    });
    document.getElementById('googleSyncBtn')?.addEventListener('click', () => this.syncGoogleCalendar());
    document.getElementById('googleDisconnectBtn')?.addEventListener('click', () => this.disconnectGoogle());

    await this.updateGoogleStatus();
  },

  async updateGoogleStatus() {
    const connState = document.getElementById('googleConnState');
    const lastSync = document.getElementById('googleLastSync');
    const connectBtn = document.getElementById('googleConnectBtn');
    const syncBtn = document.getElementById('googleSyncBtn');
    const disconnectBtn = document.getElementById('googleDisconnectBtn');

    try {
      const response = await fetch('/api/google_oauth.php?action=status');
      const result = await response.json();

      if (!result.configured) {
        if (connState) {
          connState.innerHTML = '<i class="fas fa-circle" style="color: var(--color-warning);"></i> Μη ρυθμισμένο';
        }
        if (connectBtn) {
          connectBtn.disabled = true;
          connectBtn.title = 'Λείπουν τα GOOGLE_CLIENT_ID / SECRET στον server';
        }
        return;
      }

      const connected = !!result.connected;
      if (connState) {
        const color = connected ? 'var(--color-success)' : 'var(--color-error)';
        const text = connected ? 'Συνδεδεμένο' : 'Μη συνδεδεμένο';
        connState.innerHTML = `<i class="fas fa-circle" style="color: ${color};"></i> ${text}`;
      }
      if (lastSync) {
        lastSync.textContent = result.lastSync
          ? new Date(result.lastSync).toLocaleString('el-GR')
          : 'Ποτέ';
      }
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.title = 'Σύνδεση με Google Calendar';
        connectBtn.style.display = connected ? 'none' : 'inline-flex';
      }
      if (syncBtn) syncBtn.style.display = connected ? 'inline-flex' : 'none';
      if (disconnectBtn) disconnectBtn.style.display = connected ? 'inline-flex' : 'none';
    } catch (error) {
      console.error('Google status error:', error);
      if (connState) {
        connState.innerHTML = '<i class="fas fa-circle" style="color: var(--color-error);"></i> Σφάλμα';
      }
    }
  },

  async syncGoogleCalendar() {
    const syncBtn = document.getElementById('googleSyncBtn');
    try {
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Εισαγωγή...';
      }
      Toast.info('Εισαγωγή αλλαγών από Google Calendar...');

      const response = await fetch('/api/google_calendar.php?action=sync', {
        method: 'POST',
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        const cleared = result.clearedJobs ? `, ${result.clearedJobs} εργασίες καθαρίστηκαν` : '';
        Toast.success(`✅ Sync: ${result.pulled} από Google, ${result.pushed} προς Google${cleared}`);
        if (typeof State !== 'undefined') {
          if (State.loadAll) await State.loadAll();
          if (State.refreshCalendarIfNeeded) State.refreshCalendarIfNeeded();
          if (State.refreshJobsIfNeeded) State.refreshJobsIfNeeded();
        }
      } else {
        const msg = result.error || (result.errors && result.errors.join(', ')) || 'Άγνωστο σφάλμα';
        Toast.error('❌ ' + msg);
      }
      await this.updateGoogleStatus();
    } catch (error) {
      console.error('Google sync error:', error);
      Toast.error('❌ Σφάλμα συγχρονισμού: ' + error.message);
    } finally {
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Εισαγωγή αλλαγών από Google';
      }
    }
  },

  disconnectGoogle() {
    Modal.confirm({
      title: 'Αποσύνδεση Google Calendar',
      message: 'Θα διακοπεί ο συγχρονισμός. Τα events στο Google παραμένουν. Συνέχεια;',
      confirmText: 'Αποσύνδεση',
      cancelText: 'Ακύρωση',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/google_oauth.php?action=disconnect', { method: 'POST' });
          const result = await response.json();
          if (result.success) {
            Toast.success('Αποσυνδέθηκε από Google Calendar');
          } else {
            Toast.error('❌ ' + (result.error || 'Σφάλμα αποσύνδεσης'));
          }
          await this.updateGoogleStatus();
        } catch (error) {
          console.error('Google disconnect error:', error);
          Toast.error('❌ Σφάλμα: ' + error.message);
        }
      }
    });
  },

  /* ========================================
     Sync Functions (Electron Only)
     ======================================== */

  async initSyncUI() {
    const syncCard = document.getElementById('syncCard');
    if (!syncCard) return;

    // Show sync card only in Electron
    if (OfflineService.isElectron()) {
      syncCard.style.display = 'block';
      
      // Load current server URL
      const serverUrlInput = document.getElementById('serverUrlInput');
      if (serverUrlInput) {
        serverUrlInput.value = this.getServerUrl();
      }
      
      // Attach event listeners
      document.getElementById('saveServerUrlBtn')?.addEventListener('click', () => this.saveServerUrl());
      document.getElementById('downloadBtn')?.addEventListener('click', () => this.syncDownload());
      document.getElementById('uploadBtn')?.addEventListener('click', () => this.syncUpload());
      document.getElementById('refreshStatusBtn')?.addEventListener('click', () => this.updateSyncStatus());
      
      // Initial status update
      await this.updateSyncStatus();
    }
  },

  async updateSyncStatus() {
    const onlineStatus = document.getElementById('onlineStatus');
    const currentServerUrl = document.getElementById('currentServerUrl');
    const lastDownload = document.getElementById('lastDownload');
    const lastUpload = document.getElementById('lastUpload');
    const pendingChanges = document.getElementById('pendingChanges');

    try {
      // Show current server URL
      const serverUrl = this.getServerUrl();
      if (currentServerUrl) {
        currentServerUrl.textContent = serverUrl;
      }
      
      // Check online status - check the actual server, not just internet
      const isOnline = await OfflineService.checkOnline(serverUrl);
      if (onlineStatus) {
        const color = isOnline ? 'var(--color-success)' : 'var(--color-error)';
        const text = isOnline ? 'Online' : 'Offline';
        onlineStatus.innerHTML = `<i class="fas fa-circle" style="color: ${color};"></i> ${text}`;
      }

      // Enable/disable sync buttons based on online status
      const downloadBtn = document.getElementById('downloadBtn');
      const uploadBtn = document.getElementById('uploadBtn');
      if (downloadBtn) {
        downloadBtn.disabled = !isOnline;
        downloadBtn.title = isOnline ? 'Λήψη δεδομένων από τον server' : 'Ο server δεν είναι διαθέσιμος';
      }
      if (uploadBtn) {
        uploadBtn.disabled = !isOnline;
        uploadBtn.title = isOnline ? 'Αποστολή δεδομένων στον server' : 'Ο server δεν είναι διαθέσιμος';
      }

      // Get sync status
      const status = await OfflineService.getSyncStatus();
      if (status) {
        if (lastDownload) {
          lastDownload.textContent = status.lastDownload 
            ? new Date(status.lastDownload).toLocaleString('el-GR')
            : 'Ποτέ';
        }
        if (lastUpload) {
          lastUpload.textContent = status.lastUpload 
            ? new Date(status.lastUpload).toLocaleString('el-GR')
            : 'Ποτέ';
        }
        if (pendingChanges) {
          pendingChanges.textContent = status.totalPending || 0;
          pendingChanges.style.color = status.totalPending > 0 
            ? 'var(--color-warning)' 
            : 'var(--color-success)';
        }
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  },

  getServerUrl() {
    // Get server URL from localStorage, default to XAMPP localhost (port 80)
    return localStorage.getItem('syncServerUrl') || 'http://localhost/nikolpaintmaster.e-gata.gr';
  },

  setServerUrl(url) {
    localStorage.setItem('syncServerUrl', url);
  },

  async syncDownload() {
    const serverUrl = this.getServerUrl();
    
    // Confirm before downloading (this will clear local data)
    if (!confirm(`⚠️ Η λήψη θα αντικαταστήσει ΟΛΑ τα τοπικά δεδομένα με αυτά από τον server.\n\nΕίστε σίγουροι ότι θέλετε να συνεχίσετε;`)) {
      return;
    }
    
    try {
      Toast.info(`Λήψη από ${serverUrl}...`);
      
      // Set up one-time listener for data refresh if in Electron
      let refreshUnsubscribe;
      if (window.electronAPI && window.electronAPI.sync.onDataRefresh) {
        refreshUnsubscribe = window.electronAPI.sync.onDataRefresh(async (data) => {
          console.log('[Settings] Data refresh event received:', data);
          
          // Reload state data
          try {
            if (typeof State !== 'undefined' && State.loadAll) {
              await State.loadAll();
              console.log('[Settings] State reloaded successfully after data refresh');
              Toast.success('🔄 Δεδομένα ανανεώθηκαν!');
              
              // Reload settings cache
              if (typeof SettingsService !== 'undefined' && SettingsService.loadAll) {
                SettingsService.loaded = false; // Force reload
                await SettingsService.loadAll();
                console.log('[Settings] Settings cache reloaded');
              }
              
              // Refresh current view
              const currentSection = State.currentSection || 'dashboard';
              if (typeof Router !== 'undefined' && Router.navigate) {
                Router.navigate(currentSection);
              } else if (currentSection === 'settings') {
                // If we're on settings page, manually reload the data
                await this.loadCompanyData();
                await this.loadPricingData();
              }
            }
          } catch (error) {
            console.error('[Settings] Error reloading state:', error);
          }
          
          // Unsubscribe after handling
          if (refreshUnsubscribe) {
            refreshUnsubscribe();
          }
        });
      }
      
      const result = await OfflineService.downloadFromServer(serverUrl);
      
      if (result.success) {
        Toast.success(`✅ Ληφθηκαν ${result.totalRecords} εγγραφές`);
        await this.updateSyncStatus();
        
        // If no event listener (not Electron or old version), reload manually
        if (!refreshUnsubscribe) {
          console.log('[Settings] Manual reload (no event listener)');
          try {
            if (typeof State !== 'undefined' && State.loadAll) {
              await State.loadAll();
              console.log('[Settings] State reloaded successfully');
              Toast.success('🔄 Δεδομένα ανανεώθηκαν!');
            }
          } catch (error) {
            console.error('[Settings] Error reloading state:', error);
          }
          
          // Refresh current view
          setTimeout(() => {
            const currentSection = State.currentSection || 'dashboard';
            if (typeof Router !== 'undefined' && Router.navigate) {
              Router.navigate(currentSection);
            } else {
              window.location.reload();
            }
          }, 500);
        }
      } else {
        Toast.error(`❌ Αποτυχία: ${result.errors.join(', ')}`);
        // Clean up listener on error
        if (refreshUnsubscribe) {
          refreshUnsubscribe();
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Toast.error('❌ Σφάλμα λήψης: ' + error.message);
    }
  },

  async syncUpload() {
    const serverUrl = this.getServerUrl();
    
    const pending = await OfflineService.getPendingCount();
    if (pending === 0) {
      Toast.info('Δεν υπάρχουν εκκρεμείς αλλαγές');
      return;
    }
    
    if (!confirm(`Θα σταλούν ${pending} αλλαγές στον ${serverUrl}. Συνέχεια;`)) {
      return;
    }
    
    try {
      Toast.info(`Αποστολή στον ${serverUrl}...`);
      
      // Set up one-time listener for upload complete if in Electron
      let uploadUnsubscribe;
      if (window.electronAPI && window.electronAPI.sync.onDataUploaded) {
        uploadUnsubscribe = window.electronAPI.sync.onDataUploaded(async (data) => {
          console.log('[Settings] Data uploaded event received:', data);
          
          // Update sync status
          await this.updateSyncStatus();
          Toast.success('✅ Συγχρονισμός ολοκληρώθηκε!');
          
          // Unsubscribe after handling
          if (uploadUnsubscribe) {
            uploadUnsubscribe();
          }
        });
      }
      
      const result = await OfflineService.uploadToServer(serverUrl);
      
      if (result.success) {
        Toast.success(`✅ Στάλθηκαν ${result.totalRecords} αλλαγές`);
        
        // If no event listener (not Electron or old version), update manually
        if (!uploadUnsubscribe) {
          await this.updateSyncStatus();
        }
      } else {
        Toast.error(`❌ Αποτυχία: ${result.errors.join(', ')}`);
        // Clean up listener on error
        if (uploadUnsubscribe) {
          uploadUnsubscribe();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Toast.error('❌ Σφάλμα αποστολής: ' + error.message);
    }
  },

  saveServerUrl() {
    const input = document.getElementById('serverUrlInput');
    if (!input) return;
    
    const url = input.value.trim();
    if (!url) {
      Toast.error('Παρακαλώ εισάγετε URL');
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
      this.setServerUrl(url);
      Toast.success('✅ Το Server URL αποθηκεύτηκε');
      this.updateSyncStatus();
    } catch (error) {
      Toast.error('❌ Μη έγκυρο URL');
    }
  },

  setupSettingsAccordion(container) {
    if (!Utils.isMobile()) return;

    container.querySelectorAll('.settings-grid > .card').forEach((card, index) => {
      if (card.dataset.accordionInit === '1') return;
      card.dataset.accordionInit = '1';

      const heading = card.querySelector('h3');
      if (!heading) return;

      const bodyNodes = Array.from(card.childNodes).filter(node => node !== heading);
      const body = document.createElement('div');
      body.className = 'settings-card-body';
      bodyNodes.forEach(node => body.appendChild(node));

      const details = document.createElement('details');
      details.className = 'ui-accordion-item';
      if (index === 0) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'ui-accordion-summary';
      summary.innerHTML = heading.innerHTML;

      details.append(summary, body);
      card.replaceChildren(details);
    });
  }
};
