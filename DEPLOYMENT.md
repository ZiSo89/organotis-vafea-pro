# 🚀 Deployment Guide - nikolpaintmaster.e-gata.gr

## 📁 Δομή Αρχείων

### Local Development (τώρα)
```
htdocs/
├── .htaccess                           # Redirect localhost/ -> nikolpaintmaster.e-gata.gr/
├── nikolpaintmaster.e-gata.gr/
│   ├── .htaccess                       # Local config (RewriteBase /nikolpaintmaster.e-gata.gr/)
│   ├── .htaccess.production           # Production config (RewriteBase /)
│   ├── api/
│   ├── config/
│   └── public/
│       ├── index.html
│       ├── assets/
│       ├── src/
│       └── docs/
```

### Production (μετά το deployment)
```
htdocs/                                 # Root directory στον server
├── .htaccess                          # Rename .htaccess.production -> .htaccess
├── api/
├── config/
└── public/
    ├── index.html
    ├── assets/
    ├── src/
    └── docs/
```

---

## 🔧 Local Development URLs

Τώρα μπορείς να χρησιμοποιήσεις όλα αυτά:

✅ `http://localhost/`
   → Auto-redirect στο `http://localhost/nikolpaintmaster.e-gata.gr/`

✅ `http://localhost/nikolpaintmaster.e-gata.gr/`
   → Ανοίγει το `public/index.html`

✅ `http://localhost/nikolpaintmaster.e-gata.gr/public/`
   → Direct access στο public folder

✅ `http://localhost/nikolpaintmaster.e-gata.gr/src/js/app.js`
   → Auto-serve από το `public/src/js/app.js`

---

## 📤 Production Deployment Steps

### Βήμα 1: Ανέβασμα αρχείων
```bash
# Ανέβασε όλα τα αρχεία από το nikolpaintmaster.e-gata.gr/ 
# κατευθείαν στο root directory (htdocs/) του production server
```

### Βήμα 2: Ενεργοποίηση production .htaccess
```bash
# SSH στον server:
cd /path/to/htdocs/

# Διέγραψε το local .htaccess
rm .htaccess

# Μετονόμασε το production
mv .htaccess.production .htaccess
```

### Βήμα 3: Ενεργοποίηση HTTPS
Άνοιξε το `.htaccess` και ξε-comment τις γραμμές:
```apache
# Force HTTPS (ενεργοποίησε σε production)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Βήμα 4: Έλεγχος
```
✓ https://nikolpaintmaster.e-gata.gr/
✓ https://nikolpaintmaster.e-gata.gr/src/js/app.js
✓ https://nikolpaintmaster.e-gata.gr/api/customers
```

---

## 🔄 Επιστροφή από Production σε Local

Αν κατεβάσεις τα αρχεία από production:

1. Αντέγραψε το `.htaccess.production` ως backup
2. Επανάφερε το local `.htaccess`:
   ```bash
   # Αντίγραψε το περιεχόμενο του .htaccess από αυτό το guide
   # ή χρησιμοποίησε git checkout
   ```
3. Άλλαξε το `RewriteBase /` → `RewriteBase /nikolpaintmaster.e-gata.gr/`

---

## 🛠️ Troubleshooting

### "500 Internal Server Error"
```bash
# Έλεγξε το Apache error log:
tail -f /var/log/apache2/error.log

# Συνήθεις λύσεις:
# 1. Ενεργοποίησε mod_rewrite
sudo a2enmod rewrite
sudo service apache2 restart

# 2. Επέτρεψε .htaccess overrides
# Στο Apache config (sites-available/):
<Directory /var/www/html>
    AllowOverride All
</Directory>
```

### "404 Not Found" σε static files
```bash
# Έλεγξε permissions:
chmod -R 755 public/
find public/ -type f -exec chmod 644 {} \;
```

### Redirects δεν δουλεύουν
```bash
# Έλεγξε αν το mod_rewrite είναι ενεργό:
apache2ctl -M | grep rewrite

# Αν δεν υπάρχει:
sudo a2enmod rewrite
sudo service apache2 restart
```

---

## 📝 Git Ignore Rules

Πρόσθεσε στο `.gitignore`:
```
# Local development only
.htaccess

# Keep production template
!.htaccess.production
```

Στο production θα χρησιμοποιείς το `.htaccess.production`

---

## ✅ Checklist για Production

- [ ] Όλα τα αρχεία από `nikolpaintmaster.e-gata.gr/` ανεβασμένα στο root
- [ ] `.htaccess.production` μετονομάστηκε σε `.htaccess`
- [ ] HTTPS ενεργοποιημένο στο `.htaccess`
- [ ] `mod_rewrite` ενεργό στον Apache
- [ ] `AllowOverride All` στο Apache config
- [ ] Database credentials ενημερωμένα στο `config/database.php`
- [ ] File permissions: 755 για directories, 644 για files
- [ ] SSL certificate εγκατεστημένο (Let's Encrypt recommended)

---

**Τελευταία ενημέρωση**: 12 Νοεμβρίου 2025
