# Deploy Script - Automato Deploy sto Production
# Chrisi: .\deploy.ps1

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan
Write-Host ""

# Vima 1: Elegchos oti eimaste sto develop
Write-Host "Step 1: Checking current branch..." -ForegroundColor Yellow
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "develop") {
    Write-Host "Warning: You are on '$currentBranch' branch, not 'develop'" -ForegroundColor Red
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit 1
    }
}

# Vima 2: Commit kai push tychon allages sto develop
Write-Host ""
Write-Host "Step 2: Committing changes in develop..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Cyan
    git status --short
    Write-Host ""
    $commitMsg = Read-Host "Enter commit message (or press Enter to skip)"
    if ($commitMsg) {
        git add .
        git commit -m "$commitMsg"
        git push origin develop
        Write-Host "Changes committed and pushed to develop" -ForegroundColor Green
    } else {
        Write-Host "Skipping commit" -ForegroundColor Yellow
    }
} else {
    Write-Host "No uncommitted changes in develop" -ForegroundColor Green
}

# Vima 3: Checkout sto deploy
Write-Host ""
Write-Host "Step 3: Switching to deploy branch..." -ForegroundColor Yellow
git checkout deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to checkout deploy branch" -ForegroundColor Red
    exit 1
}
Write-Host "Switched to deploy branch" -ForegroundColor Green

# Vima 4: Pull teleytaies allages
Write-Host ""
Write-Host "Step 4: Pulling latest changes from origin/deploy..." -ForegroundColor Yellow
git pull origin deploy
Write-Host "Deploy branch updated" -ForegroundColor Green

# Vima 5: Merge develop -> deploy me selective checkout
Write-Host ""
Write-Host "Step 5: Merging develop into deploy (selective files)..." -ForegroundColor Yellow

# Selective checkout mono ton fakelwn pou chreiazontai
git checkout develop -- api config public .htaccess

# Enimerwsi database.php me production settings
Write-Host "   Updating database.php with production settings..." -ForegroundColor Cyan

$dbFile = "config/database.php"
$dbContent = Get-Content $dbFile -Raw

# Replace DEBUG_MODE
$dbContent = $dbContent -replace 'define\(''DEBUG_MODE'',\s*true\);', 'define(''DEBUG_MODE'', false);'

# Replace DB credentials
$dbContent = $dbContent -replace 'define\(''DB_USER'',\s*''[^'']*''\);', 'define(''DB_USER'', ''painter_user'');'
$dbContent = $dbContent -replace 'define\(''DB_PASS'',\s*''[^'']*''\);', 'define(''DB_PASS'', ''~cjN4bOZcq77jqy@'');'

# Update comment
$dbContent = $dbContent -replace '// Database credentials.*', '// Database credentials (Production)'
$dbContent = $dbContent -replace '// Debug mode.*', '// Debug mode - ALWAYS false in production'

Set-Content $dbFile -Value $dbContent -NoNewline

Write-Host "Files merged and database.php configured for production" -ForegroundColor Green

# Vima 6: Diagrafi development files (an yparxoun)
Write-Host ""
Write-Host "Step 6: Cleaning development files..." -ForegroundColor Yellow

$devFiles = @("database", "electron", "tools", "dist", "node_modules", "router.php", "package.json", "package-lock.json", ".htaccess.production")
$cleaned = $false

foreach ($file in $devFiles) {
    if (Test-Path $file) {
        git rm -r --ignore-unmatch $file 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Removed: $file" -ForegroundColor Gray
            $cleaned = $true
        }
    }
}

if ($cleaned) {
    Write-Host "Development files cleaned" -ForegroundColor Green
} else {
    Write-Host "No development files to clean" -ForegroundColor Green
}

# Vima 7: Commit allages
Write-Host ""
Write-Host "Step 7: Committing changes..." -ForegroundColor Yellow

git add .

$hasChanges = git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "Deploy: Update from develop ($timestamp)"
    Write-Host "Changes committed" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Cyan
}

# Vima 8: Push sto origin/deploy
Write-Host ""
Write-Host "Step 8: Pushing to origin/deploy..." -ForegroundColor Yellow
git push origin deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to origin/deploy" -ForegroundColor Green
} else {
    Write-Host "Failed to push to origin/deploy" -ForegroundColor Red
    git checkout develop
    exit 1
}

# Vima 9: Epistrofi sto develop
Write-Host ""
Write-Host "Step 9: Returning to develop branch..." -ForegroundColor Yellow
git checkout develop
Write-Host "Switched back to develop" -ForegroundColor Green

# Telos
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   - Files deployed: api/, config/, public/, .htaccess" -ForegroundColor White
Write-Host "   - DEBUG_MODE: false (production)" -ForegroundColor White
Write-Host "   - Database: painter_user@painter_app" -ForegroundColor White
Write-Host "   - Branch: origin/deploy (updated)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Go to Plesk -> Git -> Pull now" -ForegroundColor White
Write-Host "   2. Check deployment logs" -ForegroundColor White
Write-Host "   3. Test the application" -ForegroundColor White
Write-Host ""
