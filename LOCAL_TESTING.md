# Local Testing με XAMPP - Quick Start Guide

## 📥 **1. Install XAMPP**

1. Download: https://www.apachefriends.org/download.html
2. Install στο `C:\xampp\` (default)
3. Άνοιξε **XAMPP Control Panel**

---

## ⚙️ **2. Setup Project**

### Αντιγραφή Files:
```powershell
# Αντίγραψε ΟΛΟ το project folder στο:
C:\xampp\htdocs\painter-app\

# Ή φτιάξε symlink:
mklink /D "C:\xampp\htdocs\painter-app" "C:\Users\zisog\Documents\Projects\Οργανωτής-Βαφέα\Οργανωτής-Βαφέα-app"
```

---

## 🗄️ **3. Setup Database**

### A. Start MySQL:
1. XAMPP Control Panel → **MySQL** → **Start**
2. Πάτα **Admin** (ανοίγει phpMyAdmin)

### B. Create Database:
1. phpMyAdmin → **New** → Database name: `painter_app`
2. **Import** → Choose file: `database.sql`
3. Click **Go**

### C. Create User:
```sql
-- στο phpMyAdmin → SQL tab:
CREATE USER 'painter_user'@'localhost' IDENTIFIED BY 'A9PLrn$nhtbmu31#';
GRANT ALL PRIVILEGES ON painter_app.* TO 'painter_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🔧 **4. Configure App**

### Update `api/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'painter_app');
define('DB_USER', 'painter_user');
define('DB_PASS', 'A9PLrn$nhtbmu31#');
```

### Update `src/js/dataService.js` (line 3):
```javascript
this.apiUrl = 'http://localhost/painter-app/api'; // για XAMPP
// ή
this.apiUrl = 'http://localhost:8000/api'; // για PHP built-in server
```

### Update CORS in `api/config.php` (line 19):
```php
define('ALLOWED_ORIGIN', 'http://localhost'); // για development
```

---

## 🚀 **5. Test the App**

### Start Services:
1. XAMPP Control Panel:
   - ✅ **Apache** → Start
   - ✅ **MySQL** → Start

### Open Browser:
```
http://localhost/painter-app/
```

### Test API:
```
http://localhost/painter-app/api/ping.php
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": 1699459200,
  "datetime": "2024-11-08 12:00:00",
  "version": "1.0",
  "server": "Οργανωτής Βαφέα Pro API"
}
```

### Test Login:
```
http://localhost/painter-app/login.html
```

**Credentials** (από `src/js/auth.js`):
- Username: `nikolpaint`
- Password: `NikolPaint2024!SecurePass`

---

## 🐛 **Troubleshooting**

### Error: "Database connection failed"
```powershell
# Check MySQL is running:
# XAMPP → MySQL → Status should be green

# Check credentials in api/config.php
# Try connecting via phpMyAdmin
```

### Error: "Port 80 already in use"
```
# Skype or IIS might use port 80
# Solution 1: Close Skype/IIS
# Solution 2: Change Apache port in XAMPP config
```

### Error: CORS blocked
```javascript
// In api/config.php, change:
define('ALLOWED_ORIGIN', '*'); // Allow all (ONLY for development!)
```

### Error: 404 on API calls
```
# Make sure folder structure is:
C:\xampp\htdocs\painter-app\
    ├── index.html
    ├── login.html
    ├── api\
    │   ├── config.php
    │   ├── ping.php
    │   └── clients.php
    └── src\
```

---

## 📝 **Quick Commands**

```powershell
# Check PHP version
php -v

# Check MySQL is running
netstat -ano | findstr :3306

# Test PHP file directly
php api/ping.php

# View PHP errors
# Check: C:\xampp\apache\logs\error.log
```

---

## 🎯 **Development vs Production**

### Development (Local):
```javascript
// src/js/dataService.js
this.apiUrl = 'http://localhost/painter-app/api';

// api/config.php
define('ALLOWED_ORIGIN', 'http://localhost');
```

### Production (Server):
```javascript
// src/js/dataService.js
this.apiUrl = 'https://nikolpaintmaster.e-gata.gr/api';

// api/config.php
define('ALLOWED_ORIGIN', 'https://nikolpaintmaster.e-gata.gr');
```

---

## ✅ **Ready to Test!**

1. ✅ XAMPP running (Apache + MySQL)
2. ✅ Database imported
3. ✅ Config updated
4. ✅ Open: `http://localhost/painter-app/`
5. ✅ Login → Start testing!

---

**Tip:** Keep XAMPP Control Panel open να βλέπεις το status των services!
