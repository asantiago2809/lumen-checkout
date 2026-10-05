# Guía de cambios y despliegue en vivo

Complementa la [guía de sustentación](interview-guide.md). Preparar herramientas no publica cambios. La aplicación de entrega permanece disponible mientras se desarrolla en local. Ejecutar los bloques de publicación únicamente cuando se haya decidido desplegar una modificación validada.

## Herramientas y autenticación

Tener VS Code en la raíz, PowerShell 7, producto local, Swagger, GitHub Actions y consola AWS en `us-east-1`. Ejecutar los bloques en **la misma sesión PowerShell 7**, porque comparten variables y funciones; no usar Windows PowerShell 5.1. El CI actual **valida pero no despliega automáticamente**: un push no cambia AWS.

En el equipo de preparación, `trama` delega credenciales mediante `credential_process` a `trama-login`. Para renovar se usa el perfil de origen; para consultar/desplegar se conserva `trama`:

```powershell
aws login --profile trama-login --region us-east-1
aws sts get-caller-identity --profile trama --region us-east-1
```

Completar el acceso oficial en el navegador. No borrar ni recrear perfiles ante el mensaje “already configured with Credential Process credentials”. Sesión web y sesión CLI son independientes. En otro equipo, usar los perfiles reales de ese entorno. Si la identidad falla, resolver el acceso antes de publicar.

## Modificar y probar

```powershell
git status --short
git switch -c feat/interview-change
```

Elegir otro nombre si ya existe. No descartar cambios anteriores. Confirmar comportamiento y un ejemplo con el entrevistador; localizar el símbolo en la guía; modificar la regla y su prueba. Vite actualiza la UI local y Nest recompila la API.

```powershell
function Invoke-LumenCheck {
    param([string]$Tool, [Parameter(ValueFromRemainingArguments=$true)][string[]]$ToolArgs)
    & $Tool @ToolArgs
    if ($LASTEXITCODE -ne 0) { throw ('Check failed: ' + $Tool) }
}
# Ejemplo: probar validación de tarjetas
Invoke-LumenCheck npm.cmd run test -w apps/web -- --runTestsByPath src/validation.test.ts
# Gates antes de publicar el cambio
Invoke-LumenCheck npm.cmd run check:secrets
Invoke-LumenCheck npm.cmd run typecheck
Invoke-LumenCheck npm.cmd run test:coverage
Invoke-LumenCheck node --test infra/static-site/index.test.cjs
Invoke-LumenCheck npm.cmd run build
Invoke-LumenCheck npm.cmd run test:e2e
Invoke-LumenCheck git diff --check
Invoke-LumenCheck git diff
```

E2E requiere navegadores instalados, build API y puertos 5174/3002 libres; tarda varios minutos. Los comandos no convierten resultados de septiembre en pruebas de una modificación nueva. Para iterar empezar por el test específico; antes de publicar completar los gates aplicables.

Guardar archivos explícitos con `git add`, revisar `git diff --cached` y crear un commit convencional que describa el cambio real. Crear PR, revisar CI y fusionar según el flujo acordado. No hacer force push ni fabricar historia. Ejemplo **solo si se reduce el máximo de cuotas**:

```powershell
git commit -m "feat(checkout): limit installments to twelve"
git push -u origin HEAD
# Crear tmp/pr-body.md con problema, comportamiento y pruebas reales antes de este comando.
gh pr create --base main --title "Limit checkout installments to twelve" --body-file .\tmp\pr-body.md
```

## Consultar estado y guardar reversión

Desde la raíz, con AWS CLI autenticado. Este bloque solo consulta metadatos y guarda copia del índice público; no lee secretos ni despliega:

