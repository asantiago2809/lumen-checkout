# Auditoría final de cumplimiento

**Estado: auditoría de implementación pendiente. No listo para certificar entrega.**

Esta es una plantilla trazable preparada a partir del documento fuente. No constituye aprobación de funcionalidad, diseño, cobertura, despliegue ni puntuación. Todas las filas empiezan sin evidencia verificada. La matriz de referencia está en `docs/requirements.md`; el mandato del auditor está en `docs/team/auditor.md`.

## Alcance de la revisión

| Dato | Valor |
|---|---|
| Fecha de preparación | 2026-09-23 |
| Fecha y zona de auditoría final | Pendiente |
| Auditor independiente | Pendiente |
| Commit exacto evaluado | Pendiente |
| Árbol limpio / cambios fuera del commit | Pendiente |
| Entorno y versiones de herramientas | Pendiente |
| URL GitHub pública | Pendiente |
| URL frontend AWS | Pendiente |
| URL API / documentación | Pendiente |
| Versión desplegada comprobada | Pendiente |
| Evidencia de sandbox real | Pendiente |
| Fecha objetivo comunicada por usuario | Lunes; planificación 2026-09-28 America/Bogota |

## Resultado ejecutivo

- Requisitos identificados: 82.
- Cumplimiento verificado: no evaluado todavía; no se atribuyen puntos.
- Defectos de implementación: no evaluados todavía; ausencia de hallazgos en esta plantilla no equivale a ausencia de defectos.
- Dependencias abiertas al inicio: contratos y entregables del equipo; evidencia real de GitHub, AWS y proveedor; identificación del despliegue anterior a sustituir.
- Decisión: pendiente de ejecutar auditoría y resolver las brechas obligatorias.

## Checklist requisito por requisito

Marcar `[x]` solo cuando el resultado sea **Cumple** y exista evidencia verificable de la versión entregada. Para cada evidencia registrar ruta/URL o comando, resultado, fecha y commit. Si un requisito contiene varias condiciones, todas deben cumplirse. Un bloqueo debe identificar qué falta y su dueño. Las recomendaciones y bonus no adoptados se reportan sin confundirlos con obligaciones de la fuente.

