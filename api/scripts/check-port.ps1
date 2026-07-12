param(
  [Parameter(Mandatory = $true)]
  [int]$Port
)

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "Port $Port is free."
  exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

Write-Host "Port $Port is already in use."

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

  if ($process) {
    Write-Host "PID $processId - $($process.ProcessName) - $($process.Path)"
  } else {
    Write-Host "PID $processId"
  }
}

Write-Host "Stop the existing process or use another PORT before starting the API."
exit 1
