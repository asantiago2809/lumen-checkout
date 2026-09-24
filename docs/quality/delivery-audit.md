# Auditoría independiente de cierre de entrega

**Dictamen técnico: favorable para entrega, con una observación menor de rendimiento y sin bloqueantes funcionales conocidos en el alcance probado. Nota interna: 149/150 (99/100 base + 50/50 bonus).** Las cuatro mejoras solicitadas se implementaron; la variación de la primera carga de EV-02 sigue explícitamente observada y conserva un punto de descuento. Los 82 controles se revisaron: **81 verificados en el alcance indicado —D-04 con observación— y 1 pendiente externo, L-05**. La calificación del empleador no se puede certificar internamente.

La aplicación probada corresponde a **a150336**, con infraestructura final **71187e4** y stack **UPDATE_COMPLETE**. El coordinador debe completar la integración y comprobar el CI automático de main antes de cerrar la entrega; el [cierre de integración](https://github.com/asantiago2809/lumen-checkout/pull/4) registra después el SHA y enlace inmutable a ese run. Este corte no inventa el resultado de una ejecución futura. La historia **144 → 147 → 149** se conserva en la [rúbrica](rubric-evaluation.md).

## Fuente, independencia y límites

- Fuente primaria: PDF privado suministrado, páginas 2, 3, 4 y 6 releídas por este auditor. La rúbrica suma 100 puntos base y 50 bonus, con mínimo de 100; no define una escala de deducciones parciales ni una puntuación de Lighthouse.
- La matriz de [82 controles](../requirements.md) mantiene separados requisitos obligatorios, recomendaciones, bonus y plus del equipo. L-05 depende de la futura evaluación del empleador; no puede certificarse internamente.
- El auditor no implementa cambios de aplicación, no gestiona Git/AWS y no hace pagos. Revisa código y artefactos, y ejecuta las pruebas independientes después de congelar una revisión identificada. Los retests de AWS y del proveedor corresponden al coordinador y se inspeccionan por separado.
- No se publican el PDF, contactos, credenciales, cookies, PAN ni CVC. No se promete ausencia universal de errores ni un resultado de contratación.

## Criterios de cierre de las mejoras

| Hallazgo | Responsable | Evidencia exigida para cerrar |
| --- | --- | --- |
| EV-02: variación de render y texto sin compresión | Release | Negociación gzip, integridad del contenido, HEAD coherente, exclusión de formatos ya comprimidos y cabeceras/caché conservadas; comprobación pública y nuevas muestras de TTFB/LCP/CLS/imagen. La variación no se atribuye a una causa sin evidencia. |
| EV-03: dominio conoce HTTP | Backend | Códigos de dominio sin transporte y correspondencia exhaustiva en el adaptador; mismas respuestas HTTP y pruebas de negocio sin códigos HTTP. |
| EV-04: JSON externo pierde precisión de tipos | Backend | Frontera `unknown` con estrechamiento explícito, rechazo seguro de formas/estados/importes inválidos, campos permitidos solamente y contrato real del proveedor aún funcional. |
| EV-06: cambios todavía no guardados | Frontend | Aviso honesto durante edición/guardado/fallo, cierre seguro con guardado lento o fallido y última revisión confirmada; ninguna persistencia de tarjeta ni promesa de recuperar una edición no confirmada. |

## Ejecución independiente sobre código congelado

Revisión de aplicación: **`a150336361ba20ea19d2e1c6b239f1d66d1c2312`**. El auditor leyó los cambios de backend, frontend y estáticos antes de ejecutar una única corrida completa. Al terminar, HEAD era `f096001dc7ba97ac2cbc7dc400212198d99dac78`; `git diff --exit-code a150336 HEAD -- apps infra/static-site tests/e2e` devolvió 0. El único cambio de ese intervalo fue el probe de rendimiento y su ruta ignorada; aplicación, tests y handler quedaron iguales.

| Control | Resultado propio | Evidencia |
| --- | --- | --- |
| Jest API | **81/81 PASS**, 7 suites; statements/branches/functions/lines **99 / 95.66 / 100 / 99%** | [Gates saneados](../../tests/e2e/evidence/2026-09-23-delivery-gates.json) |
| Jest frontend | **89/89 PASS**, 7 suites; **96.55 / 95.09 / 96.15 / 97.60%** | Mismo artefacto; ambas apps superan 80% por separado y el objetivo interno de 85% |
| Handler estático | **12/12 PASS**, sin omitidos | `node --test infra/static-site/index.test.cjs`; incluye gzip, exclusiones, integridad UTF-8, HEAD, caché acotada y protección de rutas |
| Tipos y producción | **PASS** en ambas apps | `npm run typecheck` y `npm run build`; JS `index-CjZzrNZL.js`, CSS `index-Dg5qOyc5.css` |
| E2E independiente | **103/103 PASS**, 0 fallidos, omitidos o flaky; **132.360 s** | [103 resultados individuales](../../tests/e2e/evidence/2026-09-23-delivery-full-103.json); inicio `2026-09-24T03:05:31.556Z` |
| Regresión EV-06 | **12 PASS**: QA-U01/U02/U03 en cuatro proyectos | Incluida en los 103, no una segunda ejecución: cierre antes de confirmar, fallo/reintento y edición posterior durante un guardado anterior |
| Regresión EV-01 previa | **12 PASS**: QA-R07/R08/R09 en cuatro proyectos | Incluida en los 103; no se perdió la protección de dirección/reserva entre pestañas |
| Revisión visual EV-06 | Aviso legible, reintento dentro del panel y sin desborde a 320 px | [Chromium](../../tests/e2e/evidence/2026-09-23-delivery-visual/save-failed-320-chromium-se.png) y [Firefox](../../tests/e2e/evidence/2026-09-23-delivery-visual/save-failed-320-firefox-desktop.png), inspeccionadas por el auditor; campos enmascarados |

Entorno propio: Windows, Node **24.14.0**, Playwright con Chromium, Firefox y WebKit. Son 11 escenarios HTTP más 23 escenarios UI en cuatro proyectos. El harness usa SPA/Nest/FileStore reales aislados; el gateway es controlado y la tokenización externa está interceptada. QA-U02 inyecta 503 deliberadamente y QA-U01/U03 retienen solicitudes. **Estos 103 resultados no son pagos reales del proveedor.**

La cobertura no fue inflada mediante exclusiones nuevas: se conservan las reglas de negocio, use cases, store y adaptadores en la medición. Las cuatro métricas de ambas aplicaciones superan incluso el objetivo interno de 85%. El threshold configurado del frontend continúa en 81%; el cumplimiento de 85% se atribuye al resultado observado, no a ese umbral.

## Integración pública y proveedor real

El coordinador ejecutó los siguientes controles sobre AWS. El auditor leyó scripts/resultados, contrastó el estado de los workflows mediante la API pública de GitHub sin autenticación e inspeccionó las ocho capturas del nuevo sandbox. No ejecutó compras adicionales.

| Control público | Resultado | Evidencia y alcance |
| --- | --- | --- |
| GitHub y CI del candidato | Repositorio público, default `main`; workflow `completed/success` en `f096001` | [CI 35950070341](https://github.com/asantiago2809/lumen-checkout/actions/runs/35950070341), verificado por el auditor a `03:17:24 UTC` |
| API AWS | **24 PASS**, configuración externa **200** | [Smoke API](../../tests/e2e/evidence/2026-09-23-delivery-cloud-api.json), `03:17:44 UTC`: health, Swagger/OpenAPI, seguridad, persistencia, reserva, conflicto entre pestañas, replay y cancelación; sin pago |
| UI AWS, recuperación R09 | **PASS**, assets nuevos, sin mocks ni pago | [Reporte UI](../../tests/e2e/evidence/2026-09-23-delivery-cloud-ui/report.json), `03:17:44–03:17:52 UTC`: resumen autoritativo, nueva tarjeta/consentimientos requeridos, limpieza `ERROR/NOT_STARTED`, sin entrega y disponibilidad **11→10→11** |
| Contrato real de sandbox actualizado | **APPROVED y DECLINED PASS**, TLS normal y sin interceptar | [Workflow 35950887803](https://github.com/asantiago2809/lumen-checkout/actions/runs/35950887803), fuente `f096001`, verificado de nuevo por el auditor a `03:21:03 UTC`; [reporte real](../../tests/e2e/evidence/live-sandbox-35950887803/report.json) |

La nueva compra aprobada (`9e37abd6-fd50-4157-867d-5abd5cb475b0`) verificó stock **11→10** y entrega vinculada; el rechazo (`a5c19d14-685f-4bda-b5d9-7fbaf4950b43`) conservó **10→10** y no creó entrega. Cada caso hizo exactamente una creación PENDING, una tokenización **201** y un envío de pago **202**; la consulta posterior confirmó el desenlace esperado y dos recargas no reenviaron el pago. Total comprobado: **20,350,000 centavos COP**. El parser nuevo conserva VISA y últimos cuatro dígitos válidos en ambos resultados, sin reproducir PAN/CVC.

El reporte nuevo contiene **cero `networkFailures`**, pero registra un evento **DELETE `/checkout/draft` `ERR_ABORTED`** por escenario durante el retorno al producto, junto a la respuesta DELETE **204** observada. Se conserva esa observación; no se describe como ausencia total de eventos de red ni se inventa su causa. Las assertions de retorno, stock y recuperación pasaron. La captura inicial de producto aprobado se tomó antes de mostrar la imagen; las de retorno sí la muestran. La prueba de rendimiento espera además `image.decode()` y no usa esa captura temprana para certificar velocidad.

Las compras nuevas ocurrieron de `03:18:55` a `03:19:25 UTC`, antes del ajuste posterior de memoria de infraestructura. El código de aplicación se conserva; un cambio de memoria no se presenta como otra compra real. El cierre de infraestructura y rendimiento se registra separadamente, una vez estabilizado.

## Infraestructura y rendimiento: mejora verificada y observación residual

El [registro del despliegue](../../tests/e2e/evidence/2026-09-23-delivery-deployment.json) identifica artefactos, hashes y resolución de incidencias. Lambda API y estática están en estado Successful, ambas con **512 MB**; el único cambio final de memoria fue estática **128→512 MB**. El auditor comprobó que apps, handler y tests en **71187e4** son idénticos a **a150336**, y que la API es idéntica al código de **929a550** usado para su zip. No se repitieron pruebas de aplicación por una modificación de memoria sin cambios de código.

Hubo dos incidencias de release resueltas: un objeto API ausente produjo rollback y se corrigió con carga explícita y verificación de tamaño/hash; un intento de API a 1024 MB fue rechazado por el límite de la cuenta y el rollback coincidió con una actualización en curso. Se esperó a Lambda Successful, se continuó el rollback sin omitir recursos y se aplicó únicamente la memoria estática final. El stack terminó **UPDATE_COMPLETE**. La evidencia conserva esos eventos; no se presentan los intentos fallidos como despliegues exitosos.

Gzip público reduce JavaScript **282,680→90,643 bytes (67.93%)** y CSS **19,571→4,759 bytes (75.68%)**. La descompresión coincide por SHA con la representación original; se respeta gzip q=0, Vary y caché immutable; CSP/nosniff permanecen. HEAD devuelve cero bytes reales en la conexión TLS, con Content-Length de GET **90,643/4,759**, respectivamente. Esto corrige el HEAD anterior que devolvía longitud cero desde API Gateway aunque la factory local fuera correcta.

Se conservaron tres series completas de doce visitas cada una: [baseline](../../tests/e2e/evidence/2026-09-23-delivery-performance-before.json), [gzip con memoria anterior](../../tests/e2e/evidence/2026-09-23-delivery-performance-after.json) y [memoria final](../../tests/e2e/evidence/2026-09-23-delivery-performance-tuned.json). Cada serie usa tres contextos nuevos por viewport y una visita repetida dentro de cada contexto, sin throttling ni pagos. Cache de navegador fría **no significa** Lambda fría. La primera baseline exploratoria perdió su archivo crudo por limpieza de Playwright; únicamente se conserva su [resumen de consola identificado como tal](../../tests/e2e/evidence/2026-09-23-delivery-performance-initial-summary.json), incluido el outlier de 12.332 s. No se reconstruyeron muestras faltantes.

| Corte final | LCP mínimo / mediana / máximo | CLS máximo |
| --- | --- | --- |
| Móvil 375×667, navegador sin caché | **0.748 / 1.592 / 4.976 s** | **0** |
| Móvil, visita repetida | **0.220 / 0.236 / 0.336 s** | **0** |
| Escritorio 1440×900, navegador sin caché | **0.672 / 0.692 / 1.020 s** | **0.0157** |
| Escritorio, visita repetida | **0.236 / 0.236 / 0.244 s** | **0.0157** |

Las doce visitas finales dieron 200, sin requests fallidos ni overflow; las imágenes decodificaron correctamente. La primera carga móvil pasó de **13.172 s** en la serie intermedia a **4.976 s** en la final; su HTML tuvo TTFB 1.366 s, productos 2.495 s y sesión 2.657 s, mientras la imagen tardó 147 ms. Las líneas de plataforma REPORT muestran ejecuciones inicialmente lentas, pero la medición no aísla una causa única ni controla red/carga cloud. **No se afirma que gzip por sí solo aceleró LCP ni que todas las primeras visitas sean rápidas.**

Por esa variación residual se mantiene **EV-02 como observación de rendimiento, responsable Release, sin bloqueo funcional**, y **4/5** en el criterio de imágenes/UI. Compresión, caché, memoria y HEAD quedan implementados y comprobados; no se inventa una puntuación obligatoria de Lighthouse o un percentil de usuarios a partir de tres muestras.

## Cierre de hallazgos y calificación final interna

| Hallazgo | Estado final y fundamento | Cambio de puntos |
| --- | --- | --- |
| EV-01 | Corrección anterior conservada; 12 regresiones locales y API/UI AWS vuelven a pasar | Sin cambio, checkout continúa 20/20 |
| EV-02 | Mejoras de infraestructura verificadas; observación de primera carga variable permanece | Sin cambio, imágenes/UI 4/5 |
| EV-03 | Cerrado: DomainError tiene unión de 14 códigos sin HTTP; tabla exhaustiva en el adaptador y contrato probado para los 14 códigos | Hexagonal 9→10 |
| EV-04 | Cerrado: JSON externo unknown con guardas explícitas; negativos sin falso aprobado y aprobación/rechazo reales nuevos correctos | Código limpio 9→10 |
| EV-05 | Corrección documental anterior conservada | Sin descuento |
| EV-06 | Cerrado: estado pendiente/guardando/guardado/error honesto; cierre espera confirmación, conserva formulario ante fallo y permite reintento; respuesta antigua no confirma edición posterior | Sin puntos artificiales, antes y después 0 |

| Criterio literal de la rúbrica, traducido | Máximo | Nota final | Evidencia principal |
| --- | ---: | ---: | --- |
| README completo correctamente | 5 | **5** | Modelo, comandos, variables sin secretos, límites, cobertura y URLs públicas actualizados |
| Imágenes rápidas y UI/UX dentro de límites | 5 | **4** | WebP optimizado y responsive, gzip/HEAD correctos, sin overflow; descuento conservador por primera carga residual variable |
| Checkout completo con tarjeta | 20 | **20** | Cinco etapas, recuperación, tarifas, errores, stock/entrega y sandbox real aprobado/rechazado |
| API funcionando correctamente | 20 | **20** | HTTP real, persistencia, validación, propiedad, concurrencia, idempotencia y retest AWS |
| Cobertura unitaria mayor de 80% en ambas apps | 30 | **30** | 170 Jest PASS; cuatro métricas por app superiores al 85% interno |
| App y API desplegadas en cloud | 20 | **20** | AWS público HTTPS, artefactos contrastados, estado estable y proveedor real |
| **Subtotal base** | **100** | **99** | |
| OWASP, HTTPS y cabeceras | 5 | **5** | Controles pertinentes y negativos probados; sin atribuir certificación OWASP/PCI |
| Responsive y varios navegadores | 5 | **5** | Chromium escritorio/SE, Firefox, WebKit; layouts adicionales y nuevas capturas a 320 px |
| Habilidad con CSS | 10 | **10** | Tokens, Grid/Flex, estados coherentes, jerarquía, foco y controles dentro de viewport |
| Código limpio | 10 | **10** | Parser externo explícito, tipos precisos, responsabilidades separadas y mensajes saneados |
| Hexagonal con puertos/adaptadores | 10 | **10** | Puertos sustituibles; dominio independiente del transporte; HTTP mapea los errores |
| ROP | 10 | **10** | Result discriminado, composición y cortes de efectos en errores, con regresiones negativas |
| **Subtotal bonus** | **50** | **50** | |
| **Total interno** | **150** | **149** | Mínimo literal 100; margen interno 49. No es nota del empleador |

Las deducciones son juicio interno explícito: la fuente no define puntuación parcial. La mejora de **147→149** procede exclusivamente de EV-03 y EV-04 comprobados; no se otorga 150 automáticamente por haber implementado las cuatro tareas.

## Paquete de entrega y límites que se comunican

- [Aplicación AWS](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com), [Swagger](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/api/docs) y [OpenAPI](https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/api/docs-json) públicos.
- [Repositorio público](https://github.com/asantiago2809/lumen-checkout) con README, modelo de datos, código, CI, historial genuino, PRs, CHANGELOG, infraestructura, prompts del equipo y evidencias saneadas.
- Gates técnicos completos: 170 Jest, 103 E2E, 12 estáticos, tipos/build, retests AWS y dos compras sandbox nuevas. El coordinador completa la integración y verifica el CI de main antes de enviar.
- Observación residual EV-02: una primera carga móvil de 4.976 s; las mediciones no son percentiles de tráfico real. Una edición todavía no confirmada puede perderse si se fuerza recarga durante el debounce/request; ahora la UI lo advierte y el cierre normal espera el guardado.
- Límites conservados: confianza TLS del UAT variable en el entorno Windows inspeccionado; AWS y Linux verificaron TLS normal. No hay webhook/worker de reconciliación; UNKNOWN sin ID remoto necesita gestión operativa y nunca se reenvía ciegamente. Los límites de tasa son por proceso. No se afirma prueba física de Safari, lector de pantalla o zoom real.
- La retirada de la prueba anterior se conserva como operación reversible ya documentada; EBS/dirección/stack permanecen para recuperación. Este cierre no repite ni amplía esa acción.

**Recomendación inequívoca:** el candidato técnico está listo para entrega con la observación menor indicada. No hay correcciones funcionales bloqueantes pendientes detectadas en esta auditoría. La comprobación final de integración/CI corresponde a Release; la nota externa y la decisión de contratación corresponden al empleador. No se ha enviado la prueba a terceros.

## Checklist individual de 82 controles

Cada estado se limita a las evidencias de este informe. **A**: Jest/tipos/build; **B**: 103 E2E; **C**: 12 pruebas estáticas y revisión de handler; **D**: despliegue y API/UI AWS; **E**: sandbox real nuevo; **F**: inspección de código/README/contratos/historia y matriz original; **G**: GitHub público y CI contrastado; **H**: mediciones de rendimiento final; **I**: inspección visual y accesibilidad de B. Las pruebas controladas B no sustituyen E. D-04 conserva la observación y L-05 requiere evaluación externa.

| Verificado | ID | Tipo | Criterio | Resultado | Evidencia | Responsable |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | F-01 | O | Producto visible con descripción, precio y unidades disponibles procedentes del inventario. | Cumple en alcance | A, B, D | Frontend / Backend |
| [x] | F-02 | O | Acción de pagar con tarjeta de crédito claramente disponible. | Cumple en alcance | B, I | Frontend |
| [x] | F-03 | O | La acción abre un modal para los datos de tarjeta. | Cumple en alcance | B, I | Frontend / QA |
| [x] | F-04 | O | Validar datos de tarjeta antes de avanzar; solo datos ficticios con estructura válida. | Cumple en alcance | A, B | Frontend / QA |
| [x] | F-05 | B | Reconocer al menos VISA y MasterCard y mostrar el logo correspondiente. Es plus funcional sin puntos separados en rúbrica. | Cumple en alcance | A, B, E | Frontend |
| [x] | F-06 | O | Obtener datos de cliente y entrega necesarios para completar el envío. | Cumple en alcance | A, B, D | Frontend / Backend |
| [x] | F-07 | O | Resumen previo con importe del producto, cargo base aplicado siempre y cargo de entrega separados. | Cumple en alcance | A, B, E | Frontend / Backend |
| [x] | F-08 | O | Presentar resumen y botón final de pago en un componente backdrop reconocible. | Cumple en alcance | B, I | Frontend / QA |
| [x] | F-09 | O | Al confirmar, crear primero una transacción propia PENDING y obtener su identificador. | Cumple en alcance | A, B, D, E | Backend |
| [x] | F-10 | O | Integración real con API de pagos sandbox para ejecutar el pago. | Cumple en alcance | E | Backend / QA |
| [x] | F-11 | O | Actualizar transacción propia con desenlace confirmado del proveedor, también cuando falla. | Cumple en alcance | A, B, E | Backend / QA |
| [x] | F-12 | O | Asignar el producto al cliente en la entrega de una compra aprobada. | Cumple en alcance | A, B, E | Backend |
| [x] | F-13 | O | Actualizar stock después de una compra aprobada. | Cumple en alcance | A, B, E | Backend / QA |
| [x] | F-14 | O | Mostrar resultado final comprensible y retornar a producto con inventario actualizado. | Cumple en alcance | B, E | Frontend / QA |
| [x] | F-15 | O | Mantener cinco etapas: producto -> datos de tarjeta/entrega -> resumen -> resultado -> producto. | Cumple en alcance | B, E | Frontend / QA |
| [x] | F-16 | O | Recuperar progreso tras refrescar sin perder el estado seguro del checkout. | Cumple en alcance | A, B, D, E; EV-01/06 | Frontend / Backend / QA |
| [x] | T-01 | O | Definir arquitectura API, datos y estructura del código coherente. | Cumple en alcance | A, F | Director / Backend |
| [x] | T-02 | O | Diseñar solicitudes y respuestas por endpoint explícitamente. | Cumple en alcance | A, D, F | Backend |
| [x] | T-03 | O | Validaciones por endpoint contemplan situaciones reales, con errores claros. | Cumple en alcance | A, B, D | Backend / QA |
| [x] | T-04 | O | Usar métodos y códigos HTTP apropiados para solicitudes y errores. | Cumple en alcance | A, B, D; EV-03 | Backend / QA |
| [x] | T-05 | O | API maneja existencias. | Cumple en alcance | A, B, E | Backend |
| [x] | T-06 | O | API maneja transacciones. | Cumple en alcance | A, B, D, E | Backend |
| [x] | T-07 | O | API maneja clientes. | Cumple en alcance | A, B, F | Backend |
| [x] | T-08 | O | API maneja entregas. | Cumple en alcance | A, B, E | Backend |
| [x] | T-09 | O | Recursos API admiten diferentes tipos de petición según el negocio; no basta un único stub. | Cumple en alcance | A, B, D | Backend / QA |
| [x] | T-10 | O | SPA construida exclusivamente con ReactJS o VueJS; elección del equipo: React. | Cumple en alcance | A, B, F | Frontend |
| [x] | T-11 | O | Usar Redux o Vuex conforme a Flux; elección del equipo: Redux Toolkit. | Cumple en alcance | A, B, F | Frontend |
| [x] | T-12 | O | Mantener datos de transacción seguros en estado o localStorage. | Cumple en alcance | A, B, E | Frontend / QA |
| [x] | T-13 | O | API en JavaScript/TypeScript o Ruby con framework permitido; elección: NestJS + TypeScript. | Cumple en alcance | A, B, F | Backend |
| [x] | T-14 | O | Lógica de negocio fuera del controlador/routing. | Cumple en alcance | A, F | Backend / Director |
| [x] | T-15 | R+B | Arquitectura hexagonal con puertos/adaptadores reales y dominio desacoplado. | Cumple en alcance | A, F; EV-03 | Backend / Director |
| [x] | T-16 | R+B | ROP explícito para casos de uso y propagación de fallos sin continuar efectos incorrectos. | Cumple en alcance | A, F | Backend / Director |
| [x] | T-17 | O | Base de datos persistente de libre elección. | Cumple en alcance | A, B, D, E | Backend |
| [x] | T-18 | R | Preferir PostgreSQL o DynamoDB; la elección debe justificarse. | Cumple en alcance | D, F | Director / Backend |
| [x] | T-19 | O | Sembrar productos ficticios reproduciblemente; no se requiere endpoint de alta. | Cumple en alcance | A, B, F | Backend |
| [x] | T-20 | O | Documentar modelo de datos en README. | Cumple en alcance | F: README/ERD | Backend / Director |
| [x] | T-21 | O | README incluye colección Postman o URL pública Swagger. | Cumple en alcance | D: Swagger/OpenAPI | Backend / Release / QA |
| [x] | T-22 | R | Flexbox/Grid favorecidos; framework CSS y ORM/serializador son libres. | Cumple en alcance | F, I | Frontend / Backend |
| [x] | D-01 | O | Diseño propio cuidado con prioridad móvil y adaptación a varios tamaños. | Cumple en alcance | B, F, I | Diseño / Frontend / QA |
| [x] | D-02 | O | Ajuste e interacción correctos en referencia iPhone SE 2020; sin controles fuera del viewport. | Cumple en alcance | B, I | QA |
| [x] | D-03 | O | Sin desbordes, recortes, texto ilegible o controles inaccesibles por límites UI. | Cumple en alcance | B, H, I | Diseño / QA |
| [x] | D-04 | O | Imágenes se renderizan rápido y con dimensiones apropiadas. | Cumple con observación EV-02 | C, H, I; EV-02 | Diseño / Frontend / QA |
| [x] | D-05 | B | Adaptación completa y funcionamiento en distintos navegadores. | Cumple en alcance | B, I | QA |
| [x] | D-06 | B | Demostrar dominio CSS: composición, espaciado, tipografía y estados coherentes. | Cumple en alcance | B, F, I | Diseño / QA |
| [x] | D-07 | P | Accesibilidad: etiquetas, teclado, foco modal, contraste y mensajes de error útiles. | Cumple en alcance | B, I; alcance axe/teclado | Diseño / QA |
| [x] | D-08 | P | Cargas, pending, errores y reintento visibles y honestos; prevenir doble envío accidental. | Cumple en alcance | A, B, I; EV-06 | Frontend / QA |
| [x] | S-01 | O | Manejo seguro de información sensible de pago y cliente. | Cumple en alcance | A, B, E, F | Backend / Frontend / QA |
| [x] | S-02 | O | Usar únicamente sandbox; no pagos con dinero real. | Cumple en alcance | E, F: allowlist sandbox | Backend / Release / QA |
| [x] | S-03 | O | Leer guía oficial de inicio e información de ambientes/llaves antes de integrar. | Cumple en alcance | F: referencias oficiales registradas | Backend |
| [x] | S-04 | O | No modificar credenciales de cuenta compartida ni añadir segundo factor. | Cumple en alcance | F: no se cambió cuenta del proveedor | Director / Backend |
| [x] | S-05 | R | Preferir integración por API keys, evitando depender de una sesión compartida. | Cumple en alcance | D, F: SSM/variables server | Backend / Release |
| [x] | S-06 | B | Aplicar controles OWASP pertinentes y justificar su alcance. | Cumple en alcance | A, B, D, F | Backend / QA |
| [x] | S-07 | B | HTTPS público en app y API. | Cumple en alcance | D, E, H | Release / QA |
| [x] | S-08 | B | Cabeceras de seguridad coherentes con aplicación y API. | Cumple en alcance | C, D, H | Release / QA |
| [x] | S-09 | P | No persistir, registrar o versionar PAN/CVC, llaves privadas ni secretos. | Cumple en alcance | A, B, E, F, G | Todos / QA |
| [x] | S-10 | P | Recalcular importes y tarifas en servidor; rechazar manipulación del cliente. | Cumple en alcance | A, B, E | Backend / QA |
| [x] | S-11 | P | Garantizar idempotencia y control de concurrencia para evitar doble cobro/stock negativo. | Cumple en alcance | A, B, D, E | Backend / QA |
| [x] | S-12 | P | Solo aprobación verificada descuenta stock y crea entrega, como máximo una vez. | Cumple en alcance | A, B, E | Backend / QA |
| [x] | S-13 | P | Recuperar pago pendiente tras refresh sin reintentar el cobro ciegamente. | Cumple en alcance | A, B, D, E | Backend / Frontend / QA |
| [x] | S-14 | P | Limitar exposición de datos de cliente y transacción; validar entradas y acceso. | Cumple en alcance | A, B, D | Backend / QA |
| [x] | Q-01 | O | Tests unitarios frontend con Jest, cobertura mayor que 80%. | Cumple en alcance | A: 89 web | Frontend / QA |
| [x] | Q-02 | O | Tests unitarios backend con Jest, cobertura mayor que 80%. | Cumple en alcance | A: 81 API | Backend / QA |
| [x] | Q-03 | O | Publicar resultados reales de cobertura de ambas aplicaciones en README. | Cumple en alcance | A, F: README actualizado | QA / Release |
| [x] | Q-04 | B | Código limpio, legible, responsabilidades claras y complejidad justificada. | Cumple en alcance | A, F; EV-03/04 | Director / QA |
| [x] | Q-05 | P | Al menos 85% en las cuatro métricas Jest por app, sin exclusiones oportunistas. | Cumple en alcance | A: métricas por aplicación | QA |
| [x] | Q-06 | P | E2E independiente positivo/negativo, responsive, accesibilidad y refresh. | Cumple en alcance | B, I | QA |
| [x] | Q-07 | P | CI reproduce instalación, lint/typecheck, Jest, build y controles relevantes. | Cumple en alcance | G: CI candidato; gate main por Release | Release / QA |
| [x] | Q-08 | P | Auditoría final punto por punto con plus, defectos abiertos y evidencia. | Cumple en alcance | Este informe y rúbrica histórica | Auditor |
| [x] | G-01 | O | Repositorio GitHub público y enlace entregable comprobado sin autenticación. | Cumple en alcance | G: API pública GitHub | Release |
| [x] | G-02 | O | Nombre del repositorio neutro y sin nombre de la empresa evaluadora. | Cumple en alcance | F: nombre/branding Lumen | Director / Release |
| [x] | G-03 | O | Solución original; no copiar otros candidatos ni distribuirla activamente a ellos. | Cumple en alcance | F: procedencia y declaración AI; sin certificación universal | Todos / Director |
| [x] | G-04 | O | Historial muestra evolución con commits genuinos; su ausencia invalida el ejercicio. | Cumple en alcance | F, G: commits genuinos conservados | Release |
| [x] | G-05 | R | Ramas y pull requests por funcionalidad. | Cumple en alcance | G: ramas y PR reales | Release |
| [x] | G-06 | R | Emplear AI, preferiblemente asistente CLI, de manera revisada. | Cumple en alcance | F: prompts/equipo/AGENTS | Director |
| [x] | G-07 | P | Mantener registro de cambios y decisiones ligado a commits. | Cumple en alcance | F, G: CHANGELOG/ADR | Release / Director |
| [x] | L-01 | O | Frontend y API funcionales completos. | Cumple en alcance | A, B, D, E | Director / QA |
| [x] | L-02 | O | README completo y actualizado junto al enlace GitHub. | Cumple en alcance | F, G: README revisado | Director / Release / Auditor |
| [x] | L-03 | O | Aplicación y API publicadas y conectadas en cloud. | Cumple en alcance | D, E | Release / QA |
| [x] | L-04 | O | Enlace de aplicación desplegada en AWS conforme a entregables; es la opción adoptada. | Cumple en alcance | D: AWS público | Release / QA |
| [ ] | L-05 | O | Alcanzar al menos 100 puntos de acuerdo con evaluación externa, sin atribuir nota garantizada. | Pendiente externo | 149 interno; sólo el empleador emite nota externa | Auditor / Director |
| [x] | L-06 | P | Infraestructura y despliegue reproducibles, con configuración segura documentada. | Cumple en alcance | C, D, F: IaC/runbook/hashes | Release |
| [x] | L-07 | P | Sustituir la prueba anterior en AWS preservando recursos ajenos. | Cumple en alcance | F: release histórico, instancia anterior stopped y reversible | Release / Director |

**Notificación al equipo:** el auditor comunicó por mensajes internos el cierre técnico de EV-03, EV-04 y EV-06 a sus responsables y al coordinador; Release conserva la observación residual EV-02. La nota 149 y el gate de integración/main CI se comunicaron antes de emitir este informe. No se notificó al empleador ni a terceros.
