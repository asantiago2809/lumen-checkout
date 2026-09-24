# Informe de QA independiente

Fecha: 2026-09-23, America/Bogota. **Validación local, núcleo AWS y pagos sandbox reales completados; CI final aprobado.** UI y API reales, FileStore temporal aislado y gateway controlado inyectado exclusivamente por tests. Tokenización externa interceptada. Estas pruebas no demuestran pago sandbox real. Las comprobaciones AWS y el pago real sandbox se enumeran por separado; el flujo público aprobado/rechazado tiene evidencia propia.

## Resultados reproducidos por QA

| Comando / comprobación | Resultado real | Evidencia |
|---|---|---|
| `npm run build -w apps/api` | PASS | API compilada con metadata Nest usada por harness HTTP |
| `npm run test:coverage -w apps/api` | **68 tests, 6 suites PASS**, ejecutados por Backend | Artefacto de cobertura leído por QA; los 65 previos reproducidos en fase anterior |
| `npm run test -w apps/api -- --runTestsByPath test/dynamo-http.spec.ts` | **3/3 PASS independientes** | HTTP/DTO/SDK reales con transporte AWS controlado; corrección 0c74bf7 |
| `npm run test:coverage -w apps/web` | **82 tests, 7 suites PASS** | `apps/web/coverage/coverage-summary.json` |
| `npm run typecheck -w apps/web` | PASS | TypeScript sin errores |
| `npm run build -w apps/web` | PASS | Vite; JS 280.85 kB / 90.17 kB gzip en ejecución observada |
| `npx playwright test` ampliado | **79 PASS, 0 skipped, 0 flaky** | `tests/e2e/evidence/2026-09-23-full-79.json`; inicio 23:49:39 UTC, duración 88.55s |
| Retest visual final | **12 PASS** | Producto, formulario con errores, resumen largo; cuatro proyectos; duración 21.8s |
| `npm run check:secrets` | PASS en 131 archivos encontrados | Escáner local; no reemplaza revisión cloud |
| Lectura `infra/template.yaml` | Revisión y smokes AWS completados | `security-review.md`; cfn-lint/validate-template PASS reportados por coordinador |

El primer arranque del harness requirió corregir import.meta incompatible con CommonJS. El primer E2E de catálogo requirió actualizar un selector tras cambiar el alt del producto. Eran defectos del test, no de aplicación; el retest completo posterior pasó. Los mensajes proxy ECONNRESET durante cierre de API temporal se corrigieron cerrando primero la página. El retest visual posterior pasó sin esos mensajes.

