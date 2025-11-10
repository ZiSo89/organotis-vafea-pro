# Οργανωτής Βαφέα Pro - Production Setup

## 📋 Απαιτήσεις

- PHP 8.0+
- MySQL 8.0+
- Apache/Nginx web server

## 🚀 Εγκατάσταση

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

## 🔐 Ασφάλεια

### Αλλαγή Password Σύνδεσης

Επεξεργασία `api/auth.php`:

```php
if ($username === 'admin' && $password === 'ΤΟ_ΝΕΟ_ΣΑΣ_PASSWORD') {
    // ...
}
```

### Permissions

```bash
chmod 755 public/
chmod 644 public/index.html
chmod 750 api/
chmod 640 config/database.php
```

## 📱 Δοκιμή

1. Ανοίξτε browser στο: `http://localhost:8000`
2. Login με username: `admin`, password: `admin` (ΝΑ ΑΛΛΑΞΕΙ!)
3. Δοκιμάστε όλες τις λειτουργίες

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

## 📞 Support

Για βοήθεια ή αναφορά προβλημάτων, επικοινωνήστε με τον developer.

---
**Version:** 2.0.0  
**Last Updated:** 10/11/2025
