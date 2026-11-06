# Start CareerLens AI Backend & Frontend Development Servers
Set-Location $PSScriptRoot
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting CareerLens AI Development Environment " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if venv exists
if (!(Test-Path "backend\venv")) {
    Write-Host "Creating Python venv..." -ForegroundColor Yellow
    python -m venv backend\venv
    & backend\venv\Scripts\pip.exe install -r backend\requirements.txt
}

# Check if frontend node_modules exists
if (!(Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm --prefix frontend install
}

# Check and release ports 8000 and 5173 if already occupied
$ports = @(8000, 5173)
foreach ($p in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($c in $connections) {
            $targetProcId = $c.OwningProcess
            if ($targetProcId -and $targetProcId -ne 0 -and $targetProcId -ne $PID) {
                Write-Host "Releasing port $p (stopping existing PID: $targetProcId)..." -ForegroundColor Yellow
                Stop-Process -Id $targetProcId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Start-Sleep -Milliseconds 500

# Initialize database schema and verify seed data
Write-Host "Verifying database and seeding data..." -ForegroundColor Yellow
& backend\venv\Scripts\python.exe database\seed-data\seed.py

Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$PSScriptRoot\backend" -ArgumentList @("-NoExit", "-Command", "& { .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload }")

Write-Host "Starting React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$PSScriptRoot\frontend" -ArgumentList @("-NoExit", "-Command", "& { npm run dev }")

Write-Host "`nCareerLens AI is running!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API & Swagger: http://localhost:8000/docs" -ForegroundColor White
Write-Host "Demo Account: demo@careerlens.ai / CareerLens2026!" -ForegroundColor White

