# Οδηγός Deployment (`deploy.ps1`)

Οδηγός για το πώς ανεβαίνει η **web** έκδοση στο production (`https://nikolpaintmaster.e-gata.gr`, Plesk).

> Το `deploy.ps1` αφορά **μόνο** τη web εφαρμογή. Η desktop (Electron) build γίνεται ξεχωριστά με `npm run build`.

---

## Τι κάνει με μια ματιά

Η εφαρμογή έχει 2 git branches:

- **`develop`** → εκεί δουλεύεις/κάνεις commit καθημερινά.
- **`deploy`** → «καθαρό» branch μόνο με ό,τι χρειάζεται το production. Το Plesk τραβάει (pull) από αυτό.

Το `deploy.ps1` παίρνει τις αλλαγές από το `develop`, φτιάχνει το `deploy` branch για production, και το σπρώχνει στο GitHub. **Δεν** ανεβάζει μόνο του στον server — το τελευταίο βήμα (Plesk → Pull) το κάνεις εσύ.

---

## Βήμα-βήμα τι εκτελεί το script

| Βήμα | Τι κάνει |
|------|----------|
| **0. SSH** | Ξεκινά το `ssh-agent`, φορτώνει το SSH key (`~/.ssh/ZiSo_Dell`), τεστάρει σύνδεση στο GitHub. |
| **1. Branch check** | Επιβεβαιώνει ότι είσαι στο `develop` (αλλιώς ρωτάει αν θες να συνεχίσεις). |
| **2. Commit develop** | Αν υπάρχουν αλλαγές, σου ζητά commit message και κάνει `commit` + `push origin develop`. |
| **3. Checkout deploy** | Αλλάζει στο `deploy` branch. |
| **4. Pull deploy** | Τραβάει τις τελευταίες αλλαγές του `origin/deploy`. |
| **5. Selective merge** | Φέρνει από το `develop` **μόνο** τους φακέλους `api/`, `config/`, `public/` και το `.htaccess.production`. Αντικαθιστά το `.htaccess` με την production έκδοση. **Παράγει** το `config/secrets.local.php` με τα production μυστικά (βλ. παρακάτω) και το κάνει force-add παρά το `.gitignore`. |
| **6. Καθαρισμός dev files** | Αφαιρεί από το deploy branch ό,τι δεν χρειάζεται production: `database/`, `electron/`, `tools/`, `dist/`, `node_modules/`, `router.php`, `package.json`, `package-lock.json`, `.htaccess.production`. |
| **7. Commit** | Κάνει commit τις αλλαγές με timestamp. |
| **8. Push** | `git push origin deploy`. |
| **9. Επιστροφή** | Γυρνά πίσω στο `develop`. |

---

## Production secrets (πώς δεν διαρρέουν)

Το script **δεν** έχει ποτέ hardcoded κωδικούς. Παράγει το `config/secrets.local.php` διαβάζοντας **environment variables** από το μηχάνημα που τρέχει το deploy. Αν λείπει ο DB κωδικός, σε ρωτάει με ασφαλές prompt.

Πριν τρέξεις το `deploy.ps1`, όρισε (στο ίδιο PowerShell session):

```powershell
$env:PAINTER_DB_USER = "painter_user"
$env:PAINTER_DB_PASS = "ο_πραγματικός_db_κωδικός"
$env:PAINTER_SYNC_API_KEY = "το_sync_key"

# Προαιρετικά - Google Calendar (αν θες ενεργό στο production):
$env:PAINTER_GOOGLE_CLIENT_ID = "....apps.googleusercontent.com"
$env:PAINTER_GOOGLE_CLIENT_SECRET = "GOCSPX-...."
# Προαιρετικό override του redirect (default: production domain):
# $env:PAINTER_GOOGLE_REDIRECT_URI = "https://nikolpaintmaster.e-gata.gr/api/google_oauth.php?action=callback"
```

Το παραγόμενο `config/secrets.local.php` έχει πάντα `DEBUG_MODE => false` σε production.

> **Σημαντικό:** το `deploy.ps1` **ξαναγράφει** το `config/secrets.local.php` σε κάθε deploy. Αν προσθέσεις keys με το χέρι στο production αρχείο, θα χαθούν στο επόμενο deploy. Γι' αυτό τα Google keys πρέπει να μπαίνουν είτε ως env vars (παραπάνω) είτε ως **Plesk environment variables** (επιβιώνουν των deploy — βλ. κάτω).

---

## Εκτέλεση

```powershell
# Από τον φάκελο του project, στο branch develop:
.\deploy.ps1
```

Μετά το επιτυχές push:

1. **Plesk → Git → Pull now** (τραβάει το `origin/deploy`).
2. Έλεγξε τα deployment logs.
3. Δοκίμασε την εφαρμογή.

---

## Εναλλακτικό: Google keys ως Plesk env vars (συνιστάται)

Αντί να τα περνάς σε κάθε deploy, μπορείς να τα ορίσεις **μία φορά** στο Plesk ώστε να επιβιώνουν:

- Plesk → Websites & Domains → PHP Settings (ή Apache & nginx Settings) → πρόσθεσε environment variables / `SetEnv`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`

Ο κώδικας (`app_secret()` στο `config/secrets.php`) διαβάζει **πρώτα** τα env vars, μετά το `secrets.local.php`. Έτσι δεν χρειάζεται καθόλου να τα βάλεις στο deploy.

---

## Συχνά προβλήματα

- **«Το κουμπί Google Calendar είναι ανενεργό»** → ο server δεν βλέπει `GOOGLE_CLIENT_ID/SECRET`. Σιγουρέψου ότι υπάρχουν στο `config/secrets.local.php` (τοπικά) ή στα env vars (production). Το πρότυπο `secrets.local.example.php` **δεν** διαβάζεται — πρέπει να υπάρχει το `secrets.local.php`.
- **`config/secrets.local.php` δεν υπάρχει τοπικά** → αντίγραψε το `config/secrets.local.example.php` σε `config/secrets.local.php` και συμπλήρωσε τιμές.
- **OAuth redirect σφάλμα** → το redirect URI στο Google Cloud Console πρέπει να ταιριάζει **ακριβώς** με το `GOOGLE_REDIRECT_URI` (incl. `?action=callback`).
