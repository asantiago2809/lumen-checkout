# Checklist de diseño y UX — Lumen

Estado inicial: pendiente de implementación y revisión independiente. La especificación es `docs/design.md`. Ningún punto está aprobado por el mero hecho de estar documentado.

Estados permitidos: `PENDIENTE`, `APROBADO`, `FALLA`, `BLOQUEADO`, `NO APLICA` (con motivo). Cada aprobación necesita evidencia identificable. Los fixtures de QA deben distinguirse de transacciones reales de sandbox. No publicar capturas con PAN, CVC, secretos o datos personales reales.

## Registro de ejecución

| Campo | Valor |
| --- | --- |
| Revisor independiente | Pendiente |
| Fecha y zona horaria | Pendiente |
| Commit evaluado | Pendiente |
| URL/build | Pendiente |
| Navegadores y versiones reales | Pendiente |
| Dispositivos físicos | Pendiente; una emulación no equivale a un dispositivo |
| Automatización usada | Pendiente |
| Directorio de evidencias | `docs/quality/evidence/design/` |
| Limitaciones | Pendiente |

## Matriz de pantallas y viewport

En cada celda registrar estado y referencia de evidencia. `P` significa pendiente, nunca aprobado. La columna 375 × 667 es prioritaria. Emulación de viewport no demuestra compatibilidad con Safari/iOS.

| Pantalla/estado | 320×568 | 375×667 | 390×844 | 768×1024 | 1024×768 | 1440×900 |
| --- | --- | --- | --- | --- | --- | --- |
| Producto disponible | P | P | P | P | P | P |
| Producto cargando/error/agotado | P | P | P | P | P | P |
| Tarjeta y entrega vacío | P | P | P | P | P | P |
| Formulario con errores | P | P | P | P | P | P |
| Resumen normal | P | P | P | P | P | P |
| Resumen con textos/total largos | P | P | P | P | P | P |
| Procesando | P | P | P | P | P | P |
| Pendiente prolongado | P | P | P | P | P | P |
| Rechazado | P | P | P | P | P | P |
| Error de red/resultado incierto | P | P | P | P | P | P |
| Aprobado | P | P | P | P | P | P |
| Regreso y existencias actualizadas | P | P | P | P | P | P |

Control adicional obligatorio de D-02: repetir todas las filas a **667 × 375, orientación horizontal del SE**. Estado inicial: `PENDIENTE`. Registrar evidencia por estado; comprobar en particular que formulario/resumen permiten scroll completo, cierre y CTA visibles sin recortar contenido por baja altura.

## Matriz de navegador e interacción

| Comprobación | Chromium | Firefox | WebKit/Safari | Evidencia/limitación |
| --- | --- | --- | --- | --- |
| Flujo completo escritorio | PENDIENTE | PENDIENTE | PENDIENTE | |
| Flujo completo 375×667 | PENDIENTE | PENDIENTE | PENDIENTE | |
| Tab, Shift+Tab, Enter, Escape | PENDIENTE | PENDIENTE | PENDIENTE | |
| Foco inicial, trap, restauración | PENDIENTE | PENDIENTE | PENDIENTE | |
| Zoom 200% y reflow 320px | PENDIENTE | PENDIENTE | PENDIENTE | |
| Scroll modal y teclado móvil | PENDIENTE | PENDIENTE | PENDIENTE | Indicar si hay dispositivo real |
| Autofill, pegado y vencimiento | PENDIENTE | PENDIENTE | PENDIENTE | |
| Recarga de captura/resumen/resultado | PENDIENTE | PENDIENTE | PENDIENTE | |
| Reduced motion | PENDIENTE | PENDIENTE | PENDIENTE | |

## Controles verificables

