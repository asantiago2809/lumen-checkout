[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$lumenRoot = Split-Path -Parent $PSScriptRoot
$lumenBuildRoot = Join-Path $lumenRoot 'infra/build'
$lumenStage = Join-Path $lumenBuildRoot ('lambda-' + [guid]::NewGuid().ToString('N'))

Push-Location $lumenRoot
try {
  & npm.cmd run build -w apps/api
  if ($LASTEXITCODE -ne 0) { throw 'API build failed' }
  New-Item -ItemType Directory -Force -Path (Join-Path $lumenStage 'apps/api'), (Join-Path $lumenStage 'apps/web') | Out-Null
  Copy-Item -LiteralPath 'package.json', 'package-lock.json' -Destination $lumenStage
  Copy-Item -LiteralPath 'apps/api/package.json' -Destination (Join-Path $lumenStage 'apps/api/package.json')
  Copy-Item -LiteralPath 'apps/web/package.json' -Destination (Join-Path $lumenStage 'apps/web/package.json')
  Copy-Item -LiteralPath 'apps/api/dist' -Destination (Join-Path $lumenStage 'apps/api/dist') -Recurse
  Push-Location $lumenStage
  try {
    & npm.cmd ci --omit=dev --workspace=@lumen/api --include-workspace-root=false --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Production dependency installation failed' }
  } finally { Pop-Location }
  $lumenRevision = (& git rev-parse --short HEAD).Trim()
  $lumenZip = Join-Path $lumenBuildRoot ('api-' + $lumenRevision + '-' + (Get-Date -Format 'yyyyMMddHHmmss') + '.zip')
  Compress-Archive -Path (Join-Path $lumenStage '*') -DestinationPath $lumenZip -CompressionLevel Optimal
  Write-Output ('API package: ' + $lumenZip)
  Write-Output ('SHA256: ' + (Get-FileHash -LiteralPath $lumenZip -Algorithm SHA256).Hash)
  Write-Output 'Staging folder retained for inspection; it contains no environment file.'
} finally { Pop-Location }