El pase original de 55 y el retest visual de 12 se conservan como historial. El pase de 79 contiene 11 HTTP + 17 UI por 4 proyectos, con 24 ejecuciones nuevas; no se suman los reportes como escenarios únicos. Los tests y ajustes CSS quedaron en 3edc404; [CI 35935640877](https://github.com/asantiago2809/lumen-checkout/actions/runs/35935640877) pasó con 147 Jest + 79 E2E + 5 estáticos según Release. La corrección posterior 0c74bf7 añade 3 Jest; su integración en fca0339 pasó [CI final 35936553836](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936553836), verificado por API pública de GitHub.

## Cobertura vigente

| App | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Backend | 98.48% | 95.28% | 100% | 98.48% |
| Frontend | 96.10% | 95.27% | 95.23% | 97.20% |

Ambas superan >80% exigido y >=85% global deseado. Frontend excluye tipos/tests. Backend excluye solo wrappers main/lambda: QA pidió extraer secretos SSM y cache/reintento Lambda, ahora módulos incluidos con tests al 100%. El porcentaje global no implica cobertura completa de cada función de bootstrap. Las cifras frontend provienen del rerun tras formateo; las backend incluyen la corrección de draft y sus 3 regresiones. QA leyó el coverage-summary y reprodujo los 3 casos nuevos; no atribuye a su ejecución el rerun completo de 68 realizado por Backend.

## Navegadores y alcance

Windows, Node 24.14.0. Motores ejecutados: Chromium 153.0.8010.12, Firefox 155.0 y WebKit 26.6. Proyectos: Chromium 1440x900, Chromium 375x667, Firefox escritorio y WebKit escritorio. Emulación no equivale a Safari en iPhone físico.

79 ejecuciones = 11 casos HTTP independientes + 17 flujos UI por cuatro proyectos. El baseline inicial tenía 55:

- Catálogo real, modal/errores, dos consentimientos vacíos, teclado, foco y retorno.
- Aprobación con doble clic, una entrega y un consumo de stock; rechazo sin entrega y reserva liberada.
- UNKNOWN tras refresh sin nuevo cobro; tokenización fallida recupera el mismo pedido.
- Respuesta create perdida después de persistir realmente en API; recuperación por sesión sin nueva transacción.
- Refresh conserva entrega y limpia tarjeta/consentimientos; cambio de precio exige nueva revisión.
- CSRF/origen, aislamiento entre sesiones, cuerpo financiero inyectado, idempotencia concurrente, última unidad y expiración.
- PAN ausente en requests propios/storage/resumen/persistencia inspeccionada; datos de entrega fuera de storage navegador.
- axe sin violaciones critical/serious en producto, formulario con errores y aprobado/rechazado/pendiente comprobados. No sustituye lector de pantalla.
- Catálogo sin overflow a 320x568,375x667,667x375,768x1024,1440x900. Resumen largo a 320,375,667 paisaje,768; CTA alcanzable y total completo. Retest final verificó formulario vacío/con errores a 320/375/667 paisaje.

La ampliación QA-X01–X06 agrega preferencia reduced motion dinámica, Shift+Tab/Enter/inert/salto al contenido, edición de resumen conservando entrega, salir y reabrir PENDING sin cancelar, medidas de targets/input font, layouts 390x844/1024x768 y catálogo loading/error/agotado con recuperación. El éxito usa API real; loading/error inyectan fallos de transporte explícitos.

WebKit Windows omitió links con Tab/Alt+Tab y enfocó el CTA. El test conserva una anotación de límite y verifica Enter del skip-link tras foco explícito; no afirma navegación nativa de links aprobada. Chromium/Firefox sí la ejecutaron nativamente. No se simuló zoom mediante CSS.

WebP: 12,192 bytes (640) y 31,056 bytes (1200), con carga real y dimensiones comprobadas. No se atribuye puntaje Lighthouse ni rendimiento cloud.

## Defectos y retests

| ID | Hallazgo | Resolución | Estado |
|---|---|---|---|
| QA-VIS-01 | Textos unidos al ocultar br: paratus/necesitanun. | Espacios explícitos; aserción heading y revisión visual moderna. | RESUELTO local |
| QA-VIS-02 | Thumbnail SVG distinto de foto catálogo. | ProductImage compartido, src comparado con API y captura. | RESUELTO local |
| QA-VIS-03 | Flecha se desplazaba con reduced motion. | Override transform:none; QA-X01 pasa en cuatro proyectos. | RESUELTO |
| QA-VIS-04 | Editar tenía 36.89 px de ancho en 375 px. | Target mínimo 44; QA-X05 mide botones>=44 y CTA>=48. | RESUELTO |
| QA-VIS-05 | Labels sin config tenían 22.39 px de alto según medición frontend. | min-height 44 y padding; QA-X05 confirma labels 375/390, inputs>=48/font>=16. | RESUELTO |
| QA-HARNESS-01 | CI reportó ENOTEMPTY por trabajo activo tras cerrar socket. | Harness cierra contexto/clientes, luego API, drena promesas de servicio/store reales y solo después borra; maxRetries 2 FS de respaldo. | RESUELTO en 79 locales y CI Linux 35935640877 |
| SEC-DOC-01 | Confusión stock físico/disponibilidad reservada. | UX-17 ajustado; tests separan onHand/reserved/available. | RESUELTO |
| SEC-REV-01 | Replay/product/quote sin expirar reserva. | Expiración añadida; QA-M12 pasa sin cobro tardío. | RESUELTO local |
| SEC-REV-04 | Metadata tarjeta directa/anidada. | Adapter y tests soportan ambos formatos. | RESUELTO; metadata pertinente confirmada en sandbox real |
| SEC-CLOUD-DRAFT | DTO de Nest no serializable en Dynamo. | Snapshot plano; 3 regresiones independientes y 20 checks AWS reportados PASS. | RESUELTO |
| QA-COV-01 | Lógica SSM/cold start excluida con entrypoint. | Extraída y probada: JSON inválido, allowlist, cache/reintento. | RESUELTO local |

## Evidencia y versión

Capturas sanitizadas en `tests/e2e/evidence/`: producto desktop/mobile, formulario vacío, resumen enmascarado, aprobado, pendiente y resumen paisaje. Datos ficticios; no comprobantes financieros. QA inspeccionó visualmente producto desktop/mobile, resumen mobile, aprobado mobile y resumen paisaje.

Código QA/CSS: `3edc404`, pase 79 y CI Linux Success. Código API posterior: `0c74bf7`, snapshot plano para Dynamo, 68 Jest reportados por Backend y 3 regresiones nuevas reproducidas independientemente. Informes y evidencias se congelan después; la evidencia real de pago se presenta por separado debajo. Repetir únicamente controles afectados por nuevos cambios.

QA abrió el [repositorio público](https://github.com/asantiago2809/lumen-checkout) sin autenticación. La [ejecución Linux CI](https://github.com/asantiago2809/lumen-checkout/actions/runs/35932314066), commit eda790c, muestra Success, duración 3m54s y dos artefactos; fue confirmada por lectura pública independiente. La segunda ejecución [CI final](https://github.com/asantiago2809/lumen-checkout/actions/runs/35933599708) también fue verificada públicamente: Success en f84fc56, 3m54s y dos artefactos. Son evidencia histórica de esos commits. El CI ampliado posterior 35935640877 valida 3edc404; no se extrapola a cambios posteriores.

## Publicación AWS y regresión remota

QA consultó con TLS habilitado el [sitio AWS](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com): raíz 200, WebP 200 y /.env 404, con CSP/HSTS/caché coherentes. Después del paso manual SSM del usuario, reprodujo health/products/docs/docs-json 200 con cabeceras y config 200 con ambiente sandbox/aceptación presente; no publicó keys ni tokens. El primer 500 ParameterNotFound quedó resuelto.

El coordinador confirmó SecureString v1, cookie Secure/HttpOnly/SameSite y Origin/CSRF 403. Lambda obtiene configuración UAT válida con TLS normal: el error de confianza previo corresponde al entorno local, no a credenciales globalmente inválidas.

El smoke real descubrió después un 500 al guardar draft: el SDK rechazaba instancias DTO de Nest. Backend corrigió snapshot plano en 0c74bf7 sin relajar SDK/validación. QA revisó el diff y reprodujo los 3 nuevos tests con HTTP y marshaller reales; primero demuestran el rechazo original sin red, luego verifican draft/recarga, campos ajenos 400 y create/replay/cancel. El transporte AWS de esos tests es controlado.

**Retest remoto reportado por Release:** `scripts/smoke-cloud.mjs` salió 0 y pasó 20 checks a 2026-09-24T00:01:04Z, tras UPDATE_COMPLETE del despliegue API 0c74bf7. Incluye health/docs/OpenAPI/catalogue, cookie segura, no-store, Origin/CSRF 403, draft PUT/restore 200, quote de importes enteros, PENDING 201, replay 200 mismo ID, stock 12→11, DELETE 204, ERROR/NOT_STARTED/canPay=false/delivery=null y stock restaurado a 12. No envió PAN ni llamó /pay. **SEC-CLOUD-DRAFT resuelto.** El pago real posterior se documenta debajo.

QA reprodujo 5 tests del handler estático: allowlist/traversal/MIME/cache/HEAD/tamaño/error. El smoke Dynamo inicial y el posterior de checkout son evidencia distinta de persistencia cloud; no se presentan como transacciones de pago.

## Pago real sandbox inspeccionado independientemente

[Workflow 35936568755](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755), commit fca0339: Success público comprobado por QA. [Reporte saneado](../../tests/e2e/evidence/live-sandbox-35936568755/report.json), 2026-09-24T00:03:45.712Z–00:04:20.999Z, Chromium 153.0.8010.12/375×667. QA leyó el script y reporte e inspeccionó ocho capturas. No intercepta tráfico ni deshabilita TLS; preflight limita origen/ambiente/llave a sandbox.

| Caso | Create / tokenización / pay | Resultado/entrega | Stock | Recarga |
|---|---|---|---|---|
| Aprobado | 1 / 1 (201) / 1 (202) | APPROVED, entrega READY vinculada | 12→11 | Dos recargas, mismo ID sin repost |
| Rechazado | 1 / 1 (201) / 1 (202) | DECLINED, ninguna entrega | 11→11 | Dos recargas, mismo ID sin repost |

Release confirmó con lectura física consistente de Dynamo: onHand 11, reserved 0, available 11. Los IDs/montos del reporte son de transacciones ficticias sandbox. Capturas saneadas sin PAN/CVC ni PII real; máscara rosa deliberada en resumen, resultados con solo últimos cuatro dígitos. Las primeras fotos de producto aún cargaban; los retornos muestran la imagen y stock. No se certifica rendimiento de imagen por esas capturas iniciales.

**Observación QA-OBS-01:** cada caso registró un NETWORK_FAILURE de /api/checkout/draft. El artefacto no conserva causa exacta y no debe llamarse “cero errores de red”. Hay PUT previos 200, persistencia/restauración y pago completos; no se reprodujo pérdida de datos ni duplicación. Se conserva la observación, sin convertir una hipótesis de abort al recargar en un hecho.

## Pendientes y límites de cierre

1. CI final 35936553836 en fca0339 confirmado completed/success mediante API pública de GitHub; también PASS el workflow sandbox y el CI previo. El ajuste posterior de diagnóstico fue leído y pasó node --check; no se usó para reescribir el reporte.
2. Hardware, lector de pantalla, autofill y zoom reales no ejecutados; WebKit nativo de enlaces tiene la limitación descrita.
3. La nota externa la asigna el evaluador; no se promete ausencia universal de fallos.

Release verificó propiedad de la instancia anterior en el stack trama-live y confirmó estado stopped tras detenerla. Conservó EBS/EIP/stacks para reversión; no es eliminación total ni costo cero. Cierra la sustitución autorizada sin borrar recursos ajenos.

Dictamen: **recomendación favorable de entrega: flujo funcional, seguridad pertinente, diseño en alcance, CI y sandbox real verificados**. Sin puntuación garantizada.
