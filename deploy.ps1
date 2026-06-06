# Deploy Script - Automato Deploy sto Production
# Chrisi: .\deploy.ps1

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan
Write-Host ""

$localSecretsPath = "config/secrets.local.php"
$localSecretsBackup = Join-Path $env:TEMP "painter-secrets.local.php"
$hadLocalSecrets = Test-Path $localSecretsPath
if ($hadLocalSecrets) {
    Copy-Item $localSecretsPath $localSecretsBackup -Force
}

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

# Check if SSH key is loaded / GitHub reachable
$githubOk = $false
$testResult = ssh -T git@github.com 2>&1
if ($testResult -match "successfully authenticated") {
    Write-Host "   GitHub connection: SUCCESS (SSH key already loaded)" -ForegroundColor Green
    $githubOk = $true
}

$sshKeyPath = "$env:USERPROFILE\.ssh\ZiSo_Dell"
if (-not $githubOk -and (Test-Path $sshKeyPath)) {
    Write-Host "   Adding SSH key..." -ForegroundColor Cyan
    Write-Host "   NOTE: You may need to enter your SSH key passphrase" -ForegroundColor Yellow
    ssh-add $sshKeyPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   SSH key added successfully" -ForegroundColor Green
        $githubOk = $true
    } else {
        Write-Host "   ERROR: Failed to add SSH key" -ForegroundColor Red
        Write-Host "   Please add manually: ssh-add $sshKeyPath" -ForegroundColor Yellow
        exit 1
    }
} elseif (-not $githubOk) {
    Write-Host "   ERROR: GitHub SSH failed and key not found at $sshKeyPath" -ForegroundColor Red
    exit 1
}

if (-not $githubOk) {
    $testResult = ssh -T git@github.com 2>&1
    if ($testResult -match "successfully authenticated") {
        Write-Host "   GitHub connection: SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: GitHub SSH test failed:" -ForegroundColor Red
        Write-Host "   $testResult" -ForegroundColor DarkGray
        exit 1
    }
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

# Production secrets must not be committed. GitHub push protection rejects
# OAuth credentials, and secrets should stay on the server (Plesk env vars or a
# manually managed config/secrets.local.php).
Write-Host "   Ensuring production secrets are not tracked by git..." -ForegroundColor Cyan
git rm --cached --ignore-unmatch config/secrets.local.php 2>$null
if (Test-Path "config/secrets.local.php") {
    Remove-Item "config/secrets.local.php" -Force
}
Write-Host "   config/secrets.local.php must be created manually on Plesk if env vars are unavailable." -ForegroundColor Yellow

Write-Host "Files merged and production secrets left untracked" -ForegroundColor Green

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
    if ($hadLocalSecrets -and (Test-Path $localSecretsBackup)) {
        Copy-Item $localSecretsBackup $localSecretsPath -Force
    }
    exit 1
}

# Vima 9: Epistrofi sto develop
Write-Host ""
Write-Host "Step 9: Returning to develop branch..." -ForegroundColor Yellow
git checkout develop
if ($hadLocalSecrets -and (Test-Path $localSecretsBackup)) {
    Copy-Item $localSecretsBackup $localSecretsPath -Force
}
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
Write-Host "   - Database: configured on Plesk via config/secrets.local.php" -ForegroundColor White
Write-Host "   - Branch: origin/deploy (updated)" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Go to Plesk -> Git -> Pull now" -ForegroundColor White
Write-Host "   2. Check deployment logs" -ForegroundColor White
Write-Host "   3. Test the application" -ForegroundColor White
Write-Host ""
