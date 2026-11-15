# CareerLens AI - Create Windows Desktop Shortcut
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$rootDir = if (Test-Path (Join-Path $scriptDir "package.json")) {
    $scriptDir
} elseif (Test-Path (Join-Path (Split-Path -Parent $scriptDir) "package.json")) {
    Split-Path -Parent $scriptDir
} else {
    $scriptDir
}

$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "CareerLens AI.lnk"
$iconPath = Join-Path $rootDir "careerlens.ico"
$targetPath = Join-Path $rootDir "run_desktop.bat"

Write-Host "Creating CareerLens AI Desktop Shortcut..." -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $rootDir
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "CareerLens AI - Autonomous Career Intelligence & ATS Platform"
$Shortcut.Save()

Write-Host "[OK] Successfully created 'CareerLens AI' shortcut on your Desktop!" -ForegroundColor Green
Write-Host "Location: $shortcutPath" -ForegroundColor White
Write-Host "You can now double-click the CareerLens AI icon directly from your Windows Desktop anytime." -ForegroundColor Yellow
