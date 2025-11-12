# Routing & Server Setup

## Πρόβλημα: Γιατί δε δουλεύει το http://localhost:8000/

### Απάντηση

Το `.htaccess` αρχείο **ΔΕΝ λειτουργεί** με τον PHP built-in development server.

**Το `.htaccess` λειτουργεί ΜΟΝΟ με Apache server!**

## Λύση

### Για Local Development (PHP Built-in Server)

Χρησιμοποίησε το `router.php`:

```bash
php -S localhost:8000 router.php
```

Το `router.php` κάνει τα εξής:
- ✅ Redirect από `/` στο `/public/login.html`
- ✅ Routing για API calls (`/api/*`)
- ✅ Serving static files από το `/public/`
- ✅ SPA routing για το frontend
- ✅ Σωστά error pages

### Για Production (Apache Server)

Χρησιμοποίησε το `.htaccess`:
- Το `.htaccess` ρυθμίζει τον Apache server
- Κάνει τα ίδια redirects και routing
- Προσθέτει security headers
- Ενεργοποιεί compression και caching

## Τρόποι εκτέλεσης

### 1. PHP Built-in Server (Recommended για Development)

```bash
# Από το root του project
php -S localhost:8000 router.php
```

Τότε:
- `http://localhost:8000/` → Πηγαίνει στο login
- `http://localhost:8000/public/index.html` → Dashboard (αν είσαι logged in)
- `http://localhost:8000/api/clients` → API endpoint

### 2. XAMPP Apache Server

```bash
# Βάλε το project στο htdocs
C:\xampp\htdocs\organotis-vafea\

# Άνοιξε τον Apache από το XAMPP Control Panel
# Πήγαινε στο browser:
http://localhost/organotis-vafea/
```

Τότε το `.htaccess` θα δουλέψει αυτόματα.

### 3. Electron App

Το Electron app χρησιμοποιεί δικό του embedded server:

```bash
npm start
```

## Διαφορές Router vs .htaccess

| Feature | router.php | .htaccess |
|---------|-----------|-----------|
| PHP Built-in Server | ✅ ΝΑΙ | ❌ ΟΧΙ |
| Apache Server | ❌ ΟΧΙ | ✅ ΝΑΙ |
| Root redirect | ✅ | ✅ |
| API routing | ✅ | ✅ |
| Static files | ✅ | ✅ |
| Security headers | ❌ | ✅ |
| Compression | ❌ | ✅ |
| Caching | ❌ | ✅ |

## Testing

### Δοκίμασε ότι δουλεύει:

```bash
# Ξεκίνα τον server
php -S localhost:8000 router.php

# Σε άλλο terminal:
# Test root redirect
curl -L http://localhost:8000/

# Test API
curl http://localhost:8000/api/clients

# Test static file
curl http://localhost:8000/public/index.html
```

## Troubleshooting

### Πρόβλημα: "404 Not Found"
**Λύση:** Βεβαιώσου ότι τρέχεις με `router.php`:
```bash
php -S localhost:8000 router.php
```

### Πρόβλημα: "API endpoint not found"
**Λύση:** Έλεγξε ότι το API αρχείο υπάρχει στον φάκελο `/api/`

### Πρόβλημα: "CORS errors"
**Λύση:** Τα API αρχεία έχουν ήδη CORS headers:
```php
header('Access-Control-Allow-Origin: *');
```

## Σημειώσεις

⚠️ **Development vs Production:**
- Development: Χρησιμοποίησε `router.php` με PHP built-in server
- Production: Χρησιμοποίησε `.htaccess` με Apache

✅ **Και τα δύο αρχεία είναι ενημερωμένα** και έτοιμα για χρήση!
