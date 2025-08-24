# Start FAQ Finance Application
Write-Host "Starting FAQ Finance Application..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:DATABASE_URL = "postgres://postgres:postgres%40123@localhost:5432/faq_finance"
$env:PORT = 5000
$env:USE_SQLITE = "false"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "DATABASE_URL = $env:DATABASE_URL" -ForegroundColor Cyan
Write-Host "PORT = $env:PORT" -ForegroundColor Cyan
Write-Host ""

# Start backend in a new window
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Start frontend in a new window
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both services are starting..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Admin Login Credentials:" -ForegroundColor Yellow
Write-Host "Username: admin@example.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
