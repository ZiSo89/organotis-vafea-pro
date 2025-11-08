# Οργανωτής Βαφέα Pro - Deployment Guide

## 📋 Περιεχόμενα
1. [Προαπαιτούμενα](#προαπαιτούμενα)
2. [Εγκατάσταση Database](#εγκατάσταση-database)
3. [Ρύθμιση API](#ρύθμιση-api)
4. [Upload Files](#upload-files)
5. [Δοκιμή Εφαρμογής](#δοκιμή-εφαρμογής)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Προαπαιτούμενα

### Server Requirements
- **Web Server**: Apache/Nginx με PHP support
- **PHP**: Version 7.4+ (προτιμώμενο 8.0+)
- **Database**: MariaDB 10.3+ ή MySQL 5.7+
- **SSL Certificate**: HTTPS (Let's Encrypt δωρεάν)
- **Plesk**: (προαιρετικό αλλά συνιστάται)

### PHP Extensions Required
- PDO
- PDO_MySQL
- mbstring
- json
- openssl

---

## 📦 Εγκατάσταση Database

### Βήμα 1: Δημιουργία Database μέσω Plesk

1. Σύνδεση στο **Plesk Panel**
2. Πήγαινε στο **Databases** → **Add Database**
3. Δημιούργησε νέα βάση δεδομένων:
   - **Database name**: `painter_app`
   - **User**: `painter_user` (ή οποιοδήποτε όνομα)
   - **Password**: Ισχυρό password (κράτησέ το!) A9PLrn$nhtbmu31#

### Βήμα 2: Import Database Schema

1. Στο Plesk, άνοιξε το **phpMyAdmin**
2. Επίλεξε τη βάση `painter_app`
3. Πήγαινε στην καρτέλα **Import**
4. Ανέβασε το αρχείο `database.sql`
5. Πάτησε **Go**

**Εναλλακτικά μέσω SSH:**
```bash
mysql -u painter_user -p painter_app < database.sql
```

---

## ⚙️ Ρύθμιση API

### Βήμα 1: Ενημέρωση Database Credentials

Άνοιξε το αρχείο `api/config.php` και άλλαξε:

```php
// Database credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'painter_app');
define('DB_USER', 'painter_user');          // ΤΟ USERNAME ΣΟΥ
define('DB_PASS', 'your_password_here');    // ΤΟ PASSWORD ΣΟΥ
```

### Βήμα 2: Ενημέρωση CORS Origin

Στο ίδιο αρχείο:
```php
define('ALLOWED_ORIGIN', 'https://nikolpaintmaster.e-gata.gr');
```

### Βήμα 3: Ενημέρωση Auth Credentials

Άνοιξε το αρχείο `src/js/auth.js` και άλλαξε:

```javascript
this.credentials = {
    username: 'nikolpaint',              // ΑΛΛΑΞΕ ΤΟ!
    password: 'NikolPaint2024!SecurePass' // ΑΛΛΑΞΕ ΤΟ!
};
```

---

## 🚀 Upload Files

### Μέθοδος 1: Μέσω Plesk File Manager

1. Σύνδεση στο **Plesk**
2. **Domains** → `nikolpaintmaster.e-gata.gr` → **Files**
3. Πήγαινε στον **httpdocs/** φάκελο (ή public_html/)
4. Ανέβασε **όλα** τα αρχεία του project:
   - `index.html`
   - `login.html`
   - `robots.txt`
   - `.htaccess`
   - Φάκελοι: `src/`, `api/`, `assets/`
   - **ΟΧΙ**: `node_modules/`, `.git/`, `database.sql`

### Μέθοδος 2: Μέσω FTP

1. Χρησιμοποίησε FTP client (FileZilla, WinSCP)
2. Σύνδεση με τα credentials από Plesk
3. Upload στον **httpdocs/** φάκελο

### Μέθοδος 3: Μέσω Git (Προτιμώμενο)

```bash
# SSH στον server
ssh your_username@nikolpaintmaster.e-gata.gr

# Clone το repository
cd ~/httpdocs/
git clone https://github.com/ZiSo89/organotis-vafea-pro.git .
git checkout nikolpaintmaster

# Αφαίρεση .git folder για ασφάλεια
rm -rf .git
```

---

## 🔒 Ασφάλεια & Permissions

### Ορισμός File Permissions

```bash
# Στον server μέσω SSH:
cd ~/httpdocs/

# Files readable by web server
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# API files
chmod 755 api/
chmod 644 api/*.php

# Protect sensitive files
chmod 600 api/config.php
```

### Δημιουργία .htpasswd (προαιρετικό - extra security layer)

```bash
# Create password file
htpasswd -c ~/httpdocs/.htpasswd nikolpaint
# Enter password when prompted
```

Άνοιξε το `.htaccess` και uncomment:
```apache
# AuthType Basic
# AuthName "Restricted Access"
# AuthUserFile /path/to/.htpasswd
# Require valid-user
```

---

## ✅ Δοκιμή Εφαρμογής

### 1. Test Server Status

Άνοιξε στον browser:
```
https://nikolpaintmaster.e-gata.gr/api/ping.php
```

Πρέπει να δεις:
```json
{
  "status": "ok",
  "timestamp": 1699459200,
  "datetime": "2024-11-08 12:00:00",
  "version": "1.0",
  "message": "Server is online and ready"
}
```

### 2. Test Login

Πήγαινε στο:
```
https://nikolpaintmaster.e-gata.gr/login.html
```

Login με τα credentials που όρισες στο `auth.js`

### 3. Test Functionality

- Δοκίμασε να δημιουργήσεις πελάτη
- Δοκίμασε να κάνεις εξαγωγή backup
- Δοκίμασε offline mode (κλείσε το internet)

---

## 🛠️ Troubleshooting

### Πρόβλημα: "Database connection failed"

**Λύση:**
1. Έλεγξε ότι το database υπάρχει στο phpMyAdmin
2. Έλεγξε username/password στο `api/config.php`
3. Έλεγξε ότι ο database user έχει permissions

```sql
GRANT ALL PRIVILEGES ON painter_app.* TO 'painter_user'@'localhost';
FLUSH PRIVILEGES;
```

### Πρόβλημα: CORS errors στο console

**Λύση:**
Έλεγξε το `api/config.php`:
```php
define('ALLOWED_ORIGIN', 'https://nikolpaintmaster.e-gata.gr');
```

### Πρόβλημα: 500 Internal Server Error

**Λύση:**
1. Έλεγξε PHP error logs στο Plesk
2. Έλεγξε file permissions
3. Έλεγξε ότι όλες οι PHP extensions είναι ενεργές

```bash
# Check PHP version
php -v

# Check installed extensions
php -m | grep -i pdo
```

### Πρόβλημα: Login δεν δουλεύει

**Λύση:**
1. Έλεγξε browser console για errors
2. Έλεγξε ότι τα credentials στο `src/js/auth.js` είναι σωστά
3. Clear browser cache

---

## 📱 SSL Certificate Setup (HTTPS)

### Μέσω Plesk:

1. **Domains** → `nikolpaintmaster.e-gata.gr`
2. **SSL/TLS Certificates**
3. **Install** → **Let's Encrypt** (δωρεάν)
4. Επίλεξε: "Secure the domain" και "Redirect HTTP to HTTPS"

---

## 🔄 Updates & Maintenance

### Ενημέρωση Εφαρμογής

```bash
# Backup current version
cp -r ~/httpdocs ~/backups/painter_app_$(date +%Y%m%d)

# Pull latest changes
cd ~/httpdocs
git pull origin nikolpaintmaster
```

### Database Backup

**Μέσω Plesk:**
1. **Databases** → `painter_app`
2. **Export Dump**

**Μέσω SSH:**
```bash
mysqldump -u painter_user -p painter_app > backup_$(date +%Y%m%d).sql
```

---

## 📞 Support

Για οποιαδήποτε βοήθεια:
- Check logs: Plesk → **Logs** → **Error Log**
- API logs: `api/error.log`
- Browser console: F12 → Console tab

---

## 🎉 Ολοκληρώθηκε!

Η εφαρμογή είναι τώρα online στο:
**https://nikolpaintmaster.e-gata.gr**

Features:
- ✅ Dual-mode (Online/Offline)
- ✅ Auto-sync όταν επανέρχεται το internet
- ✅ Local backup/restore
- ✅ Protected από search engines
- ✅ Login authentication
- ✅ Server-side database

**Username**: nikolpaint (όπως το όρισες)  
**Password**: (όπως το όρισες)
