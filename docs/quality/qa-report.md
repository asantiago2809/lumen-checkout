# Informe de QA independiente

Fecha: 2026-09-23, America/Bogota. **Validación local completada; entrega pública todavía no aprobada.** UI y API reales, FileStore temporal aislado y gateway controlado inyectado exclusivamente por tests. Tokenización externa interceptada. Estas pruebas no demuestran pago sandbox real ni despliegue AWS.

## Resultados reproducidos por QA

| Comando / comprobación | Resultado real | Evidencia |
|---|---|---|
| `npm run build -w apps/api` | PASS | API compilada con metadata Nest usada por harness HTTP |
| `npm run test:coverage -w apps/api` | **65 tests, 5 suites PASS** | `apps/api/coverage/coverage-summary.json` |
| `npm run test:coverage -w apps/web` | **82 tests, 7 suites PASS** | `apps/web/coverage/coverage-summary.json` |
| `npm run typecheck -w apps/web` | PASS | TypeScript sin errores |
| `npm run build -w apps/web` | PASS | Vite; JS 280.85 kB / 90.17 kB gzip en ejecución observada |
| `npx playwright test` | **55 PASS, 0 skipped, 0 flaky** | `tests/e2e/evidence/2026-09-23-full-55.json`; inicio 23:04:35 UTC, duración 64.6s |
| Retest visual final | **12 PASS** | Producto, formulario con errores, resumen largo; cuatro proyectos; duración 21.8s |
| `npm run check:secrets` | PASS en 110 archivos encontrados | Escáner local; no reemplaza revisión cloud |
| Lectura `infra/template.yaml` | Revisión completada; gates remotos pendientes | `security-review.md`; cfn-lint/validate-template PASS reportados por coordinador |

El primer arranque del harness requirió corregir import.meta incompatible con CommonJS. El primer E2E de catálogo requirió actualizar un selector tras cambiar el alt del producto. Eran defectos del test, no de aplicación; el retest completo posterior pasó. Los mensajes proxy ECONNRESET durante cierre de API temporal se corrigieron cerrando primero la página. El retest visual posterior pasó sin esos mensajes.

## Cobertura final observada

| App | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Backend | 98.21% | 95.02% | 96.90% | 98.21% |
| Frontend | 96.10% | 95.27% | 95.23% | 97.20% |

Ambas superan >80% exigido y >=85% global deseado. Frontend excluye tipos/tests. Backend excluye solo wrappers main/lambda: QA pidió extraer secretos SSM y cache/reintento Lambda, ahora módulos incluidos con tests al 100%. El porcentaje global no implica cobertura completa de cada función de bootstrap. Las cifras de ambas apps provienen del rerun final tras formateo, que cambió el conteo de líneas.

## Navegadores y alcance

Windows, Node 24.14.0. Motores ejecutados: Chromium 153.0.8010.12, Firefox 155.0 y WebKit 26.6. Proyectos: Chromium 1440x900, Chromium 375x667, Firefox escritorio y WebKit escritorio. Emulación no equivale a Safari en iPhone físico.

55 ejecuciones = 11 casos HTTP independientes + 11 flujos UI por cuatro proyectos:

- Catálogo real, modal/errores, dos consentimientos vacíos, teclado, foco y retorno.
- Aprobación con doble clic, una entrega y un consumo de stock; rechazo sin entrega y reserva liberada.
- UNKNOWN tras refresh sin nuevo cobro; tokenización fallida recupera el mismo pedido.
- Respuesta create perdida después de persistir realmente en API; recuperación por sesión sin nueva transacción.
- Refresh conserva entrega y limpia tarjeta/consentimientos; cambio de precio exige nueva revisión.
- CSRF/origen, aislamiento entre sesiones, cuerpo financiero inyectado, idempotencia concurrente, última unidad y expiración.
- PAN ausente en requests propios/storage/resumen/persistencia inspeccionada; datos de entrega fuera de storage navegador.
- axe sin violaciones critical/serious en producto, formulario con errores y aprobado/rechazado/pendiente comprobados. No sustituye lector de pantalla.
- Catálogo sin overflow a 320x568,375x667,667x375,768x1024,1440x900. Resumen largo a 320,375,667 paisaje,768; CTA alcanzable y total completo. Retest final verificó formulario vacío/con errores a 320/375/667 paisaje.

WebP: 12,192 bytes (640) y 31,056 bytes (1200), con carga real y dimensiones comprobadas. No se atribuye puntaje Lighthouse ni rendimiento cloud.

