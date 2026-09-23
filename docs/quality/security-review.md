# Revisión independiente de seguridad del checkout

Fecha: 2026-09-23, America/Bogota. **Controles locales ejecutados; integración real y publicación aún sin aprobar.** No es certificación PCI ni cobertura total de OWASP. Auditoría de solo lectura sobre implementación y AWS IaC; pruebas limitadas al proyecto y datos ficticios autorizados.

## Alcance y evidencia

Código revisado: frontend API/store/validación/checkout/polling; dominio, casos de uso, HTTP/DTO/guards, FileStore, DynamoStore, gateway sandbox, carga SSM y ciclo Lambda; `infra/template.yaml` y `infra/static-site/index.cjs`. La lectura comenzó sobre `ceb1965` y cambios de infraestructura en working tree; estos quedaron integrados en `f84fc565a382059ceb009669c151baaac33afaf3`, con CI Success confirmado. Solo los informes permanecen posteriores a ese commit.

QA reprodujo 65 tests Jest backend, 82 frontend, 55 escenarios Playwright integrados y 12 retests visuales. La UI/API son reales; el gateway y la tokenización externos son dobles de test. FileStore se usa en E2E; tests del adapter Dynamo emplean un cliente controlado. Evidencia y límites: [informe QA](qa-report.md), [reporte íntegro de 55 ejecuciones](../../tests/e2e/evidence/2026-09-23-full-55.json).

El servidor trata importes, estados, IDs y formularios del navegador como no confiables. La revisión de autorización, secuencia y datos de transacción sigue los controles pertinentes de [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), consultado el 2026-09-23. Esto no implica una auditoría de todos los riesgos de producción.

## Controles comprobados

| Área | Evidencia ejecutada / lectura | Resultado y límite |
|---|---|---|
| Dinero | QA-M01/M03; DTO rechaza campos financieros ajenos; cambio de total exige nueva revisión; cálculo entero en servidor. | PASS local; valor del cliente no determina el cobro. |
| Stock | Última unidad entre dos sesiones, reserva y finalización; caída/error/rechazo; expiración y carrera claim/expiry. | PASS local; onHand/reserved/available separados. Dynamo real pendiente. |
| Idempotencia | Create concurrente misma clave/cuerpo, conflicto de cuerpo; pay repetido simultáneo y delivery única. | PASS local; claim durable antes de red evita segundo envío. |
| Timeout | Gateway devuelve resultado incierto; refresh conserva PENDING/UNKNOWN sin crear ni cobrar otra vez. | PASS local; sin ID remoto requiere conciliación operativa, no reintento ciego. |
| Sesión / IDOR | Cookie HttpOnly, SameSite, hash en DB; sesión B no lee/paga tx/customer/delivery de A. | PASS HTTP; Secure en producción definido, validación remota pendiente. |
| CSRF / Origin | Token ausente/incorrecto y origen no permitido rechazados sin efecto. | PASS HTTP; ALLOWED_ORIGINS final debe ser el origen desplegado exacto. |
| Validación / errores | DTO estricto anidado, JSON malformado400, límite 413 y mensajes saneados. | PASS Jest/HTTP. |
| Refresh | Datos de entrega y transacción activa se restauran; tarjeta y consentimientos vacíos; respuesta create perdida recuperable. | PASS en cuatro proyectos de navegador. |
| Datos de tarjeta | Inspección requests propios, storage y DB; tokenización solo host externo permitido; datos efímeros. | PAN ausente en superficies inspeccionadas; no traces/videos automáticos ni datos reales. |
| Consentimientos | Dos casillas explícitas inicialmente vacías y enlaces; tokens efímeros. | PASS UI/unit; merchant real todavía pendiente. |
| Configuración | Allowlist de hosts/familias sandbox y secretos SSM; JSON inválido sanitizado; no override de variables de infraestructura. | PASS Jest; SSM y permisos reales pendientes. |
| Cold start | Inicialización concurrente compartida; error permite retry; módulos incluidos en cobertura. | PASS Jest; runtime-secrets y lambda-runtime100% en cuatro métricas. |
| Secretos | Escáner repositorio PASS; PDF/credenciales fuera de Git; errores controlados; DevTools Redux deshabilitado. | No se detectaron secretos en alcance revisado; no equivale a certificación de logs externos. |
| Caché | HTTP personalizado no-store; CloudFront API caching deshabilitado; HTML no-cache. | HTTP local y lectura IaC PASS; respuestas públicas pendientes. |
| Cabeceras | Helmet en API; CSP/HSTS/nosniff/frame/referrer/permissions en handler estático. | HTTP local + tests estáticos PASS; TLS y headers remotos pendientes. |

