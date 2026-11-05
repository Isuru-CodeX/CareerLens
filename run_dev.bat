@echo off
echo ==================================================
echo  Starting CareerLens AI Development Environment
echo ==================================================

if not exist "backend\venv" (
    echo Creating Python venv...
    python -m venv backend\venv
    call backend\venv\Scripts\pip.exe install -r backend\requirements.txt
)

if not exist "careerlens.db" (
    echo Seeding database...
    call backend\venv\Scripts\python.exe database\seed-data\seed.py
)

echo Starting FastAPI Backend...
start "CareerLens Backend" cmd /k "cd backend && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting React Frontend...
start "CareerLens Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo CareerLens AI servers started!
echo Frontend: http://localhost:5173
echo Swagger API: http://localhost:8000/docs
echo Demo User: demo@careerlens.ai / CareerLens2026!
pause

