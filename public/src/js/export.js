/* ========================================
   Export/Import Utilities
   ======================================== */

const Export = {
  // Export to PDF using jsPDF
  toPDF(title, content, filename = 'export.pdf') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text(title, 20, 20);

      // Content (simple text for now)
      doc.setFontSize(12);
      let y = 40;
      
      if (typeof content === 'string') {
        const lines = doc.splitTextToSize(content, 170);
        lines.forEach(line => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 20, y);
          y += 7;
        });
      } else if (Array.isArray(content)) {
        // Table data
        content.forEach((row, index) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${index + 1}. ${JSON.stringify(row)}`, 20, y);
          y += 7;
        });
      }

      doc.save(filename);
      Toast.success('Το PDF δημιουργήθηκε επιτυχώς!');
    } catch (error) {
      console.error('PDF export error:', error);
      Toast.error('Σφάλμα κατά τη δημιουργία του PDF');
    }
  },

  // Export to Excel using SheetJS
  toExcel(data, sheetName = 'Sheet1', filename = 'export.xlsx') {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);

      Toast.success('Το Excel αρχείο δημιουργήθηκε επιτυχώς!');
    } catch (error) {
      console.error('Excel export error:', error);
      Toast.error('Σφάλμα κατά τη δημιουργία του Excel');
    }
  },

  // Export to CSV
  toCSV(data, filename = 'export.csv') {
    try {
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => 
            JSON.stringify(row[header] || '')
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      Toast.success('Το CSV αρχείο δημιουργήθηκε επιτυχώς!');
    } catch (error) {
      console.error('CSV export error:', error);
      Toast.error('Σφάλμα κατά τη δημιουργία του CSV');
    }
  },

  // Print current view
  print() {
    window.print();
  }
};