| Verificado | ID | Tipo | Criterio | Resultado | Evidencia / hallazgo | Responsable |
|---|---|---|---|---|---|---|
| [ ] | F-01 | O | Producto visible con descripción, precio y unidades disponibles procedentes del inventario. | Pendiente | Sin evidencia auditada. | Frontend / Backend |
| [ ] | F-02 | O | Acción de pagar con tarjeta de crédito claramente disponible. | Pendiente | Sin evidencia auditada. | Frontend |
| [ ] | F-03 | O | La acción abre un modal para los datos de tarjeta. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | F-04 | O | Validar datos de tarjeta antes de avanzar; solo datos ficticios con estructura válida. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | F-05 | B | Reconocer al menos VISA y MasterCard y mostrar el logo correspondiente. Es plus funcional sin puntos separados en rúbrica. | Pendiente | Sin evidencia auditada. | Frontend |
| [ ] | F-06 | O | Obtener datos de cliente y entrega necesarios para completar el envío. | Pendiente | Sin evidencia auditada. | Frontend / Backend |
| [ ] | F-07 | O | Resumen previo con importe del producto, cargo base aplicado siempre y cargo de entrega separados. | Pendiente | Sin evidencia auditada. | Frontend / Backend |
| [ ] | F-08 | O | Presentar resumen y botón final de pago en un componente backdrop reconocible. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | F-09 | O | Al confirmar, crear primero una transacción propia PENDING y obtener su identificador. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | F-10 | O | Integración real con API de pagos sandbox para ejecutar el pago. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | F-11 | O | Actualizar transacción propia con desenlace confirmado del proveedor, también cuando falla. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | F-12 | O | Asignar el producto al cliente en la entrega de una compra aprobada. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | F-13 | O | Actualizar stock después de una compra aprobada. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | F-14 | O | Mostrar resultado final comprensible y retornar a producto con inventario actualizado. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | F-15 | O | Mantener cinco etapas: producto -> datos de tarjeta/entrega -> resumen -> resultado -> producto. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | F-16 | O | Recuperar progreso tras refrescar sin perder el estado seguro del checkout. | Pendiente | Sin evidencia auditada. | Frontend / Backend / QA |
| [ ] | T-01 | O | Definir arquitectura API, datos y estructura del código coherente. | Pendiente | Sin evidencia auditada. | Director / Backend |
| [ ] | T-02 | O | Diseñar solicitudes y respuestas por endpoint explícitamente. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-03 | O | Validaciones por endpoint contemplan situaciones reales, con errores claros. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | T-04 | O | Usar métodos y códigos HTTP apropiados para solicitudes y errores. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | T-05 | O | API maneja existencias. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-06 | O | API maneja transacciones. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-07 | O | API maneja clientes. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-08 | O | API maneja entregas. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-09 | O | Recursos API admiten diferentes tipos de petición según el negocio; no basta un único stub. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | T-10 | O | SPA construida exclusivamente con ReactJS o VueJS; elección del equipo: React. | Pendiente | Sin evidencia auditada. | Frontend |
| [ ] | T-11 | O | Usar Redux o Vuex conforme a Flux; elección del equipo: Redux Toolkit. | Pendiente | Sin evidencia auditada. | Frontend |
| [ ] | T-12 | O | Mantener datos de transacción seguros en estado o localStorage. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | T-13 | O | API en JavaScript/TypeScript o Ruby con framework permitido; elección: NestJS + TypeScript. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-14 | O | Lógica de negocio fuera del controlador/routing. | Pendiente | Sin evidencia auditada. | Backend / Director |
| [ ] | T-15 | R+B | Arquitectura hexagonal con puertos/adaptadores reales y dominio desacoplado. | Pendiente | Sin evidencia auditada. | Backend / Director |
| [ ] | T-16 | R+B | ROP explícito para casos de uso y propagación de fallos sin continuar efectos incorrectos. | Pendiente | Sin evidencia auditada. | Backend / Director |
| [ ] | T-17 | O | Base de datos persistente de libre elección. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-18 | R | Preferir PostgreSQL o DynamoDB; la elección debe justificarse. | Pendiente | Sin evidencia auditada. | Director / Backend |
| [ ] | T-19 | O | Sembrar productos ficticios reproduciblemente; no se requiere endpoint de alta. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | T-20 | O | Documentar modelo de datos en README. | Pendiente | Sin evidencia auditada. | Backend / Director |
| [ ] | T-21 | O | README incluye colección Postman o URL pública Swagger. | Pendiente | Sin evidencia auditada. | Backend / Release / QA |
| [ ] | T-22 | R | Flexbox/Grid favorecidos; framework CSS y ORM/serializador son libres. | Pendiente | Sin evidencia auditada. | Frontend / Backend |
| [ ] | D-01 | O | Diseño propio cuidado con prioridad móvil y adaptación a varios tamaños. | Pendiente | Sin evidencia auditada. | Diseño / Frontend / QA |
| [ ] | D-02 | O | Ajuste e interacción correctos en referencia iPhone SE 2020; sin controles fuera del viewport. | Pendiente | Sin evidencia auditada. | QA |
| [ ] | D-03 | O | Sin desbordes, recortes, texto ilegible o controles inaccesibles por límites UI. | Pendiente | Sin evidencia auditada. | Diseño / QA |
| [ ] | D-04 | O | Imágenes se renderizan rápido y con dimensiones apropiadas. | Pendiente | Sin evidencia auditada. | Diseño / Frontend / QA |
| [ ] | D-05 | B | Adaptación completa y funcionamiento en distintos navegadores. | Pendiente | Sin evidencia auditada. | QA |
| [ ] | D-06 | B | Demostrar dominio CSS: composición, espaciado, tipografía y estados coherentes. | Pendiente | Sin evidencia auditada. | Diseño / QA |
| [ ] | D-07 | P | Accesibilidad: etiquetas, teclado, foco modal, contraste y mensajes de error útiles. | Pendiente | Sin evidencia auditada. | Diseño / QA |
| [ ] | D-08 | P | Cargas, pending, errores y reintento visibles y honestos; prevenir doble envío accidental. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | S-01 | O | Manejo seguro de información sensible de pago y cliente. | Pendiente | Sin evidencia auditada. | Backend / Frontend / QA |
| [ ] | S-02 | O | Usar únicamente sandbox; no pagos con dinero real. | Pendiente | Sin evidencia auditada. | Backend / Release / QA |
| [ ] | S-03 | O | Leer guía oficial de inicio e información de ambientes/llaves antes de integrar. | Pendiente | Sin evidencia auditada. | Backend |
| [ ] | S-04 | O | No modificar credenciales de cuenta compartida ni añadir segundo factor. | Pendiente | Sin evidencia auditada. | Director / Backend |
| [ ] | S-05 | R | Preferir integración por API keys, evitando depender de una sesión compartida. | Pendiente | Sin evidencia auditada. | Backend / Release |
| [ ] | S-06 | B | Aplicar controles OWASP pertinentes y justificar su alcance. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | S-07 | B | HTTPS público en app y API. | Pendiente | Sin evidencia auditada. | Release / QA |
| [ ] | S-08 | B | Cabeceras de seguridad coherentes con aplicación y API. | Pendiente | Sin evidencia auditada. | Release / QA |
| [ ] | S-09 | P | No persistir, registrar o versionar PAN/CVC, llaves privadas ni secretos. | Pendiente | Sin evidencia auditada. | Todos / QA |
| [ ] | S-10 | P | Recalcular importes y tarifas en servidor; rechazar manipulación del cliente. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | S-11 | P | Garantizar idempotencia y control de concurrencia para evitar doble cobro/stock negativo. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | S-12 | P | Solo aprobación verificada descuenta stock y crea entrega, como máximo una vez. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | S-13 | P | Recuperar pago pendiente tras refresh sin reintentar el cobro ciegamente. | Pendiente | Sin evidencia auditada. | Backend / Frontend / QA |
| [ ] | S-14 | P | Limitar exposición de datos de cliente y transacción; validar entradas y acceso. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | Q-01 | O | Tests unitarios frontend con Jest, cobertura mayor que 80%. | Pendiente | Sin evidencia auditada. | Frontend / QA |
| [ ] | Q-02 | O | Tests unitarios backend con Jest, cobertura mayor que 80%. | Pendiente | Sin evidencia auditada. | Backend / QA |
| [ ] | Q-03 | O | Publicar resultados reales de cobertura de ambas aplicaciones en README. | Pendiente | Sin evidencia auditada. | QA / Release |
| [ ] | Q-04 | B | Código limpio, legible, responsabilidades claras y complejidad justificada. | Pendiente | Sin evidencia auditada. | Director / QA |
| [ ] | Q-05 | P | Al menos 85% en las cuatro métricas Jest por app, sin exclusiones oportunistas. | Pendiente | Sin evidencia auditada. | QA |
| [ ] | Q-06 | P | E2E independiente positivo/negativo, responsive, accesibilidad y refresh. | Pendiente | Sin evidencia auditada. | QA |
| [ ] | Q-07 | P | CI reproduce instalación, lint/typecheck, Jest, build y controles relevantes. | Pendiente | Sin evidencia auditada. | Release / QA |
| [ ] | Q-08 | P | Auditoría final punto por punto con plus, defectos abiertos y evidencia. | Pendiente | Sin evidencia auditada. | Auditor |
| [ ] | G-01 | O | Repositorio GitHub público y enlace entregable comprobado sin autenticación. | Pendiente | Sin evidencia auditada. | Release |
| [ ] | G-02 | O | Nombre del repositorio neutro y sin nombre de la empresa evaluadora. | Pendiente | Sin evidencia auditada. | Director / Release |
| [ ] | G-03 | O | Solución original; no copiar otros candidatos ni distribuirla activamente a ellos. | Pendiente | Sin evidencia auditada. | Todos / Director |
| [ ] | G-04 | O | Historial muestra evolución con commits genuinos; su ausencia invalida el ejercicio. | Pendiente | Sin evidencia auditada. | Release |
| [ ] | G-05 | R | Ramas y pull requests por funcionalidad. | Pendiente | Sin evidencia auditada. | Release |
| [ ] | G-06 | R | Emplear AI, preferiblemente asistente CLI, de manera revisada. | Pendiente | Sin evidencia auditada. | Director |
| [ ] | G-07 | P | Mantener registro de cambios y decisiones ligado a commits. | Pendiente | Sin evidencia auditada. | Release / Director |
| [ ] | L-01 | O | Frontend y API funcionales completos. | Pendiente | Sin evidencia auditada. | Director / QA |
| [ ] | L-02 | O | README completo y actualizado junto al enlace GitHub. | Pendiente | Sin evidencia auditada. | Director / Release / Auditor |
| [ ] | L-03 | O | Aplicación y API publicadas y conectadas en cloud. | Pendiente | Sin evidencia auditada. | Release / QA |
| [ ] | L-04 | O | Enlace de aplicación desplegada en AWS conforme a entregables; es la opción adoptada. | Pendiente | Sin evidencia auditada. | Release / QA |
| [ ] | L-05 | O | Alcanzar al menos 100 puntos de acuerdo con evaluación externa, sin atribuir nota garantizada. | Pendiente | Sin evidencia auditada. | Auditor / Director |
| [ ] | L-06 | P | Infraestructura y despliegue reproducibles, con configuración segura documentada. | Pendiente | Sin evidencia auditada. | Release |
| [ ] | L-07 | P | Sustituir la prueba anterior en AWS preservando recursos ajenos. | Pendiente | Sin evidencia auditada. | Release / Director |