```powershell
$ErrorActionPreference = 'Stop'
function Invoke-LumenAws {
    & aws @args
    if ($LASTEXITCODE -ne 0) { throw 'AWS command failed. Stop and inspect.' }
}
$lumenAwsArgs = @('--profile','trama','--region','us-east-1','--no-cli-pager')
Invoke-LumenAws sts get-caller-identity @lumenAwsArgs
$lumenStack = (Invoke-LumenAws cloudformation describe-stacks --stack-name lumen-checkout @lumenAwsArgs --output json | ConvertFrom-Json).Stacks[0]
if ($lumenStack.StackStatus -notin @('CREATE_COMPLETE','UPDATE_COMPLETE','UPDATE_ROLLBACK_COMPLETE')) { throw ('Stack not stable: ' + $lumenStack.StackStatus) }
$lumenArtifactBucket = ($lumenStack.Parameters | Where-Object ParameterKey -eq ArtifactBucket).ParameterValue
$lumenWebBucket = ($lumenStack.Outputs | Where-Object OutputKey -eq WebBucketName).OutputValue
$lumenSite = ($lumenStack.Outputs | Where-Object OutputKey -eq SiteUrl).OutputValue
$lumenPreviousApiKey = ($lumenStack.Parameters | Where-Object ParameterKey -eq ApiArtifactKey).ParameterValue
if (!$lumenArtifactBucket -or !$lumenWebBucket -or !$lumenSite -or !$lumenPreviousApiKey) { throw 'Stack metadata missing' }
$lumenRelease = Join-Path (Get-Location) ('tmp/release-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $lumenRelease | Out-Null
$lumenStack | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $lumenRelease 'stack-before.json') -Encoding utf8
Invoke-LumenAws lambda get-function-configuration --function-name lumen-checkout-api --query CodeSha256 --output text @lumenAwsArgs | Set-Content (Join-Path $lumenRelease 'api-hash-before.txt')
Invoke-LumenAws s3api head-object --bucket $lumenWebBucket --key index.html @lumenAwsArgs --output json | Set-Content (Join-Path $lumenRelease 'index-before.json') -Encoding utf8
Invoke-LumenAws s3 cp "s3://$lumenWebBucket/index.html" (Join-Path $lumenRelease 'index-before.html') @lumenAwsArgs
git rev-parse HEAD | Set-Content (Join-Path $lumenRelease 'source-commit.txt')
```

Comparar la cuenta con la esperada. Guardar la evidencia en `tmp/`, ignorado por Git. Respaldar también versiones de imágenes de nombre estable si se van a cambiar. No mostrar `.env` ni el valor de SSM al compartir pantalla.

## Publicar solo frontend

Para cambios que no requieren nueva API, template o handler estático. El handler permite cinco nombres de archivos públicos y bundles JS/CSS con hash; una nueva imagen o fuente exige revisar también la allowlist de `infra/static-site/index.cjs:16`. Subirla a S3 por sí solo puede devolver 404. Construir y revisar primero una simulación de las cargas:

```powershell
npm.cmd run build -w apps/web
if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
Invoke-LumenAws s3 cp .\apps\web\dist "s3://$lumenWebBucket/" --recursive --exclude '*' --include 'assets/*' --cache-control 'public,max-age=31536000,immutable' --dryrun @lumenAwsArgs
```

Publicación: bundles con hash primero, archivos auxiliares después, índice al final. Conservar assets anteriores; no usar `sync --delete`:

```powershell
Invoke-LumenAws s3 cp .\apps\web\dist "s3://$lumenWebBucket/" --recursive --exclude '*' --include 'assets/*' --cache-control 'public,max-age=31536000,immutable' @lumenAwsArgs
Invoke-LumenAws s3 cp .\apps\web\dist "s3://$lumenWebBucket/" --recursive --exclude 'assets/*' --exclude 'index.html' --cache-control 'no-cache' @lumenAwsArgs
Invoke-LumenAws s3 cp .\apps\web\dist\index.html "s3://$lumenWebBucket/index.html" --content-type 'text/html' --cache-control 'no-cache' @lumenAwsArgs
Invoke-LumenAws s3api head-object --bucket $lumenWebBucket --key index.html @lumenAwsArgs
```

Abrir el sitio público, comprobar nuevo nombre de bundle y el comportamiento modificado. No hay CDN activo en el despliegue actual. Si se activa CloudFront en el futuro, incluir su invalidación. El índice no usa la caché de assets inmutables. Las imágenes/SVG de nombre estable llevan `max-age=3600` fijado por el handler, aunque S3 tenga metadata `no-cache`: su cambio o reversión puede tardar una hora en verse en navegadores con caché. No prometer actualización inmediata de esos archivos.

## Publicar código API

Conserva el template y los demás parámetros; no sirve como sustituto de revisar un cambio de infraestructura. El script de empaquetado conserva metadata Nest y recursos Swagger. Usar PowerShell 7 para el cálculo de hash:

