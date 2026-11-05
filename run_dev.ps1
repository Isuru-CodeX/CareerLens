# Start CareerLens AI Backend & Frontend Development Servers
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting CareerLens AI Development Environment " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if venv exists
if (!(Test-Path "backend\venv")) {
    Write-Host "Creating Python venv..." -ForegroundColor Yellow
    python -m venv backend\venv
    & backend\venv\Scripts\pip.exe install -r backend\requirements.txt
}

# Run seed data if database not present
if (!(Test-Path "careerlens.db")) {
    Write-Host "Seeding database with demo data..." -ForegroundColor Yellow
    & backend\venv\Scripts\python.exe database\seed-data\seed.py
}

Write-Host "Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Starting React Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nCareerLens AI is running!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API & Swagger: http://localhost:8000/docs" -ForegroundColor White
Write-Host "Demo Account: demo@careerlens.ai / CareerLens2026!" -ForegroundColor White
