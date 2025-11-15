# 🚀 Deployment Workflow Guide

## Γενική Ιδέα

Το project έχει 2 κύρια branches:
- **`develop`**: Ανάπτυξη με όλα τα αρχεία (electron, database tools, κλπ)
- **`deploy`**: Production-ready με ΜΟΝΟ τους φακέλους: `api/`, `config/`, `public/`

## Τοπική Εργασία (Sourcetree)

### 1. Καθημερινή Ανάπτυξη
```bash
# Εργασία στο develop branch
git checkout develop
# Κάνε τις αλλαγές σου...
git add .
git commit -m "Feature: new functionality"
git push origin develop
```

### 2. Deploy στον Server

#### Μέθοδος Α: Χειροκίνητα (Sourcetree)
```bash
# 1. Checkout στο deploy
git checkout deploy

# 2. Pull τελευταίες αλλαγές
git pull origin deploy

# 3. Merge από develop (με επιλεκτικά files)
git checkout develop -- api config public .htaccess

# 4. Commit
git add api config public .htaccess
git commit -m "Deploy: update from develop"

# 5. Push
git push origin deploy
```

#### Μέθοδος Β: GitHub Actions (Αυτόματα)
1. Πήγαινε στο GitHub → **Actions** → **"Update Deploy from Develop"**
2. Κάνε **"Run workflow"**
3. Γράψε **"yes"** στο confirmation
4. Το workflow θα:
   - Κάνει merge `develop → deploy`
   - Διαγράψει development files
   - Κρατήσει μόνο `api/`, `config/`, `public/`
   - Push στο `origin/deploy`

## Τι Κάνει το Plesk

Όταν γίνει push στο `origin/deploy`:
1. Το Plesk ανιχνεύει το push (αν έχεις auto-deploy)
2. Κάνει `git pull origin deploy`
3. Αντιγράφει τα αρχεία στο webroot: `/httpdocs/`
4. Το site ενημερώνεται αυτόματα! ✅

### Manual Deploy στο Plesk
Αν δεν έχεις auto-deploy:
1. Πήγαινε στο Plesk → **Git**
2. Κάνε **"Pull now"**
3. Έλεγξε το **Deployment log**

## Δομή Branches

### Develop Branch
```
nikolpaintmaster.e-gata.gr/
├── api/                    # Backend APIs
├── config/                 # Database configs
├── public/                 # Frontend files
├── electron/               # Desktop app (δεν πάει σε production)
├── database/               # SQL schemas (δεν πάει σε production)
├── tools/                  # Dev scripts (δεν πάει σε production)
├── package.json            # Node dependencies (δεν πάει σε production)
└── .gitignore
```

### Deploy Branch (Production)
```
nikolpaintmaster.e-gata.gr/
├── api/                    # ✅ Backend APIs
├── config/                 # ✅ Database configs
├── public/                 # ✅ Frontend files
├── .htaccess               # ✅ Apache config
└── .gitignore              # ✅ Git ignore
```

## GitHub Actions Workflows

### 1. `deploy.yml`
- **Τρέχει**: Κάθε push στο `deploy` branch
- **Σκοπός**: Επαληθεύει ότι υπάρχουν ΜΟΝΟ production files
- **Ενέργειες**: Validation check

### 2. `update-deploy.yml`
- **Τρέχει**: Χειροκίνητα (workflow_dispatch)
- **Σκοπός**: Αυτόματο merge `develop → deploy`
- **Ενέργειες**: 
  - Merge develop
  - Διαγραφή dev files
  - Push to deploy

## Καλές Πρακτικές

### ✅ DO
- Κάνε ανάπτυξη στο `develop`
- Test τοπικά πριν το deploy
- Χρησιμοποίησε το GitHub Actions για deploy
- Κράτα το `deploy` καθαρό (μόνο production files)

### ❌ DON'T
- Μην κάνεις commits απευθείας στο `deploy`
- Μην ανεβάσεις `.env` ή sensitive data
- Μην χρησιμοποιήσεις `--force` push (εκτός έκτακτης ανάγκης)

## Troubleshooting

### Conflict κατά το merge
```bash
# Αν έχεις conflicts:
git checkout deploy
git merge develop --allow-unrelated-histories

# Λύσε τα conflicts χειροκίνητα, μετά:
git add .
git commit -m "Resolve conflicts"
git push origin deploy
```

### Το Plesk δεν κάνει pull
1. Έλεγξε το **Deployment log** στο Plesk
2. Βεβαιώσου ότι το SSH key είναι σωστό
3. Κάνε manual **"Pull now"**

### Wrong files στο deploy
```bash
# Καθάρισε το deploy branch
git checkout deploy
git rm -r database electron tools
git commit -m "Clean deploy branch"
git push origin deploy
```

## Quick Reference

| Ενέργεια | Command |
|----------|---------|
| Αλλαγή σε develop | `git checkout develop` |
| Αλλαγή σε deploy | `git checkout deploy` |
| Merge develop → deploy | `git merge develop` |
| Push to deploy | `git push origin deploy` |
| Επιλεκτικό merge | `git checkout develop -- api config public` |

## Επικοινωνία

Για βοήθεια:
- GitHub Issues: [organotis-vafea-pro/issues](https://github.com/ZiSo89/organotis-vafea-pro/issues)
- Plesk Support: [help.plesk.com](https://help.plesk.com)

---

**Τελευταία ενημέρωση**: 15 Νοεμβρίου 2025
