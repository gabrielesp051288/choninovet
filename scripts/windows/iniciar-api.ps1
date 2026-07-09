$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiPath = Join-Path $repoRoot "api"

Write-Host "Iniciando API choninovet..." -ForegroundColor Cyan
Write-Host "La API usara el puerto configurado en api/.env. Para salir: Ctrl+C." -ForegroundColor Yellow
Set-Location $apiPath
npm run start:dev
