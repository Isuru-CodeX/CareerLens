# CareerLens AI - Create Windows Desktop Shortcut
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "CareerLens AI.lnk"
$iconPath = Join-Path $PSScriptRoot "careerlens.ico"
$targetPath = Join-Path $PSScriptRoot "run_desktop.bat"

Write-Host "Creating CareerLens AI Desktop Shortcut..." -ForegroundColor Cyan

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "CareerLens AI - Autonomous Career Intelligence & ATS Platform"
$Shortcut.Save()

Write-Host "[OK] Successfully created 'CareerLens AI' shortcut on your Desktop!" -ForegroundColor Green
Write-Host "Location: $shortcutPath" -ForegroundColor White
Write-Host "You can now double-click the CareerLens AI icon directly from your Windows Desktop anytime." -ForegroundColor Yellow
