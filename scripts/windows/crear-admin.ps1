$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiPath = Join-Path $repoRoot "api"

Write-Host "Creando o actualizando administrador inicial..." -ForegroundColor Cyan
Set-Location $apiPath
npm run seed
Write-Host "Administrador inicial listo." -ForegroundColor Green