## Defectos y retests

| ID | Hallazgo | Resolución | Estado |
|---|---|---|---|
| QA-VIS-01 | Textos unidos al ocultar br: paratus/necesitanun. | Espacios explícitos; aserción heading y revisión visual moderna. | RESUELTO local |
| QA-VIS-02 | Thumbnail SVG distinto de foto catálogo. | ProductImage compartido, src comparado con API y captura. | RESUELTO local |
| SEC-DOC-01 | Confusión stock físico/disponibilidad reservada. | UX-17 ajustado; tests separan onHand/reserved/available. | RESUELTO |
| SEC-REV-01 | Replay/product/quote sin expirar reserva. | Expiración añadida; QA-M12 pasa sin cobro tardío. | RESUELTO local |
| SEC-REV-04 | Metadata tarjeta directa/anidada. | Adapter y tests soportan ambos formatos. | RESUELTO local; UAT pendiente |
| QA-COV-01 | Lógica SSM/cold start excluida con entrypoint. | Extraída y probada: JSON inválido, allowlist, cache/reintento. | RESUELTO local |

## Evidencia y versión

Capturas sanitizadas en `tests/e2e/evidence/`: producto desktop/mobile, formulario vacío, resumen enmascarado, aprobado, pendiente y resumen paisaje. Datos ficticios; no comprobantes financieros. QA inspeccionó visualmente producto desktop/mobile, resumen mobile, aprobado mobile y resumen paisaje.

HEAD de cierre de código/infra: `f84fc565a382059ceb009669c151baaac33afaf3`. El reporte local de 55 precede el formato backend de `ceb1965`; Jest se repitió después y CI volvió a ejecutar la suite completa sobre f84fc56. La infraestructura alternativa ya está integrada; únicamente informes permanecen posteriores. Repetir controles afectados si cambia implementación.

QA abrió el [repositorio público](https://github.com/asantiago2809/lumen-checkout) sin autenticación. La [ejecución Linux CI](https://github.com/asantiago2809/lumen-checkout/actions/runs/35932314066), commit eda790c, muestra Success, duración 3m54s y dos artefactos; fue confirmada por lectura pública independiente. La segunda ejecución [CI final](https://github.com/asantiago2809/lumen-checkout/actions/runs/35933599708) también fue verificada públicamente: Success en f84fc56, 3m54s y dos artefactos. Incluye código/infra finales; quedan únicamente informes posteriores.

## Publicación parcial comprobada

QA consultó con TLS habilitado [sitio AWS](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com): raíz 200 con HTML 665 B, WebP 200 con 12,192 B y /.env 404; CSP/HSTS y caché coherentes. /api/health y /api/docs devuelven 500, sin cabeceras de aplicación. El coordinador identifica ParameterNotFound por SSM faltante y reporta stack CREATE_COMPLETE/AllowedOrigins UPDATE_COMPLETE. **No es un checkout público funcional aprobado.**

QA reprodujo los 5 tests del handler estático: PASS (allowlist/traversal/MIME/cache/HEAD/tamaño/error). El coordinador reporta smoke Dynamo real de create/read/update/rechazo de versión obsoleta y limpieza de un registro único, sin tocar catálogo/pagos. Ese smoke no sustituye el checkout completo en Lambda/Dynamo.

## Dependencias que impiden aprobar entrega

1. Sandbox real: fallo TLS untrusted root reportado por coordinador; no hay pago real verificado. No desactivar TLS ni contar gateway test como proveedor.
2. AWS: estáticos HTTPS accesibles, API/Swagger 500 por SSM faltante. El usuario ya autorizó guardar SSM cifrado; la revisión automática rechazó de nuevo la operación. Queda una acción manual de configuración guiada por Release y el smoke completo posterior.
3. README/changelog ya contienen modelo, métricas finales y límites; faltan URL/API funcionales y verificación de versión desplegada; CI del código final f84fc56 pasa.
4. DynamoDB: adapter unitario más smoke real limitado comunicado por Release; HTTP E2E usa FileStore de un proceso. Falta checkout completo con Lambda/Dynamo. Webhook no expuesto; README describe conciliación por consultas.
5. No iPhone físico ni lector de pantalla real. La matriz automatizada no certifica todas las combinaciones posibles.

Dictamen: **apto para continuar validación cloud/sandbox; no listo todavía para entrega final**. Sin puntuación garantizada.
