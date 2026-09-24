# Auditoría de cumplimiento y condiciones de entrega

> **Registro histórico, sustituido por la [auditoría de entrega](delivery-audit.md).** La [rúbrica](rubric-evaluation.md) conserva la progresión y los hallazgos de cada revisión. El cierre posterior verifica 170 Jest, 103 E2E, 12 pruebas estáticas y una nueva pareja sandbox real sobre la aplicación corregida. Las evidencias siguientes conservan sus versiones y alcances originales: no se borraron hallazgos ni se atribuyeron pruebas nuevas a este corte anterior.

**Dictamen al 2026-09-23: implementación, QA local y pagos sandbox públicos verificados; CI final aprobado y sustitución reversible completada. Recomendación de entrega favorable en el alcance probado.** Se revisaron los 82 controles. Hay **81 Cumple en el alcance indicado, 0 Bloqueados y 1 Pendiente (nota externa)**. Un Cumple local demuestra el criterio específico; no convierte el gateway de prueba en una integración real. No se asigna puntuación ni se promete ausencia absoluta de defectos.

## Alcance y versión

| Dato | Evidencia |
|---|---|
| Auditor | Agente de requisitos/QA independiente de implementación |
| Fecha/zona | 2026-09-23, America/Bogota |
| Fuente | PDF privado de 7 páginas, leído completo; matriz 82 IDs en [requisitos](../requirements.md) |
| Código evaluado | `3edc404`: ampliación QA/CSS, 79 E2E locales y CI Linux. `0c74bf71c8b533fd38b2330dcba67718e662d880`: corrección Dynamo, 68 Jest reportados por Backend y 3 regresiones reproducidas por QA. |
| Árbol de trabajo | fca0339 integra el código probado y los scripts de release; informes/evidencia se cierran después. El ajuste posterior del script solo clasifica eventos de red, fue leído y pasó node --check; no se repitieron compras ni se alteró el reporte original. |
| GitHub | [Repositorio público](https://github.com/asantiago2809/lumen-checkout), [PR1](https://github.com/asantiago2809/lumen-checkout/pull/1) y [PR2 de QA/diseño](https://github.com/asantiago2809/lumen-checkout/pull/2) reales |
| Entorno QA | Windows, Node 24.14.0; Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6 |
| Frontend/API AWS/Swagger público | [Origen AWS](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com): estáticos, health, catálogo y Swagger 200. Configuración sandbox real 200. Retest de núcleo AWS y flujo real APPROVED/DECLINED desde Chromium de CI comprobados. |
| Sandbox real | APPROVED/DECLINED reales con TLS válido y sin intercept: workflow 35936568755 Success, informe y capturas inspeccionados. El fallo TLS previo es local. |
| Fecha objetivo del usuario | Lunes; planificación 2026-09-28, entregar antes si pasan gates |

La fuente exige cloud de forma general y AWS en entregables; se adopta AWS. El flujo conserva cinco etapas, cobra tarifas separadas y solo una aprobación consume inventario físico/crea entrega. La recarga conserva progreso seguro y pide otra vez tarjeta/consentimientos. El repositorio es neutro y mantiene evolución genuina. Estos matices están documentados en la matriz.

## Evidencia

Todas las ejecuciones locales citadas son del 2026-09-23. [Informe QA](qa-report.md) detalla comandos, niveles, versiones y limitaciones; [seguridad](security-review.md) enumera controles y hallazgos. Cada ID de la tabla remite a estas evidencias:

| Clave | Evidencia verificable | Resultado / alcance |
|---|---|---|
| E1 | `npm run test:coverage -w apps/api`; `apps/api/coverage/coverage-summary.json`; tests de dominio/HTTP/adapters/runtime | 68 tests/6 suites PASS reportados por Backend; QA reprodujo las 3 regresiones nuevas con HTTP/SDK reales y transporte Dynamo controlado. Cobertura leída del artefacto. |
| E2 | `npm run test:coverage -w apps/web`; `apps/web/coverage/coverage-summary.json` | 82 tests/7 suites PASS tras formato final. |
| E3 | [API independiente](../../tests/e2e/api-security.spec.ts) | 11 HTTP reales PASS; FileStore temporal real y gateway controlado. |
| E4 | [UI independiente](../../tests/e2e/checkout.spec.ts), [reporte 55](../../tests/e2e/evidence/2026-09-23-full-55.json) | 11 flujos × 4 proyectos + 11 HTTP = 55 PASS, 0 skip, 0 flaky; inicio 23:04:35 UTC, 64.6 s. |
| E5 | [Retest 12](../../tests/e2e/evidence/2026-09-23-visual-retest-12.json), [capturas sanitizadas](../../tests/e2e/evidence/README.md) | Producto/formulario/resumen largo en 4 proyectos: 12 PASS, 21.8 s; revisión visual manual por auditor. |
| E6 | [README](../../README.md), [decisiones](../architecture/decisions.md), [contrato](../architecture/api-contract.md), [diseño](../design.md), [procedencia](../design-assets.md) y código | Lectura independiente; typecheck/build observados PASS; coherencia de modelo/flujo. |
| E7 | `npm run check:secrets`, revisión de storage/requests/DB y [seguridad](security-review.md) | Escáner PASS, sin PAN en superficies propias inspeccionadas; no certifica logs remotos. |
| E8 | [CI Linux ampliado](https://github.com/asantiago2809/lumen-checkout/actions/runs/35935640877) | Success en 3edc404 reportado por Release: instalación, escáner, 5 tests estáticos, typecheck, 147 Jest, build y 79 E2E. fca0339 integra la corrección 0c74bf7 y scripts de release; [CI final 35936553836](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936553836) Success en fca0339, verificado independientemente mediante API pública de GitHub: 68+82 Jest, 79 E2E y 5 estáticos según Release. |
| E9 | [GitHub](https://github.com/asantiago2809/lumen-checkout), [PR1](https://github.com/asantiago2809/lumen-checkout/pull/1), git log/diffs | Repositorio público, ramas/PR1 y PR2 reales, commits genuinos; historia genuina y evidencia de release revisable. |
| E10 | [Template](../../infra/template.yaml), [runbook](../../infra/README.md), [handler](../../infra/static-site/index.cjs) | Lectura + 5/5 node tests PASS. QA confirmó estáticos/API/docs/config 200 y cabeceras. Release reporta validate-template y smoke Dynamo limitado PASS. |
| E11 | [Reporte 79](../../tests/e2e/evidence/2026-09-23-full-79.json), QA-X01–X06, [diseño](design-checklist.md) | 11 HTTP + 17 UI por 4 proyectos = 79 PASS, 0 skip, 0 flaky; inicio 23:49:39 UTC, 88.55 s. Preferencia de movimiento, teclado/inert, edición, salida PENDING, targets/layouts y estados de catálogo. |
| E12 | `npm run test -w apps/api -- --runTestsByPath test/dynamo-http.spec.ts` | 3/3 PASS independientes tras 0c74bf7: rechazo original reproducido, draft/reload, campos ajenos rechazados y create/replay/cancel con marshaller real. No es retest AWS. |
| E13 | [Smoke cloud](../../scripts/smoke-cloud.mjs), [Release](release-report.md) | Release reporta 20/20 checks AWS a 2026-09-24T00:01:04Z, API 0c74bf7. Persistencia, cookie/guards, create/replay y cancelación; ningún /pay ni PAN. |
| E14 | [Sandbox real](../../tests/e2e/evidence/live-sandbox-35936568755/report.json), [CI sandbox](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755) | Success público verificado; QA leyó script/reporte e inspeccionó 8 capturas. APPROVED con entrega/stock 12→11, DECLINED sin entrega/11→11; una tokenización y un pago por caso, refresh sin reenvío. TLS habilitado, sin intercept. |

E3/E4/E11 ejecutan UI/API completas con pago/tokenización externos controlados; no representan compras sandbox reales. E14 sí usa proveedor sandbox real y se presenta por separado. No se publican claves, PAN/CVC, cookies, PDF ni contactos. Artefactos de cobertura se regeneran/adjuntan en CI; capturas/reportes sanitizados están versionados.

Smoke AWS independiente: raíz/WebP 200, /.env 404; CSP/HSTS y caché comprobados. Después del paso manual SSM del usuario, health/products/docs/docs-json devuelven 200, con cabeceras de aplicación. Config devuelve 200 y ambiente sandbox, sin exponer aquí valores sensibles. El coordinador confirma SecureString v1, cookie Secure, Origin/CSRF 403 y smoke Dynamo create/read/update/CAS sobre un registro aislado. El fallo inicial ParameterNotFound está resuelto.

El smoke cloud detectó después un 500 al guardar draft: el SDK rechazaba instancias DTO. La corrección 0c74bf7 persiste un snapshot plano de dominio sin relajar el SDK ni la validación; E12 reproduce la regresión y pasa. Release desplegó 0c74bf7 y reportó 20 checks AWS PASS a 2026-09-24T00:01:04Z: draft/restore, quote entero, PENDING/replay, reserva 12→11 y cancelación que restaura 12 sin delivery. No envió PAN ni llamó /pay. SEC-CLOUD-DRAFT queda resuelto. El workflow sandbox posterior ejecutó tokenización/pagos reales: E14. Release confirmó la instancia anterior del stack trama-live en estado stopped, tras verificar su pertenencia. EBS/EIP/stacks permanecen para recuperación; no se afirma eliminación total ni costo cero.

## Checklist de 82 controles

`[x]` significa Cumple únicamente en el alcance de la evidencia explícita. Bloqueado identifica una dependencia de cierre; Pendiente no equivale a ausencia de implementación. O=obligatorio, R=recomendado, B=bonus fuente, P=plus equipo. Ninguna mejora compensa una obligación faltante.

| Verificado | ID | Tipo | Criterio | Resultado | Evidencia / hallazgo | Responsable |
|---|---|---|---|---|---|---|
| [x] | F-01 | O | Producto visible con descripción, precio y unidades disponibles procedentes del inventario. | Cumple | E3/E4/E5: catálogo HTTP/UI concordante con inventario FileStore y carga de imagen. | Frontend / Backend |
| [x] | F-02 | O | Acción de pagar con tarjeta de crédito claramente disponible. | Cumple | E4: botón abre modal en cuatro proyectos. | Frontend |
| [x] | F-03 | O | La acción abre un modal para los datos de tarjeta. | Cumple | E4/E5: modal, Escape, foco devuelto y errores. | Frontend / QA |
| [x] | F-04 | O | Validar datos de tarjeta antes de avanzar; solo datos ficticios con estructura válida. | Cumple | E2/E4: Luhn, fecha/CVC, validación y tarjeta ficticia generada; datos nunca reales. | Frontend / QA |
| [x] | F-05 | B | Reconocer al menos VISA y MasterCard y mostrar el logo correspondiente. Es plus funcional sin puntos separados en rúbrica. | Cumple | E2/E6: Visa/Mastercard detectados y logos; marcas no admitidas e inválidas probadas. | Frontend |
| [x] | F-06 | O | Obtener datos de cliente y entrega necesarios para completar el envío. | Cumple | E1/E3/E4: validación cliente/entrega, draft y persistencia. | Frontend / Backend |
| [x] | F-07 | O | Resumen previo con importe del producto, cargo base aplicado siempre y cargo de entrega separados. | Cumple | E1/E3/E4: producto/base/envío desglosados y total calculado en servidor. | Frontend / Backend |
| [x] | F-08 | O | Presentar resumen y botón final de pago en un componente backdrop reconocible. | Cumple | E4/E5: backdrop visible, tarjeta enmascarada y CTA alcanzable incluso resumen largo. | Frontend / QA |
| [x] | F-09 | O | Al confirmar, crear primero una transacción propia PENDING y obtener su identificador. | Cumple | E1/E3/E4: PENDING persistido, reserva e ID antes de invocar gateway; respuesta create perdida recuperable. | Backend |
| [x] | F-10 | O | Integración real con API de pagos sandbox para ejecutar el pago. | Cumple | E14: navegador real tokenizó 201 y pagó 202, luego confirmó APPROVED y DECLINED contra API/BD; TLS habilitado sin intercept. | Backend / QA |
| [x] | F-11 | O | Actualizar transacción propia con desenlace confirmado del proveedor, también cuando falla. | Cumple | E1/E3/E4: aprobado/rechazado/error/UNKNOWN persisten estado correcto con gateway controlado; proveedor real en F-10. | Backend / QA |
| [x] | F-12 | O | Asignar el producto al cliente en la entrega de una compra aprobada. | Cumple | E1/E3/E4: solo aprobado crea delivery única vinculada a producto/cliente/tx. | Backend |
| [x] | F-13 | O | Actualizar stock después de una compra aprobada. | Cumple | E3/E4: aprobado descuenta una unidad física; rechazo devuelve reserva; no stock negativo. | Backend / QA |
| [x] | F-14 | O | Mostrar resultado final comprensible y retornar a producto con inventario actualizado. | Cumple | E2/E4: éxito/rechazo/pendiente honestos y retorno con inventario; no éxito ante UNKNOWN. | Frontend / QA |
| [x] | F-15 | O | Mantener cinco etapas: producto -> datos de tarjeta/entrega -> resumen -> resultado -> producto. | Cumple | E4/E6: producto → modal → backdrop → resultado → producto sin navegación fuera de SPA. | Frontend / QA |
| [x] | F-16 | O | Recuperar progreso tras refrescar sin perder el estado seguro del checkout. | Cumple | E2/E3/E4: draft, resumen, resultado y UNKNOWN restaurados; tarjeta/consentimientos requieren reingreso seguro. | Frontend / Backend / QA |
| [x] | T-01 | O | Definir arquitectura API, datos y estructura del código coherente. | Cumple | E6: decisions/api-contract y separación domain/application/infrastructure reflejada en código. | Director / Backend |
| [x] | T-02 | O | Diseñar solicitudes y respuestas por endpoint explícitamente. | Cumple | E1/E3: OpenAPI real con DTO/headers; prueba de schemas no vacíos. | Backend |
| [x] | T-03 | O | Validaciones por endpoint contemplan situaciones reales, con errores claros. | Cumple | E1/E3: DTO anidado estricto, valores/límites, ausencia/propiedad y errores comprobados. | Backend / QA |
| [x] | T-04 | O | Usar métodos y códigos HTTP apropiados para solicitudes y errores. | Cumple | E1/E3: GET/POST/DELETE, 400/401/403/404/409/413/429 y error saneado según escenario. | Backend / QA |
| [x] | T-05 | O | API maneja existencias. | Cumple | E1/E3: catálogo/cotización y reserva/finalización atómica local. | Backend |
| [x] | T-06 | O | API maneja transacciones. | Cumple | E1/E3/E4: create/read/pay/reconcile y estados durables. | Backend |
| [x] | T-07 | O | API maneja clientes. | Cumple | E1/E3: contacto por intento y lectura protegida por owner. | Backend |
| [x] | T-08 | O | API maneja entregas. | Cumple | E1/E3: delivery única tras aprobación; lectura owner. | Backend |
| [x] | T-09 | O | Recursos API admiten diferentes tipos de petición según el negocio; no basta un único stub. | Cumple | E3/E6: endpoints reales separados; OpenAPI e integración HTTP. | Backend / QA |
| [x] | T-10 | O | SPA construida exclusivamente con ReactJS o VueJS; elección del equipo: React. | Cumple | E2/E4/E6: React SPA compilada por Vite; flujo ejecutado. | Frontend |
| [x] | T-11 | O | Usar Redux o Vuex conforme a Flux; elección del equipo: Redux Toolkit. | Cumple | E2/E6: Redux Toolkit, reducers/thunks/selectores y tests de transiciones. | Frontend |
| [x] | T-12 | O | Mantener datos de transacción seguros en estado o localStorage. | Cumple | E2/E4: solo puntero no sensible en storage; PII draft en servidor; PAN/tokens ausentes. | Frontend / QA |
| [x] | T-13 | O | API en JavaScript/TypeScript o Ruby con framework permitido; elección: NestJS + TypeScript. | Cumple | E1/E3/E6: NestJS/TypeScript compilado con metadata y servidor HTTP real. | Backend |
| [x] | T-14 | O | Lógica de negocio fuera del controlador/routing. | Cumple | E1/E6: controller delega en CheckoutService; dominio/casos de uso concentran reglas. | Backend / Director |
| [x] | T-15 | R+B | Arquitectura hexagonal con puertos/adaptadores reales y dominio desacoplado. | Cumple | E1/E3/E6: puertos reemplazables para gateway/store; E2E inyecta gateway sin modificar dominio. | Backend / Director |
| [x] | T-16 | R+B | ROP explícito para casos de uso y propagación de fallos sin continuar efectos incorrectos. | Cumple | E1/E6: Result tipado, composición ROP y cortes en errores; ramas negativas ejecutadas. | Backend / Director |
| [x] | T-17 | O | Base de datos persistente de libre elección. | Cumple | E1/E3: FileStore persiste y reabre datos; Dynamo adapter probado con cliente controlado. E13/E14 comprueban persistencia real de Lambda/Dynamo. | Backend |
| [x] | T-18 | R | Preferir PostgreSQL o DynamoDB; la elección debe justificarse. | Cumple | E6/E10: ADR elige DynamoDB; tabla real y smoke CAS limitado verificados por Release. Recorrido real aprobado/rechazado comprobado en E14. | Director / Backend |
| [x] | T-19 | O | Sembrar productos ficticios reproduciblemente; no se requiere endpoint de alta. | Cumple | E1/E3/E6: seed idempotente automático, no resetea stock; producto ficticio. | Backend |
| [x] | T-20 | O | Documentar modelo de datos en README. | Cumple | E6: README incluye ERD, seis entidades, restricciones, claves Dynamo/TTL y límite FileStore. | Backend / Director |
| [x] | T-21 | O | README incluye colección Postman o URL pública Swagger. | Cumple | E6/E10: README enlaza Swagger/OpenAPI públicos; ambos GET 200, schemas locales contrastados y 14 operaciones revisadas por Backend. | Backend / Release / QA |
| [x] | T-22 | R | Flexbox/Grid favorecidos; framework CSS y ORM/serializador son libres. | Cumple | E5/E6: CSS propio Grid/Flex, tokens y decisiones; framework/ORM opcionales. | Frontend / Backend |
| [x] | D-01 | O | Diseño propio cuidado con prioridad móvil y adaptación a varios tamaños. | Cumple | E4/E5/E6: identidad original, tamaños 320–1440, estados y composición revisados. | Diseño / Frontend / QA |
| [x] | D-02 | O | Ajuste e interacción correctos en referencia iPhone SE 2020; sin controles fuera del viewport. | Cumple | E4/E5: viewport CSS 375x667 y667x375; formularios/resumen accesibles por scroll. Sin dispositivo físico. | QA |
| [x] | D-03 | O | Sin desbordes, recortes, texto ilegible o controles inaccesibles por límites UI. | Cumple | E4/E5: formulario320/375/667, resumen largo y catálogo sin overflow; dos defectos visuales corregidos. | Diseño / QA |
| [x] | D-04 | O | Imágenes se renderizan rápido y con dimensiones apropiadas. | Cumple | E4/E5: WebP 640=12,192 B y1200=31,056 B; carga/dimensiones reales y fallback local. Rendimiento cloud no medido. | Diseño / Frontend / QA |
| [x] | D-05 | B | Adaptación completa y funcionamiento en distintos navegadores. | Cumple | E4/E5/E11: Chromium 153, Firefox 155 y WebKit 26.6; 68 flujos UI actuales. Límite de Tab nativo WebKit Windows explícito; no certifica hardware. | QA |
| [x] | D-06 | B | Demostrar dominio CSS: composición, espaciado, tipografía y estados coherentes. | Cumple | E5/E6: tipografía sans, mint/blanco, espaciado/estados; capturas inspeccionadas y CSS coherente. | Diseño / QA |
| [x] | D-07 | P | Accesibilidad: etiquetas, teclado, foco modal, contraste y mensajes de error útiles. | Cumple | E4/E5/E11: axe critical/serious cero, foco/inert/errores, targets y reduced motion. WebKit necesita foco explícito del skip-link; no lector de pantalla real. | Diseño / QA |
| [x] | D-08 | P | Cargas, pending, errores y reintento visibles y honestos; prevenir doble envío accidental. | Cumple | E2/E4/E11: catálogo loading/error/agotado, reintento y UNKNOWN honestos; doble clic y reabrir PENDING no duplican cobro. | Frontend / QA |
| [x] | S-01 | O | Manejo seguro de información sensible de pago y cliente. | Cumple | E1/E3/E4/E7: ownership, datos mínimos, PAN ausente en API propia/storage/DB y errores saneados; alcance local. | Backend / Frontend / QA |
| [x] | S-02 | O | Usar únicamente sandbox; no pagos con dinero real. | Cumple | E14: preflight valida ambiente sandbox, host/familia de llave permitidos; fixtures oficiales ficticios y ambos desenlaces reales. No dinero real. | Backend / Release / QA |
| [x] | S-03 | O | Leer guía oficial de inicio e información de ambientes/llaves antes de integrar. | Cumple | E6: documentación oficial de ambientes, métodos, aceptación/transacciones consultada y usada en contrato. | Backend |
| [x] | S-04 | O | No modificar credenciales de cuenta compartida ni añadir segundo factor. | Cumple | E6: integración por keys sin cambios de cuenta compartida/2FA; auditor no realizó operaciones sobre esa cuenta. | Director / Backend |
| [x] | S-05 | R | Preferir integración por API keys, evitando depender de una sesión compartida. | Cumple | E1/E6: adapter recibe keys por env/SSM, pública al cliente y privadas solo servidor; uso remoto verificado por E14. | Backend / Release |
| [x] | S-06 | B | Aplicar controles OWASP pertinentes y justificar su alcance. | Cumple | E1/E3/E4/E7: autorización, CSRF/origen, validación, control de flujo y datos; seguridad documenta límites. | Backend / QA |
| [x] | S-07 | B | HTTPS público en app y API. | Cumple | E10: sitio/API sobre HTTPS válido, recursos same-origin y CSP; smoke público con TLS habilitado. E14 verifica también tokenización/pago externos con TLS habilitado. | Release / QA |
| [x] | S-08 | B | Cabeceras de seguridad coherentes con aplicación y API. | Cumple | E10: CSP/HSTS/nosniff y políticas/cache verificadas en respuestas públicas de estáticos y API. | Release / QA |
| [x] | S-09 | P | No persistir, registrar o versionar PAN/CVC, llaves privadas ni secretos. | Cumple | E4/E7: storage/DB/requests propios inspeccionados y escáner sin secretos. PDF/keys externos; no se auditaron logs cloud. | Todos / QA |
| [x] | S-10 | P | Recalcular importes y tarifas en servidor; rechazar manipulación del cliente. | Cumple | E1/E3/E4: servidor recalcula importes; campos desconocidos/precio cambiado rechazan efectos. | Backend / QA |
| [x] | S-11 | P | Garantizar idempotencia y control de concurrencia para evitar doble cobro/stock negativo. | Cumple | E1/E3/E4: doble create/pay, clave conflictiva, carrera última unidad, versión/claim. E13/E14 añaden replay y persistencia reales; carrera de última unidad se probó localmente. | Backend / QA |
| [x] | S-12 | P | Solo aprobación verificada descuenta stock y crea entrega, como máximo una vez. | Cumple | E1/E3/E4: approved duplica cero efectos; decline/error/timeout sin entrega ni consumo físico. | Backend / QA |
| [x] | S-13 | P | Recuperar pago pendiente tras refresh sin reintentar el cobro ciegamente. | Cumple | E2/E3/E4: refresh UNKNOWN/pago activo recupera misma tx y consulta, nunca cobra de nuevo. | Backend / Frontend / QA |
| [x] | S-14 | P | Limitar exposición de datos de cliente y transacción; validar entradas y acceso. | Cumple | E1/E3: IDOR/owner, campos estrictos, no-store y PII mínima probados. | Backend / QA |
| [x] | Q-01 | O | Tests unitarios frontend con Jest, cobertura mayor que 80%. | Cumple | E2: 82 Jest PASS; 96.10S/95.27 B/95.23F/97.20L, cada métrica >80. | Frontend / QA |
| [x] | Q-02 | O | Tests unitarios backend con Jest, cobertura mayor que 80%. | Cumple | E1: 65 Jest PASS; 98.21S/95.02 B/96.90F/98.21L, cada métrica >80. | Backend / QA |
| [x] | Q-03 | O | Publicar resultados reales de cobertura de ambas aplicaciones en README. | Cumple | E6: README actualizado coincide con coverage-summary final de ambas apps. | QA / Release |
| [x] | Q-04 | B | Código limpio, legible, responsabilidades claras y complejidad justificada. | Cumple | E1/E2/E6: typecheck/build pasan; código formateado, responsabilidades separadas y revisión independiente. Sin lint dedicado configurado. | Director / QA |
| [x] | Q-05 | P | Al menos 85% en las cuatro métricas Jest por app, sin exclusiones oportunistas. | Cumple | E1/E2/E6: las cuatro métricas globales >=85 por app; exclusiones revisadas y QA-COV-01 corregido. | QA |
| [x] | Q-06 | P | E2E independiente positivo/negativo, responsive, accesibilidad y refresh. | Cumple | E3/E4/E5/E11: 79 PASS actuales; baseline 55 y retest 12 preservados, sin sumarlos como casos únicos. | QA |
| [x] | Q-07 | P | CI reproduce instalación, lint/typecheck, Jest, build y controles relevantes. | Cumple | E8: CI final 35936553836 en fca0339 Success, verificado por API pública; incluye fix 0c74bf7, 150 Jest, 79 E2E y 5 estáticos. Acciones Node 24 fijadas. | Release / QA |
| [x] | Q-08 | P | Auditoría final punto por punto con plus, defectos abiertos y evidencia. | Cumple | Este informe recorre 82 IDs, evidencia y plus, con bloqueos explícitos; no constituye aprobación de entrega. | Auditor |
| [x] | G-01 | O | Repositorio GitHub público y enlace entregable comprobado sin autenticación. | Cumple | E9: repositorio público leído sin autenticación; PR1 visible. | Release |
| [x] | G-02 | O | Nombre del repositorio neutro y sin nombre de la empresa evaluadora. | Cumple | E9/E6: lumen-checkout y marca Lumen neutros; referencias técnicas al proveedor solo donde necesarias. | Director / Release |
| [x] | G-03 | O | Solución original; no copiar otros candidatos ni distribuirla activamente a ellos. | Cumple | E6/E9: prompts/procedencia de asset y desarrollo incremental original registrados; no copias de candidatos ni distribución activa realizadas por equipo. | Todos / Director |
| [x] | G-04 | O | Historial muestra evolución con commits genuinos; su ausencia invalida el ejercicio. | Cumple | E9: historial incremental real desde acuerdos/docs hasta implementación, infra, QA y corrección Dynamo; remoto y CI verificables. | Release |
| [x] | G-05 | R | Ramas y pull requests por funcionalidad. | Cumple | E9: PR1 de implementación y PR2 de QA/accesibilidad en ramas reales; el segundo corresponde a nuevo trabajo acotado, sin fabricar PR históricos. | Release |
| [x] | G-06 | R | Emplear AI, preferiblemente asistente CLI, de manera revisada. | Cumple | E6/E9: trabajo asistido por agentes explícito, prompts persistentes y revisión independiente. | Director |
| [x] | G-07 | P | Mantener registro de cambios y decisiones ligado a commits. | Cumple | E6/E9: CHANGELOG, ADR y commits genuinos; estado Unreleased honesto. | Release / Director |
| [x] | L-01 | O | Frontend y API funcionales completos. | Cumple | E1–E14: build, UI/API y recorrido público real completo: producto/datos/resumen/resultado/regreso con stock y refresh. | Director / QA |
| [x] | L-02 | O | README completo y actualizado junto al enlace GitHub. | Cumple | E6: README vigente incluye instalación, entorno, arquitectura, modelo, cobertura 68/82, E2E 79, URLs reales y límites pendientes explícitos. | Director / Release / Auditor |
| [x] | L-03 | O | Aplicación y API publicadas y conectadas en cloud. | Cumple | E10/E13/E14: UI/API AWS conectadas, SSM/Dynamo reales, compra sandbox aprobada/rechazada y recuperación desde frontend publicado. | Release / QA |
| [x] | L-04 | O | Enlace de aplicación desplegada en AWS conforme a entregables; es la opción adoptada. | Cumple | E10: URL AWS pública y frontend conectado a catálogo/configuración API. El recorrido de pago completo se evalúa aparte en L-01/L-03. | Release / QA |
| [ ] | L-05 | O | Alcanzar al menos 100 puntos de acuerdo con evaluación externa, sin atribuir nota garantizada. | Pendiente | Puntuación pertenece al evaluador; se conserva rúbrica100+50 sin asignar nota ni garantía. | Auditor / Director |
| [x] | L-06 | P | Infraestructura y despliegue reproducibles, con configuración segura documentada. | Cumple | E10/E13: IaC/runbook/SSM, empaquetado y redeploy UPDATE_COMPLETE; smoke real de API/Dynamo 20/20 reportado por Release. Pago externo se evalúa aparte. | Release |
| [x] | L-07 | P | Sustituir la prueba anterior en AWS preservando recursos ajenos. | Cumple | Release verificó pertenencia de la instancia a trama-live/ApiInstance y confirmó stopped. Baja reversible, EBS/EIP/stacks preservados; sin eliminación de recursos ajenos. | Release / Director |

## Cobertura y calidad

La fuente pide Jest **>80% por aplicación**; el equipo añade objetivo global>=85% en las cuatro métricas.

| Aplicación | Tests | Statements | Branches | Functions | Lines | Dictamen |
|---|---:|---:|---:|---:|---:|---|
| API | 68 | 98.48% | 95.28% | 100% | 98.48% | Cumple local |
| Web | 82 | 96.10% | 95.27% | 95.23% | 97.20% | Cumple local |

Se revisaron inclusiones/exclusiones. Backend excluye solo wrappers main/lambda: lógica SSM/cache/reintento extraída y cubierta 100% en sus módulos. Los porcentajes son globales de cada app, no 100% de cada función. No existe lint dedicado; TypeScript y formateo se reportan como tales. El formateo cambió el denominador de líneas; README usa las cifras actuales del artefacto; Backend ejecutó los 68 Jest y QA reprodujo los 3 nuevos con SDK real.

## Rúbrica y plus

La nota la asigna el evaluador. Se registra evidencia por categoría **sin estimación de puntos**; el máximo es 100 base + 50 bonus y el umbral externo indicado es 100. No se multiplican puntos por subrequisitos.

| Categoría | Máximo | Evidencia disponible | Brecha |
|---|---:|---|---|
| README | 5 | E6; modelo, instalación, cobertura, URLs y límites | Actualizar cualquier cambio posterior de estado |
| Imágenes/límites UI | 5 | E4/E5; WebP 12/31 KB, layouts 320–1440, textos largos | Rendimiento público sin medir |
| Checkout completo | 20 | E1–E5/E14, flujo y pago sandbox real | Límites de hardware indicados |
| API funcional | 20 | E1/E3/E10/E12/E14, negocio y persistencia AWS | Sin bloqueante conocido en alcance |
| Jest >80 ambas apps | 30 | E1/E2, métricas separadas y reportes | Ninguna local |
| App/API cloud | 20 | E10/E13/E14, URL pública y recorrido sandbox | Sin bloqueante conocido en alcance |
| **Base** | **100** | Sin puntuación atribuida | Sin bloqueantes técnicos en criterios ejecutados |
| OWASP/HTTPS/headers | 5 | E1/E3/E7/E10; TLS/cabeceras públicos | Sin certificación de seguridad universal |
| Responsive/navegadores | 5 | E4/E5, tres motores | Sin dispositivo físico |
| CSS | 10 | E5/E6, tokens/layout/estados | Sin defecto local bloqueante observado |
| Código limpio | 10 | E1/E2/E6, separación/typecheck/build | Juicio final externo |
| Hexagonal | 10 | E1/E3/E6, puertos/adapters usados realmente | Dynamo y pago remoto probados |
| ROP | 10 | E1/E6, Result/cortocircuito probado | Juicio final externo |
| **Bonus** | **50** | Sin puntuación atribuida | No sustituye obligaciones |

Plus demostrados: logos Visa/MasterCard; idempotencia durable y última unidad concurrente; separación de inventario reservado/físico; recuperación ante refresh/respuesta perdida/UNKNOWN; protección owner/CSRF/Origin; campos de tarjeta efímeros; teclado/foco y axe; tres motores de navegador; imágenes optimizadas originales; CI público; matriz 82 y roles revisables; tests de configuración SSM/cold start y handler estático. Las invariantes tienen evidencia local y ahora E14 aporta pago real AWS/sandbox; no constituye promesa de disponibilidad futura.

## Hallazgos y retests

| ID | Hallazgo | Evidencia de corrección | Estado |
|---|---|---|---|
| QA-VIS-01 | Espacios perdidos al ocultar br | Espacios explícitos y retest E5 | Resuelto |
| QA-VIS-02 | Producto de resumen distinto al catálogo | ProductImage compartido y comparación src E4 | Resuelto |
| SEC-DOC-01 | Stock físico confundido con disponible | UX-17 y aserciones separadas | Resuelto |
| SEC-REV-01 | Replay/product/quote con reserva vencida | Expiración añadida y QA-M12 HTTP | Resuelto local |
| SEC-REV-04 | Metadata directa/anidada | Adapter y casos Jest para ambas | Resuelto; E14 confirma metadata mostrada |
| QA-COV-01 | Lógica runtime excluida por wrapper | Módulos extraídos y 100% de cobertura | Resuelto |
| SEC-ENV-01 | Tokenización/pago real sin evidencia inicial | E14 real, TLS habilitado y sin intercept; aprobado/rechazado comprobados | Resuelto |
| QA-OBS-01 | Un NETWORK_FAILURE de autosave por caso real | Artefacto conserva evento; guardados 200 y flujo/recarga pasaron. Causa exacta no capturada. | Observación sin fallo funcional demostrado |
| SEC-ENV-02 | API inicialmente sin SSM | Usuario configuró SecureString; health/catalog/config/docs 200 | Resuelto |
| SEC-CLOUD-DRAFT | SDK rechazaba instancias DTO en draft | Snapshot plano; E12 3/3 PASS y smoke AWS 20/20 | Resuelto, Release/QA |
| QA-VIS-03/04/05 | Reduced motion, target Editar y consentimientos | CSS corregido y QA-X01/X05 en cuatro proyectos | Resuelto |
| QA-HARNESS-01 | Teardown con trabajo en vuelo, ENOTEMPTY Linux | Cierre de productores, drenaje real y luego cleanup; 79 local/CI PASS | Resuelto |

Release actualizó las acciones a versiones oficiales Node 24 con SHA fijado; CI 35935640877 pasó. El problema de teardown observado en CI anterior se corrigió sin retries de tests. No se observó otro defecto bloqueante local en los escenarios ejecutados; esto no prueba ausencia de defectos.

## Límites y decisión

No hay webhook ni worker periódico: las consultas autenticadas concilian pagos con ID remoto. UNKNOWN sin ID requiere conciliación operativa y conserva reserva. FileStore solo soporta desarrollo de un proceso; concurrencia distribuida usa transacciones/versiones Dynamo; replay real verificado, carga distribuida no medida. Throttle local por proceso y límite API Gateway deben evaluarse en despliegue. No se probó iPhone físico, lector de pantalla, autofill real ni zoom real al 200%; la emulación se identifica como tal. WebKit Windows omitió enlaces al tabular: se probó activar el skip-link tras foco explícito y se conserva esa limitación; Chromium/Firefox sí recorrieron el enlace nativamente.

**Recomendación favorable de entrega de la versión verificada.** Gates funcionales, Jest/CI, sandbox y cloud cerrados en el alcance ejecutado; sustitución anterior realizada reversiblemente. E14 demuestra aprobado/rechazado, stock/entrega y durabilidad. Se conserva el aviso de autosave sin atribuirle una causa no demostrada. La nota y contratación pertenecen al evaluador; no se envió la prueba a terceros.

Firma: auditor independiente de requisitos/QA, revisión 2026-09-23. Este informe acredita únicamente la versión y las evidencias citadas.
