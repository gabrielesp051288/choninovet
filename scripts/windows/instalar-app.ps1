$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$appPath = Join-Path $repoRoot "app"

Write-Host "Instalando dependencias de la app..." -ForegroundColor Cyan
Set-Location $appPath
npm install
Write-Host "App instalada." -ForegroundColor Green
