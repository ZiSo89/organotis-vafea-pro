# Server Configuration - Electron App

## 📡 Διαμόρφωση Server URL

Το Electron app υποστηρίζει τώρα δυναμική διαμόρφωση του Server URL για συγχρονισμό δεδομένων.

### 🎯 Χαρακτηριστικά

- ✅ **Localhost Development**: `http://localhost:8000` (προεπιλογή)
- ✅ **Online Production**: `https://yourserver.com` ή άλλο URL
- ✅ **Αποθήκευση στο localStorage**: Το URL διατηρείται μεταξύ των sessions
- ✅ **Real-time validation**: Έλεγχος εγκυρότητας URL πριν την αποθήκευση
- ✅ **Εμφάνιση στο status**: Προβολή του ενεργού server URL στη συγχρονισμό

### 🔧 Χρήση

1. **Άνοιγμα Settings**
   - Πατήστε στο μενού "Ρυθμίσεις"
   - Μεταβείτε στην ενότητα "Συγχρονισμός Δεδομένων"

2. **Ρύθμιση Server URL**
   ```
   Localhost:  http://localhost:8000
   Online:     https://yourserver.com
   Custom:     http://192.168.1.100:8000
   ```

3. **Αποθήκευση**
   - Εισάγετε το URL στο input field
   - Πατήστε "Αποθήκευση"
   - Το URL θα επικυρωθεί και θα αποθηκευτεί

4. **Συγχρονισμός**
   - Πατήστε "Λήψη από Server" για download
   - Πατήστε "Αποστολή στον Server" για upload
   - Το app θα χρησιμοποιήσει το αποθηκευμένο URL

### 📋 Παραδείγματα

#### Development (Local Server)
```
Server URL: http://localhost:8000
Description: Τοπικός XAMPP/WAMP server για ανάπτυξη
```

#### Production (Online Server)
```
Server URL: https://organotis-vafea.com
Description: Παραγωγικός server με HTTPS
```

#### Local Network
```
Server URL: http://192.168.1.100:8000
Description: Server στο τοπικό δίκτυο (LAN)
```

### 🔒 Ασφάλεια

- **HTTPS Recommended**: Για παραγωγή προτείνεται HTTPS
- **Validation**: Το app ελέγχει την εγκυρότητα του URL
- **Error Handling**: Αν το URL είναι μη έγκυρο, εμφανίζεται μήνυμα σφάλματος

### 🐛 Troubleshooting

**Πρόβλημα**: "Σφάλμα λήψης: Network error"
- **Λύση**: Ελέγξτε αν ο server είναι online
- **Λύση**: Βεβαιωθείτε ότι το URL είναι σωστό
- **Λύση**: Ελέγξτε το firewall/antivirus

**Πρόβλημα**: "Μη έγκυρο URL"
- **Λύση**: Το URL πρέπει να ξεκινά με `http://` ή `https://`
- **Λύση**: Παράδειγμα: `http://localhost:8000` (ΟΧΙ `localhost:8000`)

**Πρόβλημα**: "CORS Error"
- **Λύση**: Ο server πρέπει να επιτρέπει requests από το Electron app
- **Λύση**: Προσθέστε CORS headers στο PHP backend

### 💾 Storage Location

Το Server URL αποθηκεύεται στο `localStorage`:
```javascript
Key: 'syncServerUrl'
Default: 'http://localhost:8000'
```

### 🔄 Αλλαγή Server

Μπορείτε να αλλάξετε το server οποτεδήποτε:
1. Εισάγετε νέο URL
2. Αποθηκεύστε
3. Πατήστε "Λήψη από Server" για sync με το νέο server

### 📊 Sync Status

Το status panel δείχνει:
- **Κατάσταση**: Online/Offline
- **Server URL**: Το ενεργό URL
- **Τελευταία Λήψη**: Χρόνος τελευταίου download
- **Τελευταία Αποστολή**: Χρόνος τελευταίου upload
- **Εκκρεμείς Αλλαγές**: Αριθμός μη συγχρονισμένων εγγραφών

### 🎨 UI Components

```html
<!-- Server URL Input -->
<input type="text" id="serverUrlInput" placeholder="π.χ. http://localhost:8000" />
<button id="saveServerUrlBtn">Αποθήκευση</button>

<!-- Status Display -->
<span id="currentServerUrl">http://localhost:8000</span>
```

### 🔌 API Endpoints

Το app χρησιμοποιεί τα εξής endpoints:

**Download**:
```
GET {serverUrl}/api/clients.php?action=list
GET {serverUrl}/api/jobs.php?action=list
GET {serverUrl}/api/workers.php?action=list
... (κλπ)
```

**Upload**:
```
POST {serverUrl}/api/sync.php
Body: { table: 'clients', changes: [...] }
```

### ⚙️ Configuration Methods

```javascript
// Get current server URL
const url = Settings.getServerUrl();

// Set server URL
Settings.setServerUrl('https://yourserver.com');

// Save from input
Settings.saveServerUrl();
```

### 🚀 Migration Guide

#### From Localhost to Production

1. **Backup Data**
   ```
   Ρυθμίσεις → Λήψη Αντιγράφου Ασφαλείας
   ```

2. **Configure Production URL**
   ```
   Server URL: https://yourserver.com
   Αποθήκευση
   ```

3. **Initial Download**
   ```
   Λήψη από Server → Download all data
   ```

4. **Verify**
   ```
   Ελέγξτε ότι όλα τα δεδομένα εμφανίζονται σωστά
   ```

#### From Production to Localhost

1. **Upload Pending Changes**
   ```
   Αποστολή στον Server → Upload εκκρεμών αλλαγών
   ```

2. **Switch to Localhost**
   ```
   Server URL: http://localhost:8000
   Αποθήκευση
   ```

3. **Download from Localhost**
   ```
   Λήψη από Server → Download από τοπικό server
   ```

### 📝 Notes

- Το URL αποθηκεύεται αυτόματα κατά την επιτυχή σύνδεση
- Μπορείτε να δουλεύετε offline και να κάνετε sync αργότερα
- Οι εκκρεμείς αλλαγές διατηρούνται μέχρι το επόμενο upload
- Το app υποστηρίζει και HTTP και HTTPS

### 🎯 Best Practices

1. **Development**: Χρησιμοποιήστε `http://localhost:8000`
2. **Production**: Χρησιμοποιήστε `https://` για ασφάλεια
3. **Testing**: Δοκιμάστε το URL πριν το αποθηκεύσετε
4. **Backup**: Κάντε backup πριν αλλάξετε server
5. **Sync Often**: Συγχρονίζετε τακτικά για να αποφύγετε conflicts

---

**Version**: 1.0  
**Last Updated**: 2025-11-11  
**Author**: GitHub Copilot