## Evidencia de comandos y escenarios

Registrar las ejecuciones reales; no reemplazar esta tabla por comandos propuestos.

| Fecha / commit | Comando o escenario | Entorno | Resultado real | Artefacto sanitizado |
|---|---|---|---|---|
| Pendiente | Instalación reproducible, lint, typecheck y build | Local/CI | No ejecutado por auditor | Pendiente |
| Pendiente | Jest frontend con cobertura | Local/CI | No ejecutado por auditor | Pendiente |
| Pendiente | Jest backend con cobertura | Local/CI | No ejecutado por auditor | Pendiente |
| Pendiente | Recorrido aprobado real sandbox | Despliegue | No ejecutado por auditor | Pendiente |
| Pendiente | Rechazo/error/pending/timeout | Local y despliegue según caso | No ejecutado por auditor | Pendiente |
| Pendiente | Doble envío, idempotencia y última unidad concurrente | Entorno de pruebas | No ejecutado por auditor | Pendiente |
| Pendiente | Refresh en cada etapa | Navegadores | No ejecutado por auditor | Pendiente |
| Pendiente | Diseño en 375x667, paisaje, tablet y escritorio | Navegadores | No ejecutado por auditor | Pendiente |
| Pendiente | Accesibilidad automatizada y teclado manual | Navegadores | No ejecutado por auditor | Pendiente |
| Pendiente | Secretos, datos sensibles, HTTPS y cabeceras | Código/build/despliegue | No ejecutado por auditor | Pendiente |
| Pendiente | Historial original, README y URLs anónimas | Git/GitHub/cloud | No ejecutado por auditor | Pendiente |

