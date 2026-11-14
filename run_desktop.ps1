# CareerLens AI - Native Windows Desktop Application Launcher
$ErrorActionPreference = "Stop"

# Robustly determine root directory (works in direct execution, dot-sourcing, or batch calls)
$rootDir = if ($PSScriptRoot) { 
    $PSScriptRoot 
} elseif ($MyInvocation.MyCommand.Path) { 
    Split-Path -Parent $MyInvocation.MyCommand.Path 
} else { 
    (Get-Location).Path 
}
Set-Location $rootDir

$pythonExe = Join-Path $rootDir "backend\venv\Scripts\python.exe"
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"
$backendLog = Join-Path $rootDir ".backend_desktop.log"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Launching CareerLens AI Desktop Application        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python virtual environment
if (!(Test-Path $pythonExe)) {
    Write-Host "[1/5] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv (Join-Path $backendDir "venv")
    $pipExe = Join-Path $backendDir "venv\Scripts\pip.exe"
    & $pipExe install -r (Join-Path $backendDir "requirements.txt")
}

# 2. Check frontend dependencies
if (!(Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "[2/5] Installing frontend packages..." -ForegroundColor Yellow
    npm --prefix $frontendDir install
}

# 3. Verify database schema
$seedScript = Join-Path $rootDir "database\seed-data\seed.py"
& $pythonExe $seedScript | Out-Null

# 4. Check or Start Backend Engine (Port 8000)
$backendRunning = $false
try {
    $bCheck = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($bCheck -and $bCheck.status -eq "healthy") {
        $backendRunning = $true
        Write-Host "[3/5] Backend Engine is already active on http://127.0.0.1:8000" -ForegroundColor Green
    }
} catch {}

if (-not $backendRunning) {
    Write-Host "[3/5] Starting CareerLens AI Backend Engine (Port 8000)..." -ForegroundColor Yellow
    
    # Release port 8000 if blocked
    $conn8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($conn8000) {
        foreach ($c in $conn8000) {
            if ($c.OwningProcess -and $c.OwningProcess -ne $PID) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 400
    }

    $env:PYTHONPATH = $backendDir
    Start-Process -FilePath $pythonExe `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
        -WorkingDirectory $backendDir `
        -RedirectStandardError $backendLog `
        -WindowStyle Hidden
}

# 5. Check or Start React 19 Frontend (Port 5173)
$frontendRunning = $false
try {
    $fCheck = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($fCheck -and $fCheck.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "[4/5] Frontend UI is already active on http://localhost:5173" -ForegroundColor Green
    }
} catch {}

if (-not $frontendRunning) {
    Write-Host "[4/5] Starting React 19 UI Server (Port 5173)..." -ForegroundColor Yellow

    # Release port 5173 if blocked
    $conn5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($conn5173) {
        foreach ($c in $conn5173) {
            if ($c.OwningProcess -and $c.OwningProcess -ne $PID) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 400
    }

    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm run dev" `
        -WorkingDirectory $frontendDir `
        -WindowStyle Hidden
}

# 6. Wait until both Backend and Frontend are confirmed 100% online
Write-Host "[5/5] Verifying service connectivity..." -ForegroundColor Yellow
$backendReady = $false
$frontendReady = $false
$maxAttempts = 35
$attempt = 0

while ((-not $backendReady -or -not $frontendReady) -and $attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Milliseconds 500

    if (-not $backendReady) {
        try {
            $backendRes = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($backendRes -and $backendRes.status -eq "healthy") {
                $backendReady = $true
                Write-Host "-> Backend Engine is verified and healthy." -ForegroundColor Green
            }
        } catch {}
    }

    if (-not $frontendReady) {
        try {
            $frontendRes = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($frontendRes -and $frontendRes.StatusCode -eq 200) {
                $frontendReady = $true
                Write-Host "-> Frontend UI is verified and responsive." -ForegroundColor Green
            }
        } catch {}
    }
}

if (-not $backendReady) {
    Write-Host "Warning: Backend is still initializing on http://127.0.0.1:8000" -ForegroundColor DarkYellow
}

# 7. Locate native browser runtime for dedicated standalone app window
$browserCandidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\EdgeCore\Optimized\msedge.exe",
    "C:\Program Files (x86)\Microsoft\EdgeCore\157.0.4341.46\msedge.exe",
    "C:\Program Files (x86)\Microsoft\EdgeCore\145.0.3800.82\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$browserPath = $null
foreach ($path in $browserCandidates) {
    if (Test-Path $path) {
        $browserPath = $path
        break
    }
}

$desktopProfile = Join-Path $rootDir ".desktop_profile"
if (!(Test-Path $desktopProfile)) {
    New-Item -ItemType Directory -Path $desktopProfile | Out-Null
}

Write-Host ""
Write-Host "[OK] CareerLens AI Desktop Application is OPEN!" -ForegroundColor Green
Write-Host "-> Dedicated Window: Active (1440x920)" -ForegroundColor White
Write-Host "-> Backend API:      http://127.0.0.1:8000" -ForegroundColor White
Write-Host "-> Frontend UI:     http://localhost:5173" -ForegroundColor White
Write-Host "-> To stop services anytime: Run .\stop_desktop.bat" -ForegroundColor DarkGray
Write-Host ""

if ($browserPath) {
    # Launch as standalone desktop application window (No address bar, no browser tabs, native frame)
    $appArgs = @(
        "--app=http://localhost:5173",
        "--window-size=1440,920",
        "--window-position=center",
        "--user-data-dir=$desktopProfile",
        "--disable-features=Translate"
    )
    Start-Process -FilePath $browserPath -ArgumentList $appArgs
} else {
    # Fallback to default browser
    Start-Process "http://localhost:5173"
}
