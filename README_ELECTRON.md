# Οργανωτής Βαφέα - Electron με Offline Support

## 🎯 Χαρακτηριστικά

✅ **Hybrid Architecture** - Λειτουργεί online (MySQL) και offline (SQLite)
✅ **Desktop App** - Electron app για Windows/Mac/Linux  
✅ **Sync Functionality** - Συγχρονισμός δεδομένων με τον server
✅ **Offline First** - Πλήρης λειτουργικότητα χωρίς internet
✅ **Zero Changes** - Καμία αλλαγή στη MySQL βάση

## 📁 Δομή Project

```
Οργανωτής-Βαφέα-app/
├── electron/              # Electron backend
│   ├── main.js           # Main process
│   ├── preload.js        # IPC bridge
│   └── db/
│       ├── sqlite.js     # SQLite database manager
│       └── sync.js       # Sync logic
├── public/               # Frontend (όπως πριν)
│   └── src/js/
│       └── services/
│           ├── api.js    # Online API (updated)
│           └── offline.js # Offline SQLite API (new)
├── api/                  # PHP Backend (όπως πριν)
│   └── sync.php          # Sync endpoint (new)
└── package.json          # Updated με Electron
```

## 🚀 Εγκατάσταση

### 1. Clone Repository
```bash
git clone https://github.com/ZiSo89/organotis-vafea-pro.git
cd Οργανωτής-Βαφέα-app
git checkout electron
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Εκκίνηση Εφαρμογής

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Build Executable:**
```bash
npm run build
```

## 💾 Πώς Λειτουργεί το Sync

### Πρώτη Φορά (με Internet)

1. Πήγαινε στο **Ρυθμίσεις** > **Συγχρονισμός Δεδομένων**
2. Κάνε κλικ στο **"Λήψη από Server"**
3. Όλα τα δεδομένα κατεβαίνουν στο τοπικό SQLite

### Εργασία Offline

- Όλες οι λειτουργίες δουλεύουν κανονικά
- Οι αλλαγές αποθηκεύονται τοπικά
- Καταγράφονται ως "εκκρεμείς"

### Επαναφορά Online

1. Όταν έχεις internet, πήγαινε στα **Ρυθμίσεις**
2. Κάνε κλικ στο **"Αποστολή στον Server"**
3. Όλες οι εκκρεμείς αλλαγές σταλίδονται

### Auto-Detection

- Η εφαρμογή ανιχνεύει αυτόματα αν υπάρχει internet
- Σε **online mode**: Χρησιμοποιεί MySQL (όπως πριν)
- Σε **offline mode**: Χρησιμοποιεί SQLite

## 🔧 Τεχνικά Χαρακτηριστικά

### Electron APIs

```javascript
// Διαθέσιμα μέσω window.electronAPI

// Database
await window.electronAPI.db.getAll('clients')
await window.electronAPI.db.insert('jobs', data)
await window.electronAPI.db.update('clients', id, data)
await window.electronAPI.db.delete('jobs', id)

// Sync
await window.electronAPI.sync.download(serverUrl)
await window.electronAPI.sync.upload(serverUrl)
await window.electronAPI.sync.getStatus()
```

### Offline Service

```javascript
// Χρήση από το frontend

// Check if in Electron
if (OfflineService.isElectron()) {
  // Get data
  const result = await OfflineService.getClients();
  
  // Sync
  await OfflineService.downloadFromServer(serverUrl);
  await OfflineService.uploadToServer(serverUrl);
}
```

### Database Schema

Το SQLite schema αντιγράφει ακριβώς το MySQL με προσθήκη:
- `_sync_status`: 'synced' | 'pending' | 'deleted'
- `_sync_timestamp`: Unix timestamp της τελευταίας αλλαγής

## 📊 Sync Status

Στα Ρυθμίσεις βλέπεις:

- **Online/Offline Status** (πράσινο/κόκκινο)
- **Τελευταία Λήψη** (timestamp)
- **Τελευταία Αποστολή** (timestamp)
- **Εκκρεμείς Αλλαγές** (count)

## 🔒 Ασφάλεια

- Context Isolation enabled
- No Node Integration in renderer
- Secure IPC communication via preload script
- SQLite database στο user data folder

## 📝 Changelog

### v1.0.1 - Electron Branch

- ✅ Electron integration
- ✅ SQLite local database
- ✅ Offline functionality
- ✅ Sync with MySQL server
- ✅ Auto online/offline detection
- ✅ UI sync controls in Settings

## 🐛 Troubleshooting

### Δεν φορτώνει η βάση

1. Διέγραψε το `painter_app.db` από:
   - Windows: `%APPDATA%/organotis-vafea/`
   - Mac: `~/Library/Application Support/organotis-vafea/`
   - Linux: `~/.config/organotis-vafea/`

2. Κάνε "Λήψη από Server" ξανά

### Sync errors

- Βεβαιώσου ότι ο server είναι online
- Έλεγξε το `api/sync.php` αν δουλεύει
- Κοίταξε το console για errors

## 📞 Support

Για θέματα και bugs: [GitHub Issues](https://github.com/ZiSo89/organotis-vafea-pro/issues)

---

**Φτιάχτηκε με ❤️ για την επιχείρηση Νικολαΐδη**