## Cobertura comprobada

La exigencia de la fuente es **>80% para ambas aplicaciones con Jest**; 80.00% no satisface el texto. El equipo apunta a >=85% de las cuatro métricas. Revisar también archivos elegibles, exclusiones y calidad de las aserciones. Un porcentaje agregado del monorepo no reemplaza estas dos filas.

| Aplicación | Statements | Branches | Functions | Lines | Tests pasan | Reporte / commit | Dictamen |
|---|---:|---:|---:|---:|---|---|---|
| Frontend | No medido | No medido | No medido | No medido | Sin verificar | Pendiente | Pendiente |
| Backend | No medido | No medido | No medido | No medido | Sin verificar | Pendiente | Pendiente |

## Rúbrica: evidencia y estimación no oficial

La evaluación externa asigna la nota. No hay nota estimada hasta reunir evidencia. No sumar puntos por cada subrequisito. El máximo es 150 y la fuente declara mínimo 100 para continuar.

| Categoría | Máximo | Estimación justificada | Evidencia | Brecha |
|---|---:|---|---|---|
| README | 5 | Sin evaluar | Pendiente | Pendiente |
| Imágenes rápidas / límites de UI | 5 | Sin evaluar | Pendiente | Pendiente |
| Checkout completo | 20 | Sin evaluar | Pendiente | Pendiente |
| API funcional | 20 | Sin evaluar | Pendiente | Pendiente |
| Jest >80% en ambas apps | 30 | Sin evaluar | Pendiente | Pendiente |
| App y API cloud | 20 | Sin evaluar | Pendiente | Pendiente |
| **Base** | **100** | **Sin evaluar** | | |
| OWASP + HTTPS + cabeceras | 5 | Sin evaluar | Pendiente | Pendiente |
| Responsive y varios navegadores | 5 | Sin evaluar | Pendiente | Pendiente |
| CSS | 10 | Sin evaluar | Pendiente | Pendiente |
| Código limpio | 10 | Sin evaluar | Pendiente | Pendiente |
| Hexagonal | 10 | Sin evaluar | Pendiente | Pendiente |
| ROP | 10 | Sin evaluar | Pendiente | Pendiente |
| **Bonus** | **50** | **Sin evaluar** | | |
| **Total** | **150** | **Sin evaluar** | | |

