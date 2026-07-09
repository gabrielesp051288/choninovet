$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$apiPath = Join-Path $repoRoot "api"

Write-Host "Aplicando migraciones Prisma..." -ForegroundColor Cyan
Set-Location $apiPath
npx prisma migrate deploy
npx prisma generate
Write-Host "Migraciones aplicadas y cliente Prisma generado." -ForegroundColor Green