```powershell
$lumenExistingZips = @(Get-ChildItem .\infra\build\api-*.zip -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
& .\scripts\package-api.ps1
$lumenNewZips = @(Get-ChildItem .\infra\build\api-*.zip | Where-Object { $_.FullName -notin $lumenExistingZips })
if ($lumenNewZips.Count -ne 1) { throw 'Expected one new API package; inspect output' }
$lumenZip = $lumenNewZips[0]
$lumenApiKey = 'api/' + $lumenZip.Name
Invoke-LumenAws s3api put-object --bucket $lumenArtifactBucket --key $lumenApiKey --body $lumenZip.FullName @lumenAwsArgs
$lumenUploaded = Invoke-LumenAws s3api head-object --bucket $lumenArtifactBucket --key $lumenApiKey @lumenAwsArgs --output json | ConvertFrom-Json
if ($lumenUploaded.ContentLength -ne $lumenZip.Length) { throw 'Uploaded size mismatch' }
$lumenParameters = @($lumenStack.Parameters | ForEach-Object {
    if ($_.ParameterKey -eq 'ApiArtifactKey') { @{ParameterKey=$_.ParameterKey; ParameterValue=$lumenApiKey} }
    else { @{ParameterKey=$_.ParameterKey; UsePreviousValue=$true} }
})
$lumenParametersPath = Join-Path $lumenRelease 'api-parameters.json'
ConvertTo-Json -InputObject $lumenParameters -Depth 5 | Set-Content $lumenParametersPath -Encoding utf8
Invoke-LumenAws cloudformation update-stack --stack-name lumen-checkout --use-previous-template --parameters "file://$lumenParametersPath" --capabilities CAPABILITY_IAM @lumenAwsArgs
Invoke-LumenAws cloudformation wait stack-update-complete --stack-name lumen-checkout @lumenAwsArgs
$lumenDeployedHash = Invoke-LumenAws lambda get-function-configuration --function-name lumen-checkout-api --query CodeSha256 --output text @lumenAwsArgs
$lumenLocalHash = [Convert]::ToBase64String([Convert]::FromHexString((Get-FileHash -LiteralPath $lumenZip.FullName -Algorithm SHA256).Hash))
if ($lumenDeployedHash.Trim() -ne $lumenLocalHash) { throw 'Lambda package hash mismatch' }
```

Esperar stack estable antes de otro update. Si cambia API y web, desplegar primero una API compatible con ambos clientes y luego el nuevo índice. No modificar SSM, memoria, IAM, parámetros de otras aplicaciones ni la prueba anterior para un cambio de código corriente.

## Verificación posterior

```powershell
Invoke-RestMethod "$($lumenSite.TrimEnd('/'))/api/health"
Invoke-RestMethod "$($lumenSite.TrimEnd('/'))/api/products"
Invoke-WebRequest "$($lumenSite.TrimEnd('/'))/api/docs" -Method Head
```

Probar también la conducta modificada y registrar commit, artifact key, hash, stack, pruebas y limitaciones. Un homepage HTTP 200 no demuestra el flujo de negocio.

`node scripts/smoke-cloud.mjs $lumenSite` crea un intento ficticio previo al pago y cancela su reserva; no cobra, pero sí guarda registros. El probe `smoke-cloud-recovery.mjs ... --run-recovery` bloquea tokenización/pago. La prueba real `smoke-sandbox.mjs ... --run-sandbox` o su workflow produce operaciones sandbox y la aprobación consume inventario ficticio. Ejecutarlas entendiendo ese efecto; nunca reenviar ciegamente una operación incierta.

## Reversión

Frontend: si se conservaron bundles anteriores y el contrato API es compatible, restaurar el índice respaldado. Si cambiaron imágenes de nombre estable, restaurar también sus versiones anteriores:

```powershell
Invoke-LumenAws s3 cp (Join-Path $lumenRelease 'index-before.html') "s3://$lumenWebBucket/index.html" --content-type 'text/html' --cache-control 'no-cache' @lumenAwsArgs
```

API: repetir la actualización conservando los demás parámetros y asignando `ApiArtifactKey=$lumenPreviousApiKey`. Esperar estado estable, verificar el hash contra `api-hash-before.txt` y el flujo. No sobrescribir su zip.

Si el stack falla, leer eventos y estado Lambda antes de otro update. Un rollback que colisiona con una actualización Lambda requiere esperar y continuar el rollback sin omitir recursos, tal como se documentó en el release histórico. No lanzar actualizaciones superpuestas.

Nunca borrar DynamoDB ni revertir registros financieros para deshacer código. Una migración de datos o modificación incompatible necesita un plan específico. Ver [procedimiento AWS](../infra/README.md) y [registro de release](quality/release-report.md).