## Plus efectivamente entregados

Incluir únicamente mejoras demostradas. Diferenciar bonus de la rúbrica, plus narrativo de logos y mejoras propias (accesibilidad, concurrencia, recuperación segura, CI, observabilidad, etc.). Una mejora planeada no es una mejora entregada.

| Mejora | Origen | Valor para el usuario / revisión | Evidencia | Estado |
|---|---|---|---|---|
| Por auditar | Pendiente | Pendiente | Pendiente | No verificado |

## Hallazgos y retests

Severidad: bloqueante impide una obligación o pone en riesgo pagos/datos/despliegue; alta afecta un flujo relevante; media afecta calidad sin impedirlo; baja es mejora menor. Cada corrección debe incluir retest del caso fallido y regresión pertinente.

| ID hallazgo | Requisitos | Severidad | Pasos / esperado / observado | Dueño | Corrección / commit | Retest / evidencia | Estado |
|---|---|---|---|---|---|---|---|
| Sin auditoría ejecutada | Todos | No aplica | No se han inspeccionado entregables en esta plantilla. | Auditor | Pendiente | Pendiente | Pendiente |

## Dependencias y límites conocidos

- Los accesos informados por el usuario no prueban todavía permisos concretos de CLI ni despliegue; documentar la evidencia disponible cuando exista.
- Un mock del proveedor permite verificar lógica, pero no demuestra integración real sandbox. Declarar por separado ambos tipos de prueba.
- La publicación en cualquier cloud cumple desarrollo/rúbrica; AWS satisface además el texto más estricto de entregables y la preferencia del usuario.
- No publicar documento fuente, contactos, secretos, PAN/CVC ni datos personales en artefactos de QA. Mantener las claves únicamente en configuración local/gestor de secretos seguro.
- El límite de tiempo no autoriza declarar pruebas inexistentes, ocultar brechas, inventar commits ni enviar al evaluador sin solicitud independiente.

## Decisión final y condiciones de entrega

**Decisión actual: pendiente.** El auditor recomienda entrega únicamente cuando todas las obligaciones tienen evidencia de cumplimiento, las pruebas requeridas pasan, la integración sandbox y el despliegue público se comprobaron, y no quedan defectos bloqueantes. Las recomendaciones/bonus faltantes se declaran expresamente. Si existen limitaciones, describir impacto y aprobación del director sin cambiar un fallo a cumplimiento.

Firma del auditor, fecha, commit y enlaces de evidencia: **pendientes**.
