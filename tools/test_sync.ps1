# Test Sync Endpoint - PowerShell Script
# Δοκιμάζει το sync.php endpoint από το Electron perspective

$serverUrl = "http://localhost/nikolpaintmaster.e-gata.gr"
$endpoint = "$serverUrl/api/sync.php"

Write-Host "Testing Sync Endpoint" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: $endpoint" -ForegroundColor Yellow

# Test data
$payload = @{
    table = "clients"
    changes = @(
        @{
            id = 999
            name = "Test Client - PowerShell"
            phone = "6912345678"
            email = "test@powershell.gr"
            address = "Test Address 456"
            city = "Athens"
            postal_code = "12345"
            notes = "Test from PowerShell script"
        }
    )
}

$testData = $payload | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $testData
Write-Host ""

try {
    Write-Host "Sending request..." -ForegroundColor Yellow
    
    $headers = @{
        'Content-Type' = 'application/json'
        'X-Sync-API-Key' = 'electron-sync-key-2025'
    }
    
    $response = Invoke-WebRequest -Uri $endpoint -Method POST -Body $testData -Headers $headers -UseBasicParsing
    
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    Write-Host "HTTP Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Body:" -ForegroundColor Green
    
    if ($response.Content) {
        $jsonResponse = $response.Content | ConvertFrom-Json
        $jsonResponse | ConvertTo-Json -Depth 10 | Write-Host
        
        Write-Host ""
        
        if ($response.StatusCode -eq 200 -and $jsonResponse.success) {
            Write-Host "Test PASSED" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Test FAILED" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Empty response" -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "Response Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
    
    exit 1
}
