# Run this script as Administrator to build the installer
# Right-click this file and select "Run with PowerShell (Admin)"

Write-Host "Building Setique Founder Dashboard Installer..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Clean the electron-builder cache
Write-Host "Cleaning electron-builder cache..." -ForegroundColor Yellow
Remove-Item -Path "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Force -ErrorAction SilentlyContinue

# Build the installer
Write-Host "Building installer (this may take a few minutes)..." -ForegroundColor Yellow
npm run electron:build:win

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installer location:" -ForegroundColor Cyan
    Write-Host "  $projectPath\release\" -ForegroundColor White
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Get-ChildItem "$projectPath\release" -Filter "*.exe" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor White
    }
} else {
    Write-Host "✗ Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
