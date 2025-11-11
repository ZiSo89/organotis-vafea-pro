# 🚀 Οδηγίες Deployment στο Server

## 📦 Τι να ανεβάσεις στο Server

### ✅ Απαραίτητοι Φάκελοι/Αρχεία:

```
Οργανωτής-Βαφέα-app/
├── api/                    ← Όλα τα PHP files
├── config/                 ← database.php
├── public/                 ← Όλο το frontend
│   ├── index.html
│   ├── login.html
│   ├── manifest.json
│   ├── assets/
│   ├── docs/
│   └── src/
└── database/
    └── painter_app.sql     ← Για import μόνο
```

### ❌ ΜΗΝ ανεβάσεις:

- `electron/` - Desktop app (θα το χρησιμοποιήσουμε αργότερα για το Electron build)
- `node_modules/`
- `package.json`
- `logs/`
- `.git/`
- `.gitignore`
- Markdown files (README, DEPLOYMENT κτλ)

---

## 🔧 Βήματα Deployment

### 1. Προετοιμασία Βάσης Δεδομένων

**A. Σύνδεση στο phpMyAdmin του server**

**B. Import της βάσης:**
1. Επίλεξε τη βάση `painter_app`
2. Πήγαινε στο tab "Import"
3. Επίλεξε το αρχείο `database/painter_app.sql`
4. Κάνε click "Go"

**Σημείωση:** Το SQL αρχείο περιλαμβάνει DROP TABLE statements, οπότε θα διαγράψει και θα ξαναδημιουργήσει όλους τους πίνακες.

### 2. Upload Αρχείων στο Server

**Μέθοδος A: FTP/SFTP (FileZilla, WinSCP)**
```
Τοπικό:  C:\Users\zisog\Documents\Projects\Οργανωτής-Βαφέα\Οργανωτής-Βαφέα-app\
Server:  /public_html/ (ή /httpdocs/ ή όπως ονομάζεται)
```

**Ανέβασε:**
- Φάκελο `api/` → `/public_html/api/`
- Φάκελο `config/` → `/public_html/config/`
- Φάκελο `public/` → `/public_html/public/`

### 3. Δημιουργία Φακέλου Logs (προαιρετικό)

Αν χρειαστεί logging στο μέλλον:
```bash
mkdir logs
chmod 755 logs
```

### 4. Έλεγχος Permissions

Βεβαιώσου ότι τα αρχεία έχουν τα σωστά δικαιώματα:
```bash
# Φάκελοι
chmod 755 api/ config/ public/

# PHP files
chmod 644 api/*.php config/*.php

# HTML/JS/CSS files
chmod 644 public/*.html public/src/**/*.js public/src/**/*.css
```

### 5. Ρύθμιση Apache (.htaccess)

Δημιούργησε ένα `.htaccess` στο root directory:

```apache
# Enable mod_rewrite
RewriteEngine On

# Force HTTPS (προαιρετικό)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# CORS Headers για API
<FilesMatch "\.(php)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</FilesMatch>

# UTF-8 encoding
AddDefaultCharset UTF-8

# Disable directory browsing
Options -Indexes

# Custom error pages (προαιρετικό)
# ErrorDocument 404 /public/404.html
# ErrorDocument 500 /public/500.html
```

---

## 🌐 Πρόσβαση στην Εφαρμογή

Μετά το deployment, η εφαρμογή θα είναι διαθέσιμη στο:

```
https://your-domain.com/public/
ή
https://your-domain.com/public/login.html
```

---

## ✅ Τελικός Έλεγχος

1. **Test Database Connection:**
   - Άνοιξε: `https://your-domain.com/api/clients.php`
   - Πρέπει να επιστρέψει JSON με τους clients

2. **Test Login:**
   - Άνοιξε: `https://your-domain.com/public/login.html`
   - Δοκίμασε login

3. **Test Calendar:**
   - Άνοιξε το ημερολόγιο
   - Δοκίμασε να προσθέσεις event

---

## 🔒 Ασφάλεια

### Σημαντικό:
- ✅ Το `config/database.php` έχει ήδη τα σωστά credentials
- ✅ Τα passwords είναι ασφαλή στο server
- ⚠️ **ΜΗΝ** ανεβάσεις το `.git/` directory (περιέχει ιστορικό)

---

## 📱 Electron Desktop App (Μελλοντικό)

Το Electron app θα δημιουργηθεί αργότερα και θα:
- Τρέχει τοπικά στον υπολογιστή
- Συνδέεται με το **server API** για sync
- Λειτουργεί και **offline** με τοπική SQLite βάση

**Δομή για Electron:**
```
electron/           ← Desktop app code
├── main.js        ← Electron main process
├── preload.js     ← Preload script
└── db/            ← SQLite local database
```

Αυτό ΔΕΝ ανεβαίνει στο server - χρησιμοποιείται μόνο για τοπικό build.

---

## 🆘 Troubleshooting

### Πρόβλημα: Database connection error
**Λύση:** Έλεγξε ότι:
- Το `config/database.php` έχει τα σωστά credentials
- Ο χρήστης `painter_user` έχει δικαιώματα στη βάση
- Η βάση `painter_app` υπάρχει

### Πρόβλημα: 404 Not Found στα API calls
**Λύση:**
- Έλεγξε ότι ο φάκελος `api/` είναι στο σωστό path
- Έλεγξε το `.htaccess` αν υπάρχει

### Πρόβλημα: Greek characters εμφανίζονται λάθος
**Λύση:**
- Βεβαιώσου ότι η βάση χρησιμοποιεί `utf8mb4_unicode_ci`
- Έλεγξε ότι τα PHP files είναι UTF-8 encoded

---

**Καλή επιτυχία! 🎉**