[Tokens de aceptación](https://docs.wompi.co/docs/colombia/tokens-de-aceptacion/) documenta los dos consentimientos. El adapter admite metadata de tarjeta directa y anidada, variantes presentes en [transacciones](https://docs.wompi.co/docs/colombia/transacciones/) y [métodos de pago](https://docs.wompi.co/docs/colombia/metodos-de-pago/). Consultados el 2026-09-23. El contraste documental no demuestra el comportamiento de la cuenta UAT.

**No existe endpoint webhook ni worker programado.** Las consultas autenticadas concilian por ID remoto y validan referencia, moneda e importe. QA-S07 (firma webhook) no se marca PASS: no aplica a la superficie actual. Si se añade, debe verificarse el checksum de [eventos oficiales](https://docs.wompi.co/docs/colombia/eventos/) antes de cualquier efecto. No se configura un webhook compartido como parte de esta revisión.

## Revisión AWS y entrega estática alternativa

La cuenta no pudo habilitar CloudFront según el coordinador; la alternativa usa API Gateway HTTP API HTTPS como origen único, Lambda de estáticos y S3 privado, manteniendo Nest Lambda + DynamoDB. `EnableCloudFront=false` es el valor predeterminado. QA verificó [origen público](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com): raíz/WebP 200, /.env 404, CSP/HSTS/caché correctos; /api/health y /api/docs 500 sin cabeceras propias, por SSM faltante según logs del coordinador. Esto es publicación parcial, no checkout cloud aprobado.

- S3 bloquea acceso público, cifra/versiona contenido y deniega transporte inseguro. El handler estático solo admite archivos públicos enumerados y assets JS/CSS con hash; no permite archivos ocultos, traversal, sourcemaps, directorios ni rutas API.
- El rol estático obtiene objetos únicamente del bucket del proyecto. El rol API limita operaciones a tabla/índice propios y GetParameter al parámetro exacto; Scan fue retirado. Las acciones Dynamo usadas corresponden a las operaciones que componen la transacción; [AWS documenta ese modelo IAM](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html).
- Handler estático fija MIME/cache y cabeceras, devuelve binario base64, trata HEAD sin body, limita el tamaño antes/después de leer y sanea errores. QA ejecutó `node --test infra/static-site/index.test.cjs`: **5/5 PASS**, incluidos traversal, dobles escapes y límite 5 MiB de body codificado.
- Ruta API específica /api/{proxy+} y rutas estáticas / y /{proxy+} están separadas. Pendiente comprobar en AWS la prioridad/routing, assets, documentación, cookies y respuesta de métodos no admitidos.
- Tabla con cifrado, PITR y Retain; logs 14d; los secretos se recuperan desde SSM al inicio y no se escriben en plantilla. El usuario autorizó su almacenamiento cifrado; la revisión automática volvió a rechazar la operación. Release proporciona un script para que el usuario complete la configuración manualmente; no se ha ejecutado desde QA ni intentado eludir ese bloqueo.
- No se reserva concurrencia 10: se retiró por cuota de la cuenta. El throttle del API es 15/s con burst 30. Lambda para cada asset añade latencia/costo frente a CDN; se debe medir el sitio real. No es defecto funcional demostrado.
- Si se activa CloudFront, el API no se cachea y la política AllViewerExceptHost permite usar el host del origen API, según [AWS](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html). También necesita smoke propio.

La lectura no encontró un defecto bloqueante en template/handler. cfn-lint, validate-template, creación de stack y actualización de AllowedOrigins fueron reportados PASS por el coordinador. También reportó create/read/update/rechazo CAS obsoleto contra Dynamo real y limpieza de un registro aislado, sin alterar catálogo/pagos. Esto no prueba todavía checkout en Lambda/Dynamo ni carga SSM. Esta auditoría solo hizo GET públicos, sin modificar recursos AWS.

## Hallazgos y estado

| ID | Severidad / riesgo | Corrección o evidencia | Estado |
|---|---|---|---|
| SEC-ENV-01 | Bloqueante para integración real | UAT falla confianza TLS según coordinador; ninguna transacción remota probada. Resolver cadena/entorno autorizado sin deshabilitar TLS. | ABIERTO, Backend/Release |
| SEC-ENV-02 | Bloqueante para entrega cloud | Estáticos HTTPS200; API/docs 500 por ParameterNotFound. SSM autorizado por usuario, operación automática bloqueada: configuración manual pendiente; luego smoke completo y versión. | ABIERTO, Release/QA |
| SEC-DOC-01 | Media, aceptación ambigua | UX-17 separa stock físico y disponibilidad reservada; tests aplican invariantes coherentes. | RESUELTO |
| SEC-REV-01 | Media, reservas obsoletas | Product/quote/replay ahora expiran reserva; API independiente prueba replay/pay vencido sin cargo. | RESUELTO local |
| SEC-REV-02 | Riesgo de repetición tras refresh | NOT_STARTED recupera tarjeta vacía y misma tx; UNKNOWN bloquea envío; fallos de tokenización/create probados. | RESUELTO local |
| SEC-REV-03 | Revisión pendiente de guards/env/IaC | Guardas y allowlist ejecutados; template/handler revisados y tests5/5. Parte remota queda en SEC-ENV-02. | RESUELTO local |
| SEC-REV-04 | Media, metadata tarjeta | Adapter soporta ambas formas documentadas con tests. Confirmación UAT pertenece a SEC-ENV-01. | RESUELTO local |
| QA-COV-01 | Calidad de evidencia | Lógica SSM/Lambda extraída del wrapper y cubierta 100%; no oculta en exclusiones. | RESUELTO |
| SEC-LIMIT-01 | Limitación operativa documentada | UNKNOWN sin ID remoto retiene inventario y requiere conciliación; no hay búsqueda por referencia asumida. | ACEPTADA como límite de implementación; no es venta aprobada |
| SEC-LIMIT-02 | Limitación de escalado | FileStore solo desarrollo de un proceso; rate counters API por proceso. Producción usa Dynamo + throttle API Gateway. | DOCUMENTADA; persistencia AWS pendiente |

## Condiciones de cierre

Release debe aportar URL/commit y probar HTTPS válido, S3 privado, HTML/assets/API/docs, cookies Secure, Origin/CSRF, recuperación durable en Dynamo y ausencia de datos/secretos en logs. Backend/QA deben demostrar al menos pago aprobado y rechazado con sandbox real, estado/stock/entrega coherentes e identificadores sanitizados. Un gateway simulado o CI verde no cierra estos requisitos.

Dictamen: **sin bloqueantes locales conocidos en escenarios ejecutados; gates sandbox y cloud abiertos**. No se atribuye puntuación ni ausencia universal de vulnerabilidades.
