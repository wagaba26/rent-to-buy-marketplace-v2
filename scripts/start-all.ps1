# Start All Services Script
# This script starts all microservices and the frontend

Write-Host "🚀 Starting Rent-to-Buy Car Marketplace..." -ForegroundColor Cyan
Write-Host ""

# Check if concurrently is installed
$concurrentlyInstalled = $null -ne (Get-Command concurrently -ErrorAction SilentlyContinue)

if ($concurrentlyInstalled) {
    Write-Host "✅ Using concurrently to start all services..." -ForegroundColor Green
    Write-Host ""
    
    concurrently `
        --names "FRONTEND,API-GW,USER,VEHICLE,PAYMENT,CREDIT,TELEMATICS,SUPPORT" `
        --prefix-colors "cyan,yellow,green,blue,magenta,red,white,gray" `
        "npm run dev" `
        "cd services/api-gateway && npm run dev" `
        "cd services/user-service && npm run dev" `
        "cd services/vehicle-service && npm run dev" `
        "cd services/payment-service && npm run dev" `
        "cd services/credit-service && npm run dev" `
        "cd services/telematics-service && npm run dev" `
        "cd services/support-service && npm run dev"
} else {
    Write-Host "⚠️  Concurrently not found. Installing..." -ForegroundColor Yellow
    npm install -g concurrently
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Concurrently installed. Starting services..." -ForegroundColor Green
        Write-Host ""
        
        concurrently `
            --names "FRONTEND,API-GW,USER,VEHICLE,PAYMENT,CREDIT,TELEMATICS,SUPPORT" `
            --prefix-colors "cyan,yellow,green,blue,magenta,red,white,gray" `
            "npm run dev" `
            "cd services/api-gateway && npm run dev" `
            "cd services/user-service && npm run dev" `
            "cd services/vehicle-service && npm run dev" `
            "cd services/payment-service && npm run dev" `
            "cd services/credit-service && npm run dev" `
            "cd services/telematics-service && npm run dev" `
            "cd services/support-service && npm run dev"
    } else {
        Write-Host "❌ Failed to install concurrently." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start services manually in separate terminals:" -ForegroundColor Yellow
        Write-Host "  1. npm run dev" -ForegroundColor Gray
        Write-Host "  2. cd services/api-gateway && npm run dev" -ForegroundColor Gray
        Write-Host "  3. cd services/user-service && npm run dev" -ForegroundColor Gray
        Write-Host "  4. cd services/vehicle-service && npm run dev" -ForegroundColor Gray
        Write-Host "  5. cd services/payment-service && npm run dev" -ForegroundColor Gray
        Write-Host "  6. cd services/credit-service && npm run dev" -ForegroundColor Gray
        Write-Host "  7. cd services/telematics-service && npm run dev" -ForegroundColor Gray
        Write-Host "  8. cd services/support-service && npm run dev" -ForegroundColor Gray
    }
}
