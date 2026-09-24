# Revisión independiente de seguridad del checkout

Fecha: 2026-09-23, America/Bogota. **Controles locales y núcleo AWS verificados; integración de pago sandbox real verificada.** No es certificación PCI ni cobertura total de OWASP. Auditoría de lectura sobre implementación/IaC y pruebas limitadas al proyecto con datos ficticios autorizados.

## Alcance y evidencia

Se revisaron frontend API/store/validación/checkout/polling; dominio, casos de uso, HTTP/DTO/guards, FileStore, DynamoStore, gateway sandbox, carga SSM y ciclo Lambda; `infra/template.yaml` y `infra/static-site/index.cjs`. QA/CSS corresponde a 3edc404; el fix de snapshot de dominio para Dynamo corresponde a 0c74bf7.

Evidencia vigente: 79 Playwright independientes PASS (11 HTTP y 17 UI por cuatro proyectos), 82 Jest frontend y 68 Jest backend. Backend ejecutó la suite completa de 68; QA reprodujo los 3 casos nuevos HTTP/SDK Dynamo reales con transporte controlado y leyó la cobertura resultante. Los 65 backend anteriores fueron reproducidos durante la fase anterior. También pasaron 5 pruebas del handler estático. [Informe QA](qa-report.md) y [reporte íntegro 79](../../tests/e2e/evidence/2026-09-23-full-79.json).

UI/API son reales en E2E; gateway y tokenización externos son dobles. El FileStore temporal no demuestra comportamiento AWS. La nueva regresión usa el marshaller real del SDK sin red AWS. Los resultados remotos se distinguen debajo.

La autorización, secuencia y datos de transacción se contrastaron con [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), consultado el 2026-09-23. Esto no implica una auditoría exhaustiva de producción.

## Controles comprobados

| Área | Evidencia | Resultado y límite |
|---|---|---|
| Dinero | QA-M01/M03; DTO rechaza campos financieros ajenos; total cambia solo con nueva revisión; cálculo entero servidor. | PASS local y quote AWS; valor del cliente no determina el cobro. |
| Stock | Última unidad entre sesiones, reserva/finalización, expiración y carrera claim/expiry. | PASS local; smoke AWS reserva 12→11 y cancelación restaura 12. E14 confirma aprobación 12→11 y rechazo 11→11; lectura física final 11/0/11. |
| Idempotencia | Create concurrente misma clave/cuerpo, conflicto, pay simultáneo y delivery única. | PASS local; AWS create/replay mantiene ID. E14 confirma una sola solicitud de pago por caso y ninguna tras refresh. |
| Timeout | Resultado incierto conserva PENDING/UNKNOWN tras refresh sin nuevo cobro. | PASS local; sin ID remoto requiere conciliación operativa. |
| Sesión/IDOR | Cookie HttpOnly/SameSite, hash en DB; sesión B no lee/paga recursos de A. | PASS HTTP; Release confirmó cookie Secure/HttpOnly/SameSite en AWS. |
| CSRF/Origin | Token ausente/incorrecto y origen no permitido rechazados sin efecto. | PASS local y AWS 403; AllowedOrigins coincide con origen público. |
| Validación/errores | DTO estricto anidado, JSON malformado 400, límite 413 y mensajes saneados. | PASS Jest/HTTP; snapshot plano conserva validación y marshaller estricto. |
| Refresh | Entrega/tx se restauran; tarjeta y consentimientos vacíos; create perdido recuperable. | PASS en cuatro proyectos; draft PUT/restore en AWS confirmado por Release. |
| Tarjeta | Requests propios, storage y DB inspeccionados; tokenización solo al host permitido; campos efímeros. | PAN ausente en superficies inspeccionadas; ningún PAN enviado al smoke AWS. |
| Consentimientos | Dos casillas explícitas vacías; links y tokens efímeros. | PASS UI/unit; merchant real desde Lambda 200 y pagos reales E14 aprobados/rechazados. |
| Configuración | Allowlist sandbox/SSM; JSON inválido saneado; no override de variables de infraestructura. | PASS Jest; SecureString v1 configurado por usuario y leído por Lambda. |
| Cold start | Inicialización concurrente compartida; error permite retry; lógica incluida en cobertura. | PASS Jest; módulos de secretos/runtime cubiertos al 100% en sus cuatro métricas. |
| Secretos | Escáner, revisión de superficies, PDF/credenciales fuera de Git; DevTools Redux apagado. | Sin detecciones en alcance revisado; no certifica todos los logs remotos. |
| Caché | Datos personalizados no-store; HTML no-cache; assets con hash immutable. | PASS local y cabeceras públicas verificadas. |
| Cabeceras/TLS | CSP/HSTS/nosniff/frame/referrer/permissions en respuestas pertinentes. | PASS público con TLS habilitado; mismo origen para UI/API. |

