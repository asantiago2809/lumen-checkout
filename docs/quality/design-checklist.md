# Checklist independiente de diseño y UX — Lumen

**Revisión local y verificación sandbox real E14 ejecutadas el 2026-09-23, America/Bogota; alcance y pendientes explícitos.** No se aprueba un punto solo por estar documentado. APROBADO se limita a los escenarios identificados; PENDIENTE significa no ejecutado o cobertura parcial, no defecto demostrado. Los fixtures locales E4/E5/E11 no son transacciones sandbox reales; E14 tiene evidencia independiente del proveedor real.

## Registro de ejecución

| Campo | Valor |
|---|---|
| Revisor | Auditor/QA independiente de implementación |
| Fecha/zona | 2026-09-23, America/Bogota |
| Versión | E4/E5 son evidencia histórica; E11 corresponde a QA/CSS 3edc404 con 79 PASS local y CI. Fix API posterior 0c74bf7 no modifica UI. |
| URL/build | E4/E5/E11: Vite 5174 + Nest 3002 reales, FileStore aislado y gateway/tokenización externos controlados. E14: aplicación pública AWS, DynamoDB y proveedor UAT sandbox real. |
| Motores | Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6 |
| Dispositivo físico | No ejecutado; 375x667 es viewport CSS, no Safari/iPhone físico |
| Automatización | Playwright + axe; screenshots explícitos saneados, traces/video desactivados |
| Evidencia E4 | [55 ejecuciones PASS](../../tests/e2e/evidence/2026-09-23-full-55.json), 11 HTTP + 44 UI |
| Evidencia E11 | [79 ejecuciones PASS](../../tests/e2e/evidence/2026-09-23-full-79.json): 11 HTTP + 17 UI × 4 proyectos; incluye 24 nuevas ejecuciones QA-X01–X06 |
| Evidencia E5 | [12 retests visuales PASS](../../tests/e2e/evidence/2026-09-23-visual-retest-12.json), producto/formulario inválido/resumen largo en 4 proyectos |
| Evidencia E14 | [Reporte sandbox real](../../tests/e2e/evidence/live-sandbox-35936568755/report.json), [workflow 35936568755](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755), fuente fca0339: APPROVED/DECLINED en Chromium 153, 375×667, sin interceptación y con TLS validado. |
| Capturas | [Directorio y alcance](../../tests/e2e/evidence/README.md) |
| Límites | Sin lector de pantalla/teclado virtual físico, zoom 200% ni autofill real. Sandbox real limitado a los dos escenarios E14; no amplía la matriz local de navegadores/viewports. |

E1/E2 son Jest API/frontend descritos en [QA](qa-report.md). Las capturas conservadas muestran el estilo moderno; el retest E5 valida después el último ajuste de labels 14 px y alineación a 320 px. No se atribuye a esas capturas un diff visual automático que no se realizó.

## Matriz de pantallas y viewport

A=APROBADO en escenario E4/E5/E11 indicado; P=no ejecutado o parcial. Una aprobación de estado acredita comportamiento/visibilidad y comprobaciones del test; no implica revisión exhaustiva de cada píxel. 390x844 y 1024x768 ahora se verificaron para producto, formulario restaurado con tarjeta vacía y resumen normal (E11). La prioridad 375x667 y el paisaje 667x375 quedan explícitos.

| Pantalla/estado | 320×568 | 375×667 | 390×844 | 667×375 | 768×1024 | 1024×768 | 1440×900 |
|---|---|---|---|---|---|---|---|
| Producto disponible | A E5 | A E4/E5 | A E11 | A E5 | A E5 | A E11 | A E4/E5 |
| Producto cargando/error/agotado | P | A E11 | P | P | P | P | A E11 |
| Formulario con tarjeta vacía (entrega vacía/restaurada) | P | A E4 | A E11 restaurado | P | P | A E11 restaurado | A E4 |
| Formulario con errores | A E5 | A E4/E5 | P | A E5 | P | P | A E4/E5 |
| Resumen normal | P | A E4 | A E11 | P | P | A E11 | A E4 |
| Resumen con nombre/dirección largos | A E5 | A E5 | P | A E5 | A E5 | P | P |
| Procesando transitorio | P | P | P | P | P | P | P |
| Pendiente/UNKNOWN con refresh | P | A E4 | P | P | P | P | A E4 |
| Rechazado | P | A E4 | P | P | P | P | A E4 |
| Tokenización fallida / create perdido | P | A E4 | P | P | P | P | A E4 |
| Aprobado | P | A E4 | P | P | P | P | A E4 |
| Regreso y existencias actualizadas | P | A E4 | P | P | P | P | A E4 |

