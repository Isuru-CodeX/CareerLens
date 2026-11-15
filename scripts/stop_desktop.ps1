# CareerLens AI - Stop Background Desktop Services
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping CareerLens AI Desktop services..." -ForegroundColor Cyan

$ports = @(8000, 5173)
$stoppedCount = 0

foreach ($p in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($c in $connections) {
            $targetProcId = $c.OwningProcess
            if ($targetProcId -and $targetProcId -ne 0 -and $targetProcId -ne $PID) {
                Write-Host "Terminating process on port $p (PID: $targetProcId)..." -ForegroundColor Yellow
                Stop-Process -Id $targetProcId -Force -ErrorAction SilentlyContinue
                $stoppedCount++
            }
        }
    }
}

# Also stop any orphaned uvicorn or vite processes in project tree
Get-Process python -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*CareerLens*" 
} | ForEach-Object {
    Write-Host "Stopping Python service (PID: $($_.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    $stoppedCount++
}

Write-Host ""
Write-Host "[OK] All CareerLens AI desktop services have been stopped." -ForegroundColor Green
Start-Sleep -Milliseconds 600
