# Evidencia de verificación

## Cierre de entrega

La [auditoría vigente](../../../docs/quality/delivery-audit.md) vincula cada requisito con evidencia y conserva los límites de verificación.

- [Gates independientes](2026-09-23-delivery-gates.json): 81 API + 89 web Jest, 12 estáticos, typecheck/build.
- [103 ejecuciones E2E](2026-09-23-delivery-full-103.json): 11 API y 23 flujos en cuatro proyectos, con proveedor controlado. [Capturas del guardado](2026-09-23-delivery-visual/) enmascaradas.
- [API pública](2026-09-23-delivery-cloud-api.json) y [recuperación entre pestañas](2026-09-23-delivery-cloud-ui/report.json): AWS real, sin pagos.
- [Sandbox real 35950887803](live-sandbox-35950887803/report.json): aprobado con entrega/stock 11→10 y rechazado sin entrega/stock 10→10; refresh sin segundo pago, TLS normal y ocho capturas revisadas. Registra los DELETE cancelados por navegador y cero networkFailures.
- [Despliegue](2026-09-23-delivery-deployment.json): hashes de paquetes/Lambda, recursos finales e incidentes resueltos. Solo se incluyen líneas REPORT de plataforma, sin logs de aplicación ni secretos.
- Rendimiento: [resumen inicial](2026-09-23-delivery-performance-initial-summary.json), [baseline completo](2026-09-23-delivery-performance-before.json), [compresión](2026-09-23-delivery-performance-after.json) y [ajuste final](2026-09-23-delivery-performance-tuned.json). Los outliers y el fallo original de metadatos HEAD se conservan; no se suman estas muestras como un percentil de campo.

## Primera ejecución local (histórica)

Fecha: 2026-09-23. La ejecución base obtuvo **55 passed, 0 skipped, 0 flaky**, con 11 casos HTTP y 11 flujos UI repetidos en Chromium escritorio, Chromium 375x667, Firefox y WebKit. Reporte original: `2026-09-23-full-55.json`.

La UI y API se ejecutaron realmente sobre Nest/React y almacenamiento temporal aislado. El gateway de pagos fue un doble inyectado únicamente por los tests, y la tokenización externa estuvo interceptada. **Estas capturas no son evidencia de un pago sandbox real ni de un despliegue AWS.**

Las imágenes contienen datos ficticios y tarjeta enmascarada o campos vacíos. No se guardaron traces/video ni capturas automáticas de tarjeta. `qa-report.md` y `final-audit.md` en `docs/quality/` documentan alcance, cobertura, limitaciones y gates pendientes.

## Ampliación y regresión final

`2026-09-23-full-79.json`: **79 PASS, 0 skipped, 0 flaky**, inicio 2026-09-23T23:49:39.245Z y duración 88.55 s. Son 11 casos HTTP y 17 flujos UI por 4 proyectos; incluye 24 ejecuciones nuevas QA-X01–X06. Los reportes 55/12 anteriores se conservan como historial, no se suman como casos únicos.

Los seis flujos nuevos verifican movimiento reducido dinámico, teclado/fondo inert/salto, edición de resumen, salir/reabrir PENDING, medidas táctiles/tipográficas, viewports 390/1024 y estados loading/error/agotado. Las capturas adicionales contienen datos ficticios, tarjeta vacía o solo últimos cuatro dígitos. No son pagos reales.

El reporte `2026-09-23-design-initial-6.json` conserva el primer pase con dos fallos reales (movimiento reducido y target Editar) antes de corregirse. El reporte final de 79 verifica los fixes, incluido el target de consentimiento. WebKit Windows omite links en Tab nativo: el caso informa esa limitación y prueba Enter del skip-link después de foco explícito. No se certifican Safari físico, lector de pantalla ni zoom real.

## Sandbox real desde AWS y navegador de CI

[Reporte original saneado](live-sandbox-35936568755/report.json) y ocho capturas provienen del [workflow 35936568755](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755), Success público verificado por QA. Ejecución 2026-09-24T00:03:45.712Z–00:04:20.999Z, Chromium 153.0.8010.12, viewport 375×667, TLS habilitado y sin interceptar proveedor. SHA256 del JSON copiado: `EB2B5A642D90958105326118A706FC6B9B0AA1AC586B6DB64067BFCA440375E9`.

- APPROVED: una creación, una tokenización 201 y un pago 202; delivery creada; stock disponible 12→11.
- DECLINED: mismos conteos de requests; sin delivery; stock 11→11.
- Dos recargas por caso conservan transacción/resultado y no repiten pago. IDs propios y montos ficticios se conservan para trazabilidad; no se incluyen cookies, llaves, tokens ni PAN/CVC.
- El reporte conserva un `NETWORK_FAILURE` en /api/checkout/draft por caso. No se ocultó ni se clasificó como un fallo de pago. Causa exacta no capturada en este artefacto; guardados previos 200, estado/restauración y pago final pasaron.
- QA inspeccionó las ocho capturas. `*-summary-masked.png` oculta intencionalmente el bloque de entrega con máscara rosa; la tarjeta solo muestra últimos cuatro dígitos. Son capturas del área visible del diálogo, no de toda su altura.
- `*-product.png` corresponde al momento previo a cargar la foto y se conserva como evidencia temporal. `*-product-return.png` sí muestra foto y stock actualizado. No se presentan las primeras como diseño final ni prueba de fallo de imagen.

La compra aprobada es una transacción ficticia del ambiente sandbox; no dinero real. Los 79 E2E locales siguen siendo evidencia separada con gateway controlado.
