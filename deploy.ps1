# Deploy Script - Automato Deploy sto Production
# Chrisi: .\deploy.ps1

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan
Write-Host ""

# Vima 0: Elegchos SSH Agent kai SSH Key
Write-Host "Step 0: Checking SSH Configuration..." -ForegroundColor Yellow

# Set Git to use Windows OpenSSH
$env:GIT_SSH = "C:\Windows\System32\OpenSSH\ssh.exe"

# Check if ssh-agent service is running
$sshAgentService = Get-Service ssh-agent -ErrorAction SilentlyContinue
if (-not $sshAgentService -or $sshAgentService.Status -ne 'Running') {
    Write-Host "   Starting SSH Agent service..." -ForegroundColor Cyan
    Set-Service ssh-agent -StartupType Manual -ErrorAction SilentlyContinue
    Start-Service ssh-agent -ErrorAction SilentlyContinue
    Write-Host "   SSH Agent service started" -ForegroundColor Green
} else {
    Write-Host "   SSH Agent service is running" -ForegroundColor Green
}

# Check if SSH key is loaded
$sshKeyPath = "$env:USERPROFILE\.ssh\ZiSo_Dell"
if (Test-Path $sshKeyPath) {
    $sshList = ssh-add -l 2>&1
    if ($sshList -notmatch "ZiSo_Dell" -or $LASTEXITCODE -ne 0) {
        Write-Host "   Adding SSH key..." -ForegroundColor Cyan
        Write-Host "   NOTE: You may need to enter your SSH key passphrase" -ForegroundColor Yellow
        ssh-add $sshKeyPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   SSH key added successfully" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: Failed to add SSH key" -ForegroundColor Red
            Write-Host "   Please add manually: ssh-add $sshKeyPath" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "   SSH key already loaded" -ForegroundColor Green
    }
} else {
    Write-Host "   ERROR: SSH key not found at $sshKeyPath" -ForegroundColor Red
    exit 1
}

# Test GitHub SSH connection
Write-Host "   Testing GitHub connection..." -ForegroundColor Cyan
$testResult = ssh -T git@github.com 2>&1
if ($testResult -match "successfully authenticated") {
    Write-Host "   GitHub connection: SUCCESS" -ForegroundColor Green
} else {
    Write-Host "   WARNING: GitHub SSH test response:" -ForegroundColor Yellow
    Write-Host "   $testResult" -ForegroundColor DarkGray
}

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
git checkout develop -- api config public .htaccess.production

# Replace .htaccess with .htaccess.production
Write-Host "   Replacing .htaccess with production version..." -ForegroundColor Cyan
if (Test-Path ".htaccess.production") {
    Copy-Item ".htaccess.production" ".htaccess" -Force
    git add .htaccess
    Write-Host "   .htaccess updated for production" -ForegroundColor Gray
}

# Generate production secrets file (config/secrets.local.php)
# NOTE: real credentials are NEVER hardcoded here. They come from environment
# variables on the machine running this deploy script.
#   $env:PAINTER_DB_USER, $env:PAINTER_DB_PASS, $env:PAINTER_SYNC_API_KEY
Write-Host "   Generating production config/secrets.local.php..." -ForegroundColor Cyan

$prodDbUser = if ($env:PAINTER_DB_USER) { $env:PAINTER_DB_USER } else { "painter_user" }
$prodDbPass = $env:PAINTER_DB_PASS
if (-not $prodDbPass) {
    Write-Host "   PAINTER_DB_PASS env var not set." -ForegroundColor Yellow
    $secure = Read-Host "   Enter PRODUCTION database password" -AsSecureString
    $prodDbPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
$prodSyncKey = if ($env:PAINTER_SYNC_API_KEY) { $env:PAINTER_SYNC_API_KEY } else { "electron-sync-key-2025" }

$adminHashLine = ""
if ($env:PAINTER_ADMIN_PASSWORD_HASH) {
    $hashEsc = Escape-Php $env:PAINTER_ADMIN_PASSWORD_HASH
    $adminHashLine = "`n    'ADMIN_PASSWORD_HASH' => '$hashEsc',"
    Write-Host "   Admin password: bcrypt hash from PAINTER_ADMIN_PASSWORD_HASH" -ForegroundColor Gray
} else {
    Write-Host "   WARNING: PAINTER_ADMIN_PASSWORD_HASH not set — use npm run admin:hash before deploy!" -ForegroundColor Yellow
}

# PHP single-quoted strings: escape backslash and single quote
function Escape-Php($s) { return ($s -replace '\\', '\\' -replace "'", "\'") }
$userEsc = Escape-Php $prodDbUser
$passEsc = Escape-Php $prodDbPass
$keyEsc  = Escape-Php $prodSyncKey

# Google Calendar (optional) - only injected if env vars are set.
#   $env:PAINTER_GOOGLE_CLIENT_ID, $env:PAINTER_GOOGLE_CLIENT_SECRET, $env:PAINTER_GOOGLE_REDIRECT_URI
$googleLines = ""
if ($env:PAINTER_GOOGLE_CLIENT_ID -and $env:PAINTER_GOOGLE_CLIENT_SECRET) {
    $gcidEsc = Escape-Php $env:PAINTER_GOOGLE_CLIENT_ID
    $gsecEsc = Escape-Php $env:PAINTER_GOOGLE_CLIENT_SECRET
    $gredir  = if ($env:PAINTER_GOOGLE_REDIRECT_URI) { $env:PAINTER_GOOGLE_REDIRECT_URI } else { "https://nikolpaintmaster.e-gata.gr/api/google_oauth.php?action=callback" }
    $gredEsc = Escape-Php $gredir
    $googleLines = @"

    'GOOGLE_CLIENT_ID'     => '$gcidEsc',
    'GOOGLE_CLIENT_SECRET' => '$gsecEsc',
    'GOOGLE_REDIRECT_URI'  => '$gredEsc',
"@
    Write-Host "   Google Calendar keys: included from env vars" -ForegroundColor Gray
} else {
    Write-Host "   Google Calendar keys: NOT set (PAINTER_GOOGLE_CLIENT_ID/SECRET) - skipping" -ForegroundColor DarkGray
}

$secretsContent = @"
<?php
// AUTO-GENERATED for production by deploy.ps1 - do not edit by hand.
return [
    'DB_HOST'      => 'localhost',
    'DB_PORT'      => '3306',
    'DB_NAME'      => 'painter_app',
    'DB_USER'      => '$userEsc',
    'DB_PASS'      => '$passEsc',
    'SYNC_API_KEY' => '$keyEsc',$adminHashLine
    'DEBUG_MODE'   => false,$googleLines
];
"@

Set-Content "config/secrets.local.php" -Value $secretsContent -NoNewline -Encoding UTF8

# Force-add despite .gitignore so the deploy branch / Plesk pull receives it
git add -f config/secrets.local.php

Write-Host "Files merged and production secrets generated" -ForegroundColor Green

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
