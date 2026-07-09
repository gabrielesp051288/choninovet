$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$appPath = Join-Path $repoRoot "app"

Write-Host "Iniciando app web choninovet..." -ForegroundColor Cyan
Write-Host "Expo indicara la URL local disponible. Para salir: Ctrl+C." -ForegroundColor Yellow
Set-Location $appPath
npm run web