Los [tokens de aceptación](https://docs.wompi.co/docs/colombia/tokens-de-aceptacion/) documentan los dos consentimientos. El adapter admite metadata directa/anidada conforme a [transacciones](https://docs.wompi.co/docs/colombia/transacciones/) y [métodos de pago](https://docs.wompi.co/docs/colombia/metodos-de-pago/), consultados el 2026-09-23. El contraste documental no prueba un cargo real.

**No existe endpoint webhook ni worker programado.** Consultas autenticadas concilian por ID remoto y validan referencia, moneda e importe. QA-S07 (firma webhook) no se marca PASS: no aplica a la superficie actual. Si se añade, se debe verificar el checksum de [eventos oficiales](https://docs.wompi.co/docs/colombia/eventos/) antes de efectos.

## AWS y entrega estática

CloudFront no se pudo habilitar por la verificación de la cuenta. La alternativa usa API Gateway HTTP API HTTPS como origen único, Lambda de estáticos y S3 privado, más Nest Lambda/DynamoDB. `EnableCloudFront=false` por defecto.

QA verificó GET en el [origen público](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com): sitio/WebP 200, /.env 404, health/products/docs/docs-json/config 200; cabeceras/caché válidas y config indica sandbox. No publicó keys ni tokens. El fallo inicial ParameterNotFound se resolvió después de la configuración manual del usuario.

- S3 bloquea acceso público, cifra/versiona y deniega transporte inseguro. El handler solo admite archivos públicos enumerados y JS/CSS con hash; rechaza ocultos, traversal, sourcemaps, directorios y API.
- El rol estático lee únicamente el bucket propio. El API limita tabla/índice y GetParameter al parámetro exacto; Scan fue retirado. Las acciones Dynamo corresponden a operaciones internas de la transacción, como [documenta AWS](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html).
- Handler: MIME/cache, binarios base64, HEAD vacío, límite antes/después de lectura y errores saneados. `node --test infra/static-site/index.test.cjs`: 5/5 PASS, incluidos traversal, doble escape y límite 5 MiB codificado.
- Rutas API/estáticas separadas; Swagger remoto carga assets y expone 14 operaciones según revisión de Backend. QA obtuvo documentación/JSON 200.
- Tabla cifrada, PITR y Retain; logs 14 días; SSM en runtime, no en plantilla. La revisión automática bloqueó cargar secretos; el usuario completó el paso manual autorizado. No se usó un bypass.
- Concurrencia reservada retirada por cuota de cuenta. API Gateway throttle 15/s, burst 30. Lambda por asset añade costo/latencia frente a CDN; no se atribuye una medición de rendimiento inexistente.
- Si se activa CloudFront, API sin caché y política AllViewerExceptHost según [AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html); requiere su propio smoke.

Release reportó cfn-lint/validate-template y despliegues PASS. El smoke inicial Dynamo comprobó create/read/update/CAS y limpió un registro aislado.

**Retest posterior 2026-09-24T00:01:04Z (todavía 23 de septiembre en Bogotá):** Release ejecutó `scripts/smoke-cloud.mjs`, 20 checks PASS y exit 0 sobre API 0c74bf7 redeployada, stack UPDATE_COMPLETE. Incluye health/Swagger/OpenAPI/catalogue, cookie Secure/HttpOnly/SameSite, no-store, Origin/CSRF 403, draft PUT/restore 200, quote entero, create PENDING 201, replay 200 mismo ID, reserva 12→11, DELETE 204 y estado ERROR/NOT_STARTED/canPay=false/delivery=null, stock restaurado a 12. Ningún PAN ni llamada /pay en ese smoke. Cierra la regresión del draft y valida operaciones reales de Lambda/SDK/IAM/Dynamo; no demuestra pago sandbox.

## Hallazgos

| ID | Riesgo | Evidencia/acción | Estado |
|---|---|---|---|
| SEC-ENV-01 | Gate de pago real | Lambda obtiene merchant con TLS válido; TLS local falla confianza. E14 confirma tokenización y pagos aprobado/rechazado reales sin bypass ni intercept. | RESUELTO |
| SEC-ENV-02 | API inicialmente sin configuración | Usuario configuró SecureString v1; health/catalog/config/docs 200. | RESUELTO |
| SEC-CLOUD-DRAFT | DTO de Nest rechazado por marshaller Dynamo | Snapshot plano explícito sin relajar DTO/SDK; 3 regresiones independientes PASS y smoke AWS 20/20. | RESUELTO |
| SEC-DOC-01 | Stock físico confundido con disponibilidad | UX-17 y tests separan onHand/reserved/available. | RESUELTO |
| SEC-REV-01 | Reservas obsoletas | Product/quote/replay expiran reserva; QA-M12 sin cargo tardío. | RESUELTO local |
| SEC-REV-02 | Repetición tras refresh | NOT_STARTED recupera tarjeta vacía/misma tx; UNKNOWN bloquea envío; QA-X04 no cancela ni duplica. | RESUELTO local |
| SEC-REV-03 | Guards/env/IaC pendientes de revisión | Revisión y HTTP negativo; lectura IaC y 5 tests; smoke AWS pertinente. | RESUELTO |
| SEC-REV-04 | Metadata tarjeta directa/anidada | Adapter/tests soportan ambos formatos. | RESUELTO; E14 confirmó metadata pertinente al mostrar marca/últimos cuatro dígitos |
| QA-COV-01 | Lógica runtime fuera de cobertura | Extraída y cubierta; no exclusión oportunista. | RESUELTO |
| QA-HARNESS-01 | Trabajo activo al borrar FileStore | Cierre contexto/clientes, API y drenaje de operaciones reales; filesystem retries solo respaldo. 79 local/CI PASS, sin test retries. | RESUELTO |
| SEC-LIMIT-01 | UNKNOWN sin ID remoto retiene reserva | Requiere conciliación operativa; jamás se declara venta aprobada. | LÍMITE DOCUMENTADO |
| SEC-LIMIT-02 | FileStore/rate counters por proceso | FileStore solo desarrollo; AWS usa Dynamo y throttle Gateway. | LÍMITE DOCUMENTADO |

## Confirmación de pago y límites

El [workflow 35936568755](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755) terminó Success público verificado por QA. QA leyó script/reporte y revisó ocho capturas saneadas: Chromium real sin intercept ni bypass TLS contra sitio AWS y endpoint UAT sandbox. [Evidencia original](../../tests/e2e/evidence/live-sandbox-35936568755/report.json): cada caso realiza una creación PENDING, una tokenización 201 y un pay 202; después confirma estado autoritativo y dos recargas sin repost. APPROVED crea delivery y disponibilidad 12→11; DECLINED no crea delivery y mantiene 11. Release confirmó onHand 11/reserved 0/available 11 en Dynamo.

Se conserva QA-OBS-01: un NETWORK_FAILURE de draft por caso, sin causa exacta en el artefacto; guardados previos 200 y restauración/pago completos. No se afirma cero errores de red ni se infiere un abort como hecho. No hay evidencia de pérdida de datos o doble cobro en esos casos.

CI final fca0339 terminó Success (35936553836), verificado mediante API pública de GitHub. La mejora posterior de clasificación de requests fallidos se leyó y pasó node --check; no altera retrospectivamente el artefacto real. Hardware/lector/autofill/zoom reales no ejecutados; no son sustituidos por axe/emulación. No se certifica la ausencia de secretos en todo log remoto posible; sí las superficies y artefactos inspeccionados.

La instancia del despliegue previo, identificada por Release como recurso propio del stack trama-live, fue detenida reversiblemente y se confirmó stopped; almacenamiento/recursos de recuperación conservados.

Dictamen: **sin bloqueantes conocidos en escenarios ejecutados; gates de SSM, núcleo cloud y sandbox cerrados**. No se atribuye nota, certificación ni ausencia universal de vulnerabilidades.