Paisaje: catálogo, formulario con errores y resumen largo se probaron a 667x375 con scroll/CTA accesibles. El resto de los estados en paisaje quedan P; no se declara una matriz total. Loading/error/agotado tienen pase de navegador E11, con capturas 375/1440 y recuperación de disponibilidad real del fixture.

## Matriz de navegador e interacción

| Comprobación | Chromium | Firefox | WebKit | Evidencia/limitación |
|---|---|---|---|---|
| Flujo completo escritorio | APROBADO | APROBADO | APROBADO | E4; gateway controlado |
| Flujo completo 375x667 | APROBADO | PENDIENTE | PENDIENTE | Solo proyecto Chromium-SE recorre flujo completo a ese tamaño |
| Layout producto/formulario-error/resumen largo 375x667 | APROBADO | APROBADO | APROBADO | E5 cambia viewport en todos los proyectos |
| Tab y Escape, foco inicial/trap/restaurado | APROBADO | APROBADO | APROBADO |24 Tabs permanecen en diálogo; Escape devuelve foco |
| Shift+Tab/Enter en formulario y salto al main | APROBADO | APROBADO | APROBADO con límite | E11: WebKit activa skip-link con Enter tras foco explícito; nativo Tab no incluye links en este runner. No se certifica todas las etapas. |
| Reflow 320 px sin overflow en layouts indicados | APROBADO | APROBADO | APROBADO | E5; no equivale a zoom 200% |
| Zoom 200% | PENDIENTE | PENDIENTE | PENDIENTE | No ejecutado |
| Scroll modal en paisaje 667x375 | APROBADO | APROBADO | APROBADO | E5; teclado virtual físico no probado |
| Autofill/pegado real | PENDIENTE | PENDIENTE | PENDIENTE | Fill de automatización no equivale a pegado/autofill |
| Refresh captura/resumen/resultado/UNKNOWN | APROBADO | APROBADO | APROBADO | E4; tarjeta vacía y misma transacción |
| Reduced motion dinámico | APROBADO | APROBADO | APROBADO | E11 QA-X01, emulación runtime y computed styles; sin modificación del DOM de aplicación |

## Controles verificables

