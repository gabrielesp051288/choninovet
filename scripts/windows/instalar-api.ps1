$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiPath = Join-Path $repoRoot "api"

Write-Host "Instalando dependencias del backend..." -ForegroundColor Cyan
Set-Location $apiPath
npm install
Write-Host "Backend instalado." -ForegroundColor Green
