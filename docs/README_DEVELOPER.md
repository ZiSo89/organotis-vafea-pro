# Οργανωτής Βαφέα - Οδηγίες για Developers

## 📋 Περιεχόμενα
- [Εγκατάσταση Dependencies](#εγκατάσταση-dependencies)
- [Τρέξιμο της Εφαρμογής](#τρέξιμο-της-εφαρμογής)
- [Build Process](#build-process)
- [Δομή Project](#δομή-project)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Εγκατάσταση Dependencies

### Προαπαιτούμενα
- **Node.js** (v16 ή νεότερη)
- **npm** (έρχεται με το Node.js)

### Εγκατάσταση Πακέτων
```powershell
cd c:\Users\zisog\Documents\Projects\app\web_app
npm install
```

Αυτό θα εγκαταστήσει:
- `electron` - Framework για desktop apps
- `electron-builder` - Για δημιουργία .exe
- `electron-packager` - Εναλλακτικό packaging tool

---

## 🏃 Τρέξιμο της Εφαρμογής

### Development Mode
```powershell
npm start
```

Αυτό ανοίγει την εφαρμογή σε Electron window για testing.

---

## 🔨 Build Process

### Δημιουργία Portable .exe (ΕΝΑ αρχείο)

**⚠️ ΣΗΜΑΝΤΙΚΟ:** Το build πρέπει να τρέξει με **Administrator privileges** λόγω symlink issues.

#### Βήματα:

1. **Άνοιξε PowerShell ως Administrator:**
   - Δεξί κλικ στο PowerShell
   - "Run as Administrator"

2. **Navigate στο project:**
   ```powershell
   cd c:\Users\zisog\Documents\Projects\app\web_app
   ```

3. **Run build:**
   ```powershell
   npm run build
   ```

4. **Το αρχείο δημιουργείται εδώ:**
   ```
   dist\Οργανωτής-Βαφέα-Portable.exe
   ```

### Εναλλακτικό: Directory Package (πολλά αρχεία)

Αν δεν χρειάζεσαι single .exe:

```powershell
npm run package
```

Δημιουργεί: `dist\Οργανωτής Βαφέα-win32-x64\`

---

## 📁 Δομή Project

```
web_app/
├── index.html              # Main HTML file
├── electron-main.js        # Electron main process
├── package.json            # Dependencies & build config
│
├── css/                    # Stylesheets
│   ├── variables.css       # CSS variables (colors, fonts)
│   ├── base.css           # Base styles
│   ├── components.css     # Buttons, forms, cards
│   ├── dashboard.css      # Dashboard specific
│   ├── tables.css         # Table styles
│   ├── modals.css         # Modal windows
│   ├── sidebar.css        # Navigation sidebar
│   ├── animations.css     # Animations & transitions
│   ├── print.css          # Print styles
│   └── responsive.css     # Mobile responsiveness
│
├── js/                     # JavaScript modules
│   ├── app.js             # Main app initialization
│   ├── config.js          # Configuration
│   ├── router.js          # Page routing
│   ├── state.js           # State management
│   ├── storage.js         # LocalStorage wrapper
│   ├── i18n.js            # Internationalization
│   ├── theme.js           # Dark/Light theme
│   ├── modal.js           # Modal dialogs
│   ├── toast.js           # Toast notifications
│   ├── sidebar.js         # Sidebar navigation
│   ├── table.js           # Table utilities
│   ├── pagination.js      # Pagination logic
│   ├── search.js          # Search functionality
│   ├── autocomplete.js    # Autocomplete inputs
│   ├── keyboard.js        # Keyboard shortcuts
│   ├── validation.js      # Form validation
│   ├── export.js          # Export to PDF/Excel
│   ├── utils.js           # Helper functions
│   │
│   └── views/             # Page-specific logic
│       ├── dashboard.js   # Dashboard view
│       ├── clients.js     # Clients management
│       ├── jobs.js        # Jobs/Projects
│       ├── offers.js      # Price offers
│       ├── invoices.js    # Invoicing
│       ├── inventory.js   # Inventory management
│       ├── calendar.js    # Calendar view
│       ├── statistics.js  # Statistics & reports
│       ├── templates.js   # Document templates
│       └── settings.js    # App settings
│
└── dist/                   # Build output (generated)
    └── Οργανωτής-Βαφέα-Portable.exe
```

---

## 🔧 Scripts στο package.json

```json
"scripts": {
  "start": "electron .",                    // Τρέχει την εφαρμογή
  "build": "electron-builder",              // Δημιουργεί portable .exe
  "package": "electron-packager ..."        // Εναλλακτικό packaging
}
```

---

## ⚙️ Build Configuration

Στο `package.json`:

```json
"build": {
  "appId": "com.painter.organizer",
  "productName": "Οργανωτής Βαφέα",
  "win": {
    "target": [
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ]
  },
  "portable": {
    "artifactName": "Οργανωτής-Βαφέα-Portable.exe"
  }
}
```

---

## 🐛 Troubleshooting

### Πρόβλημα: "Cannot create symbolic link"

**Αιτία:** Τα Windows χρειάζονται admin rights για symlinks.

**Λύση:**
```powershell
# Τρέξε PowerShell ως Administrator
npm run build
```

### Πρόβλημα: Build fails με electron-builder

**Λύση 1:** Χρήση electron-packager:
```powershell
npm run package
```

**Λύση 2:** Καθαρισμός cache:
```powershell
Remove-Item -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Recurse -Force
npm run build
```

### Πρόβλημα: "MODULE_NOT_FOUND"

**Λύση:**
```powershell
rm -r node_modules
rm package-lock.json
npm install
```

---

## 📦 Distribution

Μετά το build:

1. **Το .exe βρίσκεται εδώ:**
   ```
   dist\Οργανωτής-Βαφέα-Portable.exe
   ```

2. **Για διανομή:**
   - Απλά στείλε το .exe αρχείο
   - Δεν χρειάζεται εγκατάσταση
   - Τρέχει από οπουδήποτε

3. **Μέγεθος:**
   - Περίπου 150-200 MB (περιλαμβάνει Chromium)

---

## 🔄 Updates & Maintenance

### Ενημέρωση Dependencies
```powershell
npm update
```

### Έλεγχος για ευπάθειες
```powershell
npm audit
npm audit fix
```

### Ενημέρωση Electron
```powershell
npm install electron@latest --save-dev
```

---

## 📝 Development Tips

1. **Hot Reload:** Τρέξε `npm start` και reload το app με `Ctrl+R`

2. **DevTools:** Πάτα `Ctrl+Shift+I` για να ανοίξεις Developer Tools

3. **Debugging:**
   ```javascript
   console.log('Debug info');  // Φαίνεται στο DevTools console
   ```

4. **Testing:** Δοκίμασε πάντα σε clean environment πριν το build

---

## 📞 Support

Για ερωτήσεις ή προβλήματα:
- Check GitHub Issues
- Email: [your-email]
- Documentation: README_USER.md

---

**Έκδοση:** 1.0.0  
**Τελευταία ενημέρωση:** Νοέμβριος 2025