| ID | Criterio de aprobación | Estado | Evidencia |
|---|---|---|---|
| VIS-01 | Marca y lámpara originales, proporción limpia y figura sin recortes en todos los tamaños | APROBADO | E4/E5 y procedencia del asset; lámpara íntegra en tamaños de catálogo ejecutados. |
| VIS-02 | Tokens coherentes en botones, campos, paneles, tipografía, espaciados y estados | APROBADO | Revisión independiente de tokens/CSS y capturas modernas E5. |
| VIS-03 | Contraste de texto normal ≥4.5:1 y controles/foco ≥3:1 donde corresponda; hover/autofill revisados | PENDIENTE | axe no detecta critical/serious en estados probados; hover/autofill y todos los contrastes de foco no revisados exhaustivamente. |
| VIS-04 | No scroll horizontal de página ni texto comprimido, truncado o superpuesto | APROBADO | Asserts de scrollWidth/CTA para catálogo, formulario con errores y resumen largo en tamaños de matriz ejecutados. |
| VIS-05 | Controles del checkout: botones/iconos/labels accionables ≥44×44 px; CTA e inputs/selects alto ≥48 px; inputs/selects texto ≥16 px. Los enlaces legales inline se revisan dentro del label. | APROBADO | E11 QA-X05: medidas reales a 375 px; labels sin configuración también a 390 px. Editar 36.89 px y labels 22.39 px corregidos; mínimos pasan en cuatro proyectos. |
| VIS-06 | Tipografía y layout conservan lectura a 200% y con textos largos | PENDIENTE | Textos largos probados; zoom 200% no ejecutado. |
| VIS-07 | Iconos alineados y consistentes; SVG liviano, sin recurso externo roto | APROBADO | Inspección visual y carga de SVG/imagen local en E4/E5 sin roturas observadas. |
| VIS-08 | Sticky/fixed y safe-area no ocultan texto, errores o acción primaria con teclado | PENDIENTE | Scroll modal a 667x375 probado; teclado virtual/safe-area de dispositivo real no disponible. |
| VIS-09 | No navegación ficticia, reseñas, sellos, garantías o datos promocionales inventados | APROBADO | Lectura independiente de vistas y contenido: producto ficticio explícito, sin reseñas ni sellos externos inventados. |
| VIS-10 | Acabado moderno final: blanco suave/mint/verde bosque, titulares sans y CTA redondos; tokens coinciden con `apps/web/src/tokens.css` | APROBADO | Acabado blanco/mint/sans inspeccionado en producto escritorio/móvil, resumen y resultado. |
| VIS-11 | Hero y resumen muestran el mismo render WebP original; srcSet 640/1200, dimensiones explícitas, SVG solo fallback y lámpara completa a 320 px | APROBADO | Test compara src catálogo/resumen; WebP 640/1200, carga y dimensiones; ProductImage compartido y fallback leído. |
| VIS-12 | Titulares mantienen espacios entre palabras cuando el breakpoint oculta saltos `<br>`; reduced motion elimina movimiento de flecha del CTA | APROBADO | Espacios E4/E5; E11 cambia prefers-reduced-motion en runtime: skeleton none, scroll auto, flecha sin transform/transition; normal recupera transición. |
| UX-01 | Los cinco pasos existen y el regreso reconsulta stock | APROBADO | E4: flujo aprobado/rechazado y retorno con 11/12 unidades según desenlace. |
| UX-02 | Precio/disponibilidad vienen de API; loading/error/agotado tienen acciones coherentes | APROBADO | E1/E2 de catálogo/loading/error/agotado y E4 catálogo real; faltan capturas específicas del estado agotado. |
| UX-03 | Tarjeta y entrega tienen labels persistentes, agrupación y opcionalidad clara | APROBADO | Formulario y errores revisados; labels accesibles usados por E4 y axe. |
| UX-04 | Validación local y servidor produce mensajes legibles y foco al primer error | APROBADO | E2/E4: mensaje y foco en primer error, errores API/precio visibles; alcance de escenarios registrados. |
| UX-05 | Número de tarjeta formateado, logos Visa/Mastercard visibles según red reconocida (F-05), nombre accesible y pegado sin corrupción | PENDIENTE | Formato/marcas/nombre accesible cubiertos por Jest y Visa UI; pegado real no ejecutado. |
| UX-06 | Resumen en backdrop muestra Producto, Tarifa base y Envío separados, además del total exacto en COP | APROBADO | E1/E3/E4: resumen, cargo base/envío y total servidor concordantes. |
| UX-07 | Editar datos conserva progreso permitido y jamás muestra PAN/CVC en resumen | APROBADO | E11 QA-X03: Editar/cambiar dirección/resumen/Volver a mis datos conserva entrega; PAN ausente en resumen/storage/DB. |
| UX-08 | Total largo/nombre/dirección/referencia largos envuelven sin recorte | PENDIENTE | Nombre/dirección/complemento largos pasan en 4 tamaños. Referencia de 64 caracteres sin espacios/total 9 cifras no ejecutados en navegador. |
| UX-09 | Cambio de total exige revisión antes de confirmar; no pago silencioso de importe diferente | APROBADO | E4 QA-M02: cambio de precio exige revisar y produce 0 cargos/0 transacciones. |
| UX-10 | Submit repetido no crea pagos duplicados; botón informa preparación/proceso | APROBADO | E4 dobleclick y E3 pay concurrente:1 gateway/1 delivery/1 descuento. |
| UX-11 | Pendiente tiene consulta de estado; no apariencia ni texto de aprobado | APROBADO | UNKNOWN con texto pendiente, Consultar estado y sin Completar pago; axe y refresh. |
| UX-12 | Rechazo permite corregir; error de red distingue fallo definitivo de resultado incierto | APROBADO | E4 rechazo, provider unavailable, tokenización fallida y UNKNOWN distinguidos; retorno/reintento verificados. |
| UX-13 | Aprobado deriva de API y muestra referencia, importe y entrega real; no falsa factura | APROBADO | E4: aprobado deriva de nuestra API real/delivery persistida con gateway controlado; no equivale a aprobación sandbox externa. |
| UX-14 | Salir de vista durante transacción no comunica cancelación inexistente | APROBADO | E11 QA-X04: Escape no cancela PENDING; abandonar página/reabrir conserva mismo ID/reserva y un solo envío. |
| UX-15 | Recarga recupera referencia/progreso seguro sin reenviar; tarjeta efímera se recaptura si corresponde | APROBADO | E3/E4: mismo ID tras refresh/pérdida de create; datos de tarjeta/consentimientos vacíos. |
| UX-16 | Contexto sandbox visible y textos españoles consistentes, sin afirmar resultados no verificados | APROBADO | Lectura visual de contexto sandbox y textos españoles; no se muestra aprobación ante estado incierto. |
| UX-17 | Aprobación consume existencias físicas una vez; un pendiente reserva disponibilidad sin consumir existencias, y el rechazo libera esa reserva | APROBADO | E1/E3/E4: onHand/reserved/available correctos tras aprobado, pendiente y rechazo. |
| A11Y-01 | `lang`, título de documento, un h1, landmarks y enlace saltar al contenido correctos | APROBADO | E11 QA-X02: es-CO, título, h1 y main únicos; salto funciona con Enter. WebKit nativo omite links en Tab: activación comprobada tras foco explícito, límite registrado. |
| A11Y-02 | Un solo diálogo activo, nombre accesible, `aria-modal`, fondo inerte y focus trap correcto | APROBADO | E11: un dialog aria-modal, título enfocado, loop inverso y fondo inert que rechaza foco programático. |
| A11Y-03 | Foco inicial/restaurado visible; Tab/Shift+Tab/Enter/Escape coherentes en todas las etapas | PENDIENTE | Tab 24, foco inicial/restaurado y Escape pasan; Shift+Tab/Enter en todas las etapas no ejecutados. |
| A11Y-04 | Campos/ayudas/errores enlazados mediante labels y `aria-describedby`; inválidos señalados | APROBADO | Labels y errores formulario/atributos accesibles revisados por axe y selección semántica E4. |
| A11Y-05 | Estado se comunica con texto e icono, `aria-live` sin anuncios repetitivos por polling | PENDIENTE | Estado texto/icono probado; anuncios repetidos en lector de pantalla no evaluados. |
| A11Y-06 | Botones/enlaces semánticos y controles de icono con nombre específico | APROBADO | Controles semánticos y nombres utilizados en E4; axe sin problemas serios/críticos en estados revisados. |
| A11Y-07 | Reduced motion elimina animación no esencial; ninguna información depende de ella | APROBADO | E11 QA-X01: preferencia dinámica reduce elimina skeleton y desplazamiento flecha, sin ocultar información. |
| A11Y-08 | Análisis automático sin violaciones críticas/serias pendientes; informe archivado | APROBADO | E4 assertions archivadas: cero critical/serious en producto, formulario inválido y aprobado/rechazado/pendiente. |
| A11Y-09 | Lectura con lector de pantalla revisada o limitación explícita, sin afirmar que axe la sustituye | APROBADO | Limitación explícita: no lector de pantalla real; axe no lo sustituye. |
| PRIV-01 | Sin PAN/CVC en Redux, storage, URL, logs, screenshots, analytics o resumen | APROBADO | E4 requests propios/storage/DB/resumen sin PAN; revisión código sin persistencia de tarjeta; capturas solo campos vacíos/máscara. |
| PRIV-02 | Evidencia y documentación pública sin PII real ni credenciales | APROBADO | Datos ficticios, escáner de 131 archivos PASS, evidencia sin PAN/CVC ni credenciales. |
| PRIV-03 | Consentimiento/enlace proveedor real si requerido; nada preseleccionado ni inventado | APROBADO | E4/E11 verifican ambas casillas inicialmente vacías. [Verificación AWS](release-report.md#live-api-regression-and-pre-payment-verification): configuración 200 con políticas reales del comercio UAT; la UI usa esos enlaces. E14 recorre ambos consentimientos explícitos con configuración real y completa APPROVED/DECLINED sin interceptación; [alcance y evidencia](qa-report.md#pago-real-sandbox-inspeccionado-independientemente). |

La navegación nativa por enlaces en WebKit Windows sigue siendo una limitación explícita: Tab y Alt+Tab enfocaron directamente el botón, omitiendo anchors. El test conserva esa observación y verifica la activación del salto tras foco explícito, sin presentarlo como Tab nativo aprobado. [Apple documenta preferencias distintas para Tab/Option-Tab](https://support.apple.com/guide/safari/cpsh003/mac); esta referencia no convierte el runner Windows en Safari físico.

## Contenido adverso y defectos

QA ejecutó nombre largo, dirección cercana al límite y complemento largo dentro del contrato, en 320/375/667 paisaje/768. No se ejecutó presentación de total 9 cifras ni referencia 64 sin espacios. Jest cubre límites de tarjeta/entrega; E4 ejecuta formulario vacío, cambio de precio, tokenización fallida, incertidumbre y proveedor indisponible. En E4/E5/E11 los datos sintéticos no salieron del gateway/tokenización interceptados; E14 utilizó datos ficticios oficiales contra el proveedor sandbox real.

| ID | Severidad | Observado | Corrección y retest | Estado |
|---|---|---|---|---|
| QA-VIS-01 | Media | Palabras unidas al ocultar br en heading/copia móvil/escritorio | Espacios explícitos; heading E4 y retest E5/revisión visual | RESUELTO |
| QA-VIS-02 | Media | Resumen conservaba SVG distinto del producto WebP | ProductImage compartido; test src y captura E4/E5 | RESUELTO |
| QA-VIS-03 | Media | Flecha CTA seguía transformándose con reduced motion | Override transform:none y QA-X01 en cuatro proyectos | RESUELTO |
| QA-VIS-04 | Media | Editar medía 36.89 px de ancho a 375 px | min-width 44 y QA-X05 con medidas | RESUELTO |
| QA-VIS-05 | Media | Labels consentimiento sin configuración medían 22.39 px alto (medición frontend) | min-height 44/padding; QA independiente a 375/390 confirma mínimos | RESUELTO |
| SEC-DOC-01 | Media | UX-17 confundía stock físico con disponibilidad | Criterio corregido y asserts E1/E3/E4 | RESUELTO |

No hay defecto visual bloqueante conocido en los escenarios revisados. Las celdas pendientes no se convierten en aprobación implícita.

## Dictamen

**Diseño local aprobado en el alcance documentado; revisión ampliada pendiente en los controles señalados.** Se verificaron jerarquía moderna, identidad original, estados financieros honestos, recuperación segura, flujo móvil/escritorio y layout estrecho/paisaje de los formularios principales. Movimiento reducido, edición, salida/reapertura PENDING, estados catálogo y tamaños 390/1024 ya están probados. Permanecen hardware/lector/autofill/zoom real, la política nativa de links WebKit y los escenarios adicionales señalados.

La configuración SSM y el draft Dynamo fueron verificados en AWS. El workflow sandbox real posterior pasó aprobación/rechazo desde Chromium 375×667, con capturas inspeccionadas y evidencia separada en [auditoría 82](final-audit.md). Las primeras capturas del producto se tomaron mientras cargaba la foto; los retornos sí la muestran. No se amplía esta aprobación a hardware, todos los estados/tamaños ni mediciones de rendimiento no realizadas.
