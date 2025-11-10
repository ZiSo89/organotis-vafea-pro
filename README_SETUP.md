# Οργανωτής Βαφέα Pro - Production Setup

## 📋 Απαιτήσεις

- PHP 8.0+
- MySQL 8.0+
- Apache/Nginx web server (ή Plesk)

## 🚀 Εγκατάσταση σε Plesk Server

### 1. Δημιουργία Database

1. Συνδεθείτε στο **Plesk Panel**
2. Πηγαίνετε στο domain σας → **Databases** → **Add Database**
3. Ονομάστε τη βάση: `painter_app`
4. Character set: **utf8mb4**
5. Collation: **utf8mb4_unicode_ci**
6. Δημιουργήστε χρήστη με πλήρη δικαιώματα

### 2. Upload Αρχείων

1. Συνδεθείτε στο **File Manager** (ή χρησιμοποιήστε FTP/SFTP)
2. Ανεβάστε ΟΛΑ τα αρχεία στον φάκελο **httpdocs** (ή public_html)
3. Δομή που πρέπει να έχετε:
   ```
   httpdocs/
   ├── .htaccess
   ├── api/
   ├── config/
   ├── database/
   ├── public/
   │   ├── index.html
   │   ├── login.html
   │   └── robots.txt
   ├── electron-main.js
   ├── package.json
   └── README_SETUP.md
   ```

### 3. Import Database Schema

**Μέσω Plesk phpMyAdmin:**
1. Databases → **phpMyAdmin**
2. Επιλέξτε τη βάση `painter_app`
3. Πηγαίνετε στο **Import**
4. Επιλέξτε το αρχείο `database/schema.sql`
5. Click **Go**

**Μέσω SSH (αν έχετε πρόσβαση):**
```bash
mysql -u your_db_user -p painter_app < database/schema.sql
```

### 4. Διαμόρφωση Database Connection

Επεξεργασία του αρχείου `config/database.php`:

```php
<?php
$dsn = "mysql:host=localhost;port=3306;dbname=painter_app;charset=utf8mb4";
$username = 'your_plesk_db_username';  // Αλλάξτε με το username από Plesk
$password = 'your_plesk_db_password';  // Αλλάξτε με το password από Plesk
```

### 5. Ρυθμίσεις Permissions (μέσω SSH)

```bash
chmod 755 public/
chmod 644 public/index.html
chmod 750 api/
chmod 640 config/database.php
chmod 640 .htaccess
```

### 6. Import Test Data (Προαιρετικό)

**Μέσω SSH:**
```bash
cd database
php import_data.php
```

**Μέσω Plesk PHP:**
1. File Manager → `database/import_data.php`
2. Click **Run**

### 7. Έλεγχος .htaccess

Το αρχείο `.htaccess` πρέπει να είναι στο **root directory** (httpdocs/).

Αν το Plesk δεν το διαβάζει, πηγαίνετε στο:
**Apache & nginx Settings** → **Additional Apache directives** και προσθέστε:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # API endpoints
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^api/([a-zA-Z_]+)$ api/$1.php [L,QSA]
    
    # Frontend routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteRule ^(.*)$ public/index.html [L]
</IfModule>
```

### 8. SSL Certificate (HTTPS)

1. Plesk → **SSL/TLS Certificates**
2. Ενεργοποιήστε **Let's Encrypt** (δωρεάν)
3. Redirect HTTP → HTTPS: **ON**

---

## 🚀 Εγκατάσταση σε Local/VPS (Χωρίς Plesk)

### 1. Database Setup

```bash
# Δημιουργία βάσης δεδομένων
mysql -u root -p
CREATE DATABASE painter_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Import Schema

```bash
# Import του schema
mysql -u root -p painter_app < database/schema.sql
```

### 3. Διαμόρφωση Database Connection

Επεξεργασία του αρχείου `config/database.php`:

```php
$dsn = "mysql:host=localhost;port=3306;dbname=painter_app;charset=utf8mb4";
$username = 'root';
$password = 'your_password_here';
```

### 4. Import Test Data (Προαιρετικό)

```bash
# Για δοκιμή με test data
php database/import_data.php
```

### 5. Web Server Configuration

**Apache (.htaccess ήδη υπάρχει):**
```apache
RewriteEngine On
RewriteBase /

# API endpoints
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/$1.php [L]

# Frontend routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ public/index.html [L]
```

**Nginx:**
```nginx
location /api/ {
    try_files $uri $uri.php;
    fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
    fastcgi_index index.php;
    include fastcgi_params;
}

location / {
    try_files $uri $uri/ /public/index.html;
}
```

---

## 🔐 Ασφάλεια

### Αλλαγή Password Σύνδεσης

Επεξεργασία `api/auth.php`:

```php
if ($username === 'admin' && $password === 'ΤΟ_ΝΕΟ_ΣΑΣ_PASSWORD') {
    // ...
}
```

⚠️ **ΣΗΜΑΝΤΙΚΟ**: Αλλάξτε το default password `admin` πριν την παραγωγή!

### Permissions

```bash
chmod 755 public/
chmod 644 public/index.html
chmod 750 api/
chmod 640 config/database.php
```

---

## 📱 Δοκιμή

1. Ανοίξτε browser στο: `https://yourdomain.com` (ή `http://localhost:8000` για local)
2. Login με username: `admin`, password: `admin` (ΝΑ ΑΛΛΑΞΕΙ!)
3. Δοκιμάστε όλες τις λειτουργίες

---

## 🐛 Troubleshooting

### 404 Errors στα API endpoints

**Λύση 1:** Ελέγξτε αν το `.htaccess` λειτουργεί:
```bash
# Δημιουργήστε test.php στο root:
<?php phpinfo(); ?>
# Αν το βλέπετε, το PHP δουλεύει
```

**Λύση 2:** Ενεργοποιήστε mod_rewrite στο Plesk:
- Apache & nginx Settings → Additional directives

### Database Connection Errors

Ελέγξτε:
1. Το `config/database.php` έχει τα σωστά credentials από Plesk
2. Ο χρήστης έχει δικαιώματα στη βάση
3. Το database character set είναι utf8mb4

### Greek Characters εμφανίζονται λάθος

Ελέγξτε:
1. Database collation: **utf8mb4_unicode_ci**
2. `config/database.php` έχει `charset=utf8mb4`
3. Όλα τα αρχεία saved ως UTF-8

---

## 🎯 Χαρακτηριστικά

- ✅ Διαχείριση Πελατών
- ✅ Διαχείριση Εργατών
- ✅ Διαχείριση Εργασιών
- ✅ Διαχείριση Αποθέματος
- ✅ Προσφορές & Τιμολόγια
- ✅ Χάρτης με Google Maps
- ✅ Στατιστικά & Αναφορές
- ✅ Dark/Light Theme
- ✅ Πλήρης UTF-8 υποστήριξη (Ελληνικά)

---

## 📞 Support

Για βοήθεια ή αναφορά προβλημάτων, επικοινωνήστε με τον developer.

---
**Version:** 2.0.0  
**Last Updated:** 10/11/2025
