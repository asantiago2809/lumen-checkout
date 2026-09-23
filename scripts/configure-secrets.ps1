[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Profile,
  [Parameter(Mandatory=$true)][ValidatePattern('^\d{12}$')][string]$ExpectedAccountId,
  [string]$AwsCli = 'aws',
  [string]$Region = 'us-east-1'
)

# Run personally after reviewing the destination. No secret is printed or put in arguments.
$ErrorActionPreference = 'Stop'
$lumenRoot = Split-Path -Parent $PSScriptRoot
$lumenEnv = Join-Path $lumenRoot 'apps/api/.env'
$lumenIdentityText = & $AwsCli sts get-caller-identity --profile $Profile --region $Region --output json
if ($LASTEXITCODE -ne 0) { throw 'AWS authentication failed' }
$lumenIdentity = $lumenIdentityText | ConvertFrom-Json
if ($lumenIdentity.Account -ne $ExpectedAccountId) { throw 'Unexpected AWS account. Nothing stored.' }

$lumenAllowed = @('PAYMENT_API_URL','PAYMENT_PUBLIC_KEY','PAYMENT_PRIVATE_KEY','PAYMENT_INTEGRITY_SECRET','PAYMENT_EVENTS_SECRET')
$lumenSecrets = @{}
foreach ($lumenLine in Get-Content -LiteralPath $lumenEnv) {
  if ($lumenLine -match '^([A-Z_]+)=(.*)$' -and $Matches[1] -in $lumenAllowed) {
    $lumenSecrets[$Matches[1]] = $Matches[2].Trim()
  }
}
foreach ($lumenName in $lumenAllowed) {
  if ([string]::IsNullOrWhiteSpace($lumenSecrets[$lumenName])) { throw ('Missing local setting: '+$lumenName) }
}
if ($lumenSecrets['PAYMENT_API_URL'] -notin @('https://api-sandbox.co.uat.wompi.dev/v1','https://sandbox.wompi.co/v1')) {
  throw 'Only the two documented sandbox endpoints are accepted.'
}
$lumenRandom = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($lumenRandom)
$lumenSecrets['SESSION_SECRET'] = [Convert]::ToBase64String($lumenRandom)
$lumenRequest = @{
  Name='/lumen-checkout/sandbox'
  Description='Lumen sandbox runtime configuration'
  Type='SecureString'
  Value=($lumenSecrets | ConvertTo-Json -Compress)
  Tier='Standard'
  Tags=@(@{Key='Project';Value='lumen-checkout'})
}
$lumenInput = Join-Path ([IO.Path]::GetTempPath()) ('lumen-ssm-'+[guid]::NewGuid().ToString('N')+'.json')
[IO.File]::WriteAllText($lumenInput,($lumenRequest | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
try {
  & $AwsCli ssm put-parameter --profile $Profile --region $Region --cli-input-json ('file://'+$lumenInput)
  if ($LASTEXITCODE -ne 0) { throw 'SSM write failed. Existing parameters are never overwritten by this script.' }
  Write-Output 'Encrypted sandbox configuration saved. No credential values were printed.'
} finally {
  Remove-Item -LiteralPath $lumenInput -Force
}