| ID | Criterio de aprobación | Estado | Evidencia |
| --- | --- | --- | --- |
| VIS-01 | Marca y lámpara originales, proporción limpia y figura sin recortes en todos los tamaños | PENDIENTE | |
| VIS-02 | Tokens coherentes en botones, campos, paneles, tipografía, espaciados y estados | PENDIENTE | |
| VIS-03 | Contraste de texto normal ≥4.5:1 y controles/foco ≥3:1 donde corresponda; hover/autofill revisados | PENDIENTE | |
| VIS-04 | No scroll horizontal de página ni texto comprimido, truncado o superpuesto | PENDIENTE | |
| VIS-05 | CTA alcanzable, área táctil ≥44×44px; controles/CTA alto ≥48px; texto de inputs ≥16px | PENDIENTE | |
| VIS-06 | Tipografía y layout conservan lectura a 200% y con textos largos | PENDIENTE | |
| VIS-07 | Iconos alineados y consistentes; SVG liviano, sin recurso externo roto | PENDIENTE | |
| VIS-08 | Sticky/fixed y safe-area no ocultan texto, errores o acción primaria con teclado | PENDIENTE | |
| VIS-09 | No navegación ficticia, reseñas, sellos, garantías o datos promocionales inventados | PENDIENTE | |
| VIS-10 | Acabado moderno final: blanco suave/mint/verde bosque, titulares sans y CTA redondos; tokens coinciden con `apps/web/src/tokens.css` | PENDIENTE | |
| VIS-11 | Hero y resumen muestran el mismo render WebP original; srcSet 640/1200, dimensiones explícitas, SVG solo fallback y lámpara completa a 320px | PENDIENTE | |
| VIS-12 | Titulares mantienen espacios entre palabras cuando el breakpoint oculta saltos `<br>`; reduced motion elimina movimiento de flecha del CTA | PENDIENTE | |
| UX-01 | Los cinco pasos existen y el regreso reconsulta stock | PENDIENTE | |
| UX-02 | Precio/disponibilidad vienen de API; loading/error/agotado tienen acciones coherentes | PENDIENTE | |
| UX-03 | Tarjeta y entrega tienen labels persistentes, agrupación y opcionalidad clara | PENDIENTE | |
| UX-04 | Validación local y servidor produce mensajes legibles y foco al primer error | PENDIENTE | |
| UX-05 | Número de tarjeta formateado, logos Visa/Mastercard visibles según red reconocida (F-05), nombre accesible y pegado sin corrupción | PENDIENTE | |
| UX-06 | Resumen en backdrop muestra Producto, Tarifa base y Envío separados, además del total exacto en COP | PENDIENTE | |
| UX-07 | Editar datos conserva progreso permitido y jamás muestra PAN/CVC en resumen | PENDIENTE | |
| UX-08 | Total largo/nombre/dirección/referencia largos envuelven sin recorte | PENDIENTE | |
| UX-09 | Cambio de total exige revisión antes de confirmar; no pago silencioso de importe diferente | PENDIENTE | |
| UX-10 | Submit repetido no crea pagos duplicados; botón informa preparación/proceso | PENDIENTE | |
| UX-11 | Pendiente tiene consulta de estado; no apariencia ni texto de aprobado | PENDIENTE | |
| UX-12 | Rechazo permite corregir; error de red distingue fallo definitivo de resultado incierto | PENDIENTE | |
| UX-13 | Aprobado deriva de API y muestra referencia, importe y entrega real; no falsa factura | PENDIENTE | |
| UX-14 | Salir de vista durante transacción no comunica cancelación inexistente | PENDIENTE | |
| UX-15 | Recarga recupera referencia/progreso seguro sin reenviar; tarjeta efímera se recaptura si corresponde | PENDIENTE | |
| UX-16 | Contexto sandbox visible y textos españoles consistentes, sin afirmar resultados no verificados | PENDIENTE | |
| UX-17 | Aprobación consume existencias físicas una vez; un pendiente reserva disponibilidad sin consumir existencias, y el rechazo libera esa reserva | PENDIENTE | |
| A11Y-01 | `lang`, título de documento, un h1, landmarks y enlace saltar al contenido correctos | PENDIENTE | |
| A11Y-02 | Un solo diálogo activo, nombre accesible, `aria-modal`, fondo inerte y focus trap correcto | PENDIENTE | |
| A11Y-03 | Foco inicial/restaurado visible; Tab/Shift+Tab/Enter/Escape coherentes en todas las etapas | PENDIENTE | |
| A11Y-04 | Campos/ayudas/errores enlazados mediante labels y `aria-describedby`; inválidos señalados | PENDIENTE | |
| A11Y-05 | Estado se comunica con texto e icono, `aria-live` sin anuncios repetitivos por polling | PENDIENTE | |
| A11Y-06 | Botones/enlaces semánticos y controles de icono con nombre específico | PENDIENTE | |
| A11Y-07 | Reduced motion elimina animación no esencial; ninguna información depende de ella | PENDIENTE | |
| A11Y-08 | Análisis automático sin violaciones críticas/serias pendientes; informe archivado | PENDIENTE | |
| A11Y-09 | Lectura con lector de pantalla revisada o limitación explícita, sin afirmar que axe la sustituye | PENDIENTE | |
| PRIV-01 | Sin PAN/CVC en Redux, storage, URL, logs, screenshots, analytics o resumen | PENDIENTE | |
| PRIV-02 | Evidencia y documentación pública sin PII real ni credenciales | PENDIENTE | |
| PRIV-03 | Consentimiento/enlace proveedor real si requerido; nada preseleccionado ni inventado | PENDIENTE | |

## Casos de contenido adverso

Usar datos ficticios sin PII real. Probar nombre de 80 caracteres con espacios, dirección de 120 caracteres, complemento largo, referencia de 64 caracteres sin espacios, correo largo válido, departamento/ciudad largos y un importe de COP de al menos nueve cifras en fixture de presentación. No convertir estos valores en producto/precio de producción. Aceptar, rechazar o limitar inputs según contrato backend; la UI debe comunicar límites sin romperse.

Probar tarjeta vacía/incompleta/red no soportada/Luhn inválido/expirada, CVC corto, entrega incompleta, correo inválido y cambio rápido de campos. Usar únicamente números de sandbox publicados por el proveedor cuando se ejecute integración; conservarlos fuera de capturas públicas de campos completos.

## Registro de defectos

| ID | Severidad | Viewport/browser/estado | Pasos y observado | Esperado | Evidencia | Autor responsable | Resultado de retest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | Sin revisión ejecutada | — | — | — | — |

Severidad bloqueante: pago/total/stock incorrecto, información sensible expuesta, aprobación falsa, interacción primaria imposible, diálogo que encierra teclado o pantalla obligatoria ausente. Alta: errores de formulario inaccesibles, información o CTA ocultos en móvil, pérdida irrecuperable de estado, contraste crítico. Media: inconsistencia repetida que afecta claridad sin impedir completar. Baja: acabado visual localizado sin impacto funcional. La severidad se justifica por efecto real, no solo por preferencia estética.

## Mejoras adicionales y dictamen final

Separar extras verificados de requisitos: ilustración original, recuperación accesible, reduced motion, claridad de estados inciertos, protección contra duplicado, y pruebas con contenido largo solo se cuentan como plus si existen y hay evidencia. El auditor decide cuáles superan el enunciado.

Dictamen: `PENDIENTE`. No publicar como aprobado hasta resolver los bloqueos y registrar las limitaciones restantes. Debe contener commit, evidencia de navegadores/viewport, controles aprobados/fallidos/no ejecutados, defectos y responsables, mejoras verificadas y conclusión independiente.
