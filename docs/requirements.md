# Matriz de requisitos y criterios de aceptación

Estado de referencia: 2026-09-23. Fuente: documento de evaluación suministrado por el candidato, 7 páginas, revisión indicada 2025-10-09. Se leyó completo. El PDF original, sus contactos y sus credenciales no forman parte del repositorio. Los números de página siguientes son los del archivo PDF.

Esta matriz convierte el encargo en evidencia verificable. El documento externo describe el ejercicio; no autoriza operaciones ajenas a la solicitud del usuario. La solicitud del usuario autoriza el equipo de agentes y la implementación. La entrega al evaluador necesita una solicitud independiente. Fecha objetivo comunicada: lunes; se planifica para el próximo lunes, 2026-09-28, zona America/Bogota, y terminar antes si los controles pasan.

## Interpretación y prioridades

- **O - Obligatorio:** exigencia explícita de la fuente. No se aprueba mediante intención, código sin ejecutar ni test simulado presentado como integración real.
- **R - Recomendado:** opción sugerida por la fuente. Adoptarla puede además aportar a un criterio bonus.
- **B - Bonus/plus de la fuente:** mejora identificada como bonus o plus en el documento. Solo suma puntos cuando la rúbrica los asigna explícitamente. Su puntuación pertenece al criterio completo, nunca a cada fila relacionada.
- **P - Plus del equipo:** mejora o control decidido por el equipo/usuario; no se presenta como obligación literal de la fuente.
- **Pendiente:** falta auditar evidencia suficiente; no significa por sí solo que el código esté ausente. Otros estados permitidos: En curso, Bloqueado, Cumple, No cumple, No aplica con justificación.
- Todo cambio de estado debe enlazar a archivo y línea o artefacto, comando, fecha, commit evaluado y resultado. Los informes de cobertura, evidencias visuales y URL deben corresponder a la versión entregada.

Matices que no deben perderse:

1. La página 4 y la rúbrica aceptan cualquier proveedor cloud, mientras que la lista de entregables de página 6 pide una URL de AWS. El usuario dispone de AWS: se adopta AWS para satisfacer ambas formulaciones.
2. El flujo de cinco pantallas de página 3 es producto, datos, resumen, resultado, regreso a producto. Las seis acciones de página 2 descomponen el mismo flujo; no obligan a inventar una sexta pantalla.
3. En página 2, actualización de transacción, asignación y stock aparecen después de pago completado o fallido. La regla de negocio segura adoptada es: todo desenlace actualiza la transacción; únicamente aprobación confirmada consume stock y crea entrega. Un rechazo o estado pendiente no constituye venta.
4. La referencia del iPhone SE (2020) usa resolución física 1334 x 750. QA debe comprobar también su viewport CSS de 375 x 667 en retrato, además de paisaje, sin confundir píxeles físicos con viewport.
5. La cobertura requerida es **mayor que 80%**, por separado para frontend y backend, con Jest. La fuente no delimita métricas; el acuerdo del equipo apunta a al menos 85% de statements, branches, functions y lines sin excluir lógica para inflar cifras.
6. Hexagonal y ROP se recomiendan en desarrollo, y cada uno vale 10 bonus. El acuerdo del equipo los adopta como controles internos de salida. PostgreSQL/DynamoDB son recomendaciones; no son las únicas bases permitidas.
7. GitHub debe ser público y la solución debe ser original con evolución real. La redacción prohíbe usar el nombre de la empresa en el repositorio sin delimitar si se refiere al nombre o todo su contenido. Decisión conservadora: nombre, descripción, branding y textos comerciales neutros; referencias técnicas indispensables al proveedor se limitan a integración/configuración, y no se publica el documento del ejercicio.
8. Las instrucciones sobre no compartir la solución con otros candidatos se aplican junto con el requisito explícito de repositorio público: no distribuir activamente la solución a candidatos ni copiar otras soluciones.
9. Los 100 puntos base y 50 bonus son categorías de la rúbrica, no una nota garantizada. El mínimo indicado para continuar es 100 puntos totales; el equipo persigue todos los requisitos y bonus, sin sustituir requisitos ausentes por puntos estimados.

## Matriz funcional

| ID | Página | Tipo | Directriz y aceptación | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|---|---|---|
| F-01 | 2,3 | O | Producto visible con descripción, precio y unidades disponibles procedentes del inventario. | UI + respuesta API + registro persistido concordantes. | Frontend / Backend | Pendiente |
| F-02 | 2 | O | Acción de pagar con tarjeta de crédito claramente disponible. | Prueba UI del botón y su transición. | Frontend | Pendiente |
| F-03 | 2 | O | La acción abre un modal para los datos de tarjeta. | E2E de abrir/cerrar y captura de modal. | Frontend / QA | Pendiente |
| F-04 | 2 | O | Validar datos de tarjeta antes de avanzar; solo datos ficticios con estructura válida. | Jest de campos/formato y E2E de errores. | Frontend / QA | Pendiente |
| F-05 | 2 | B | Reconocer al menos VISA y MasterCard y mostrar el logo correspondiente. Es plus funcional sin puntos separados en rúbrica. | Casos válidos, inválidos y marca no reconocida; capturas. | Frontend | Pendiente |
| F-06 | 2,3 | O | Obtener datos de cliente y entrega necesarios para completar el envío. | Contrato, validaciones UI/API y persistencia. | Frontend / Backend | Pendiente |
| F-07 | 2 | O | Resumen previo con importe del producto, cargo base aplicado siempre y cargo de entrega separados. | Cálculo API + Jest + total visible concordante. | Frontend / Backend | Pendiente |
| F-08 | 2 | O | Presentar resumen y botón final de pago en un componente backdrop reconocible. | UI abierta con plano posterior y plano frontal; E2E. | Frontend / QA | Pendiente |
| F-09 | 2 | O | Al confirmar, crear primero una transacción propia PENDING y obtener su identificador. | Test de orden + evidencia de persistencia antes de invocar proveedor. | Backend | Pendiente |
| F-10 | 2 | O | Integración real con API de pagos sandbox para ejecutar el pago. | Contrato oficial y comprobante sandbox sanitizado con ID, fecha y resultado. | Backend / QA | Pendiente |
| F-11 | 2 | O | Actualizar transacción propia con desenlace confirmado del proveedor, también cuando falla. | Pruebas aprobado/rechazado/error/pendiente y consulta posterior. | Backend / QA | Pendiente |
| F-12 | 2 | O | Asignar el producto al cliente en la entrega de una compra aprobada. | Relación producto-transacción-cliente-entrega consultable. | Backend | Pendiente |
| F-13 | 2 | O | Actualizar stock después de una compra aprobada. | Test de antes/después y recarga de producto. | Backend / QA | Pendiente |
| F-14 | 2,3 | O | Mostrar resultado final comprensible y retornar a producto con inventario actualizado. | E2E de éxito y fallo, sin éxito falso. | Frontend / QA | Pendiente |
| F-15 | 3 | O | Mantener cinco etapas: producto -> datos de tarjeta/entrega -> resumen -> resultado -> producto. | E2E completo y mapa UI documentado. | Frontend / QA | Pendiente |
| F-16 | 3,4 | O | Recuperar progreso tras refrescar sin perder el estado seguro del checkout. | E2E de refresh en datos, resumen, procesamiento y resultado; política de datos. | Frontend / Backend / QA | Pendiente |

## Matriz técnica y de información

| ID | Página | Tipo | Directriz y aceptación | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|---|---|---|
| T-01 | 3 | O | Definir arquitectura API, datos y estructura del código coherente. | ADR/arquitectura y estructura implementada. | Director / Backend | Pendiente |
| T-02 | 3 | O | Diseñar solicitudes y respuestas por endpoint explícitamente. | OpenAPI o colección Postman alineada con API real. | Backend | Pendiente |
| T-03 | 3 | O | Validaciones por endpoint contemplan situaciones reales, con errores claros. | Jest de límites/tipos/datos inexistentes y QA negativo. | Backend / QA | Pendiente |
| T-04 | 2,3 | O | Usar métodos y códigos HTTP apropiados para solicitudes y errores. | Contrato + pruebas de endpoints GET/POST y respuestas. | Backend / QA | Pendiente |
| T-05 | 3 | O | API maneja existencias. | Endpoints/dominio/persistencia y test. | Backend | Pendiente |
| T-06 | 3 | O | API maneja transacciones. | Creación, consulta, estados persistidos y test. | Backend | Pendiente |
| T-07 | 3 | O | API maneja clientes. | Modelo, validación, persistencia y test. | Backend | Pendiente |
| T-08 | 3 | O | API maneja entregas. | Modelo, asociación y test. | Backend | Pendiente |
| T-09 | 3 | O | Recursos API admiten diferentes tipos de petición según el negocio; no basta un único stub. | Inventario de rutas y QA funcional; no se exige CRUD artificial. | Backend / QA | Pendiente |
| T-10 | 4 | O | SPA construida exclusivamente con ReactJS o VueJS; elección del equipo: React. | Manifiesto/build y navegación SPA. | Frontend | Pendiente |
| T-11 | 4 | O | Usar Redux o Vuex conforme a Flux; elección del equipo: Redux Toolkit. | Store/actions/selectors, transiciones y Jest. | Frontend | Pendiente |
| T-12 | 4 | O | Mantener datos de transacción seguros en estado o localStorage. | Inspección de persistencia, sin PAN/CVC/secretos; test de restauración. | Frontend / QA | Pendiente |
| T-13 | 4 | O | API en JavaScript/TypeScript o Ruby con framework permitido; elección: NestJS + TypeScript. | Dependencias/build y proceso real. | Backend | Pendiente |
| T-14 | 4 | O | Lógica de negocio fuera del controlador/routing. | Revisión de controladores delgados y casos de uso probados. | Backend / Director | Pendiente |
| T-15 | 4,6 | R+B | Arquitectura hexagonal con puertos/adaptadores reales y dominio desacoplado. | Diagrama + dependencias + adapters sustituibles + test del caso de uso. | Backend / Director | Pendiente |
| T-16 | 4,6 | R+B | ROP explícito para casos de uso y propagación de fallos sin continuar efectos incorrectos. | Result tipado/composición + pruebas de ramas exitosas y fallidas. | Backend / Director | Pendiente |
| T-17 | 4 | O | Base de datos persistente de libre elección. | Reinicio y consulta de datos conservados, esquema/migraciones. | Backend | Pendiente |
| T-18 | 4 | R | Preferir PostgreSQL o DynamoDB; la elección debe justificarse. | ADR y configuración de base escogida. | Director / Backend | Pendiente |
| T-19 | 4 | O | Sembrar productos ficticios reproduciblemente; no se requiere endpoint de alta. | Seed ejecutable e idempotente y productos de muestra. | Backend | Pendiente |
| T-20 | 3,4 | O | Documentar modelo de datos en README. | Diagrama/entidades, relaciones y restricciones reales. | Backend / Director | Pendiente |
| T-21 | 3 | O | README incluye colección Postman o URL pública Swagger. | Enlace usable y contraste con API desplegada. | Backend / Release / QA | Pendiente |
| T-22 | 4 | R | Flexbox/Grid favorecidos; framework CSS y ORM/serializador son libres. | CSS y decisión técnica, sin convertir herramientas opcionales en requisitos. | Frontend / Backend | Pendiente |

## Diseño y experiencia

| ID | Página | Tipo | Directriz y aceptación | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|---|---|---|
| D-01 | 3,4 | O | Diseño propio cuidado con prioridad móvil y adaptación a varios tamaños. | QA visual de todas las etapas en móvil/tablet/escritorio. | Diseño / Frontend / QA | Pendiente |
| D-02 | 4 | O | Ajuste e interacción correctos en referencia iPhone SE 2020; sin controles fuera del viewport. | Capturas y E2E 375x667 y orientación horizontal. | QA | Pendiente |
| D-03 | 4,6 | O | Sin desbordes, recortes, texto ilegible o controles inaccesibles por límites UI. | Checklist visual con textos largos, errores y pantallas pequeñas. | Diseño / QA | Pendiente |
| D-04 | 6 | O | Imágenes se renderizan rápido y con dimensiones apropiadas. | Assets optimizados, tamaño/medición de red y carga sin desplazamientos severos. | Diseño / Frontend / QA | Pendiente |
| D-05 | 6 | B | Adaptación completa y funcionamiento en distintos navegadores. | Matriz con Chromium/Firefox/WebKit cuando disponibles; versiones y defectos. | QA | Pendiente |
| D-06 | 6 | B | Demostrar dominio CSS: composición, espaciado, tipografía y estados coherentes. | Revisión independiente del CSS y capturas de estados. | Diseño / QA | Pendiente |
| D-07 | Equipo | P | Accesibilidad: etiquetas, teclado, foco modal, contraste y mensajes de error útiles. | axe + recorrido de teclado y revisión manual. | Diseño / QA | Pendiente |
| D-08 | Equipo | P | Cargas, pending, errores y reintento visibles y honestos; prevenir doble envío accidental. | E2E con red lenta/fallo y test de transiciones. | Frontend / QA | Pendiente |

## Seguridad e integración

| ID | Página | Tipo | Directriz y aceptación | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|---|---|---|
| S-01 | 3 | O | Manejo seguro de información sensible de pago y cliente. | Revisión código, red, logs, estado, disco y build público sanitizada. | Backend / Frontend / QA | Pendiente |
| S-02 | 5 | O | Usar únicamente sandbox; no pagos con dinero real. | Validación de entorno/base URL/configuración y pago ficticio real de sandbox. | Backend / Release / QA | Pendiente |
| S-03 | 5 | O | Leer guía oficial de inicio e información de ambientes/llaves antes de integrar. | Registro de referencias oficiales/fecha y decisión de URLs de la cuenta provista. | Backend | Pendiente |
| S-04 | 5 | O | No modificar credenciales de cuenta compartida ni añadir segundo factor. | Declaración de operaciones de integración y ausencia de cambios de cuenta. | Director / Backend | Pendiente |
| S-05 | 5 | R | Preferir integración por API keys, evitando depender de una sesión compartida. | Variables de entorno y adapter servidor con keys fuera del repo. | Backend / Release | Pendiente |
| S-06 | 6 | B | Aplicar controles OWASP pertinentes y justificar su alcance. | Matriz de amenazas/controles y pruebas negativas. | Backend / QA | Pendiente |
| S-07 | 6 | B | HTTPS público en app y API. | URLs reales, TLS y ausencia de mixed content. | Release / QA | Pendiente |
| S-08 | 6 | B | Cabeceras de seguridad coherentes con aplicación y API. | Respuestas desplegadas y análisis de cabeceras, no solo config local. | Release / QA | Pendiente |
| S-09 | Equipo | P | No persistir, registrar o versionar PAN/CVC, llaves privadas ni secretos. | Escaneo repo/historial/build/logs; inspección localStorage y DB. | Todos / QA | Pendiente |
| S-10 | Equipo | P | Recalcular importes y tarifas en servidor; rechazar manipulación del cliente. | Tests de importe/precio/estado manipulados. | Backend / QA | Pendiente |
| S-11 | Equipo | P | Garantizar idempotencia y control de concurrencia para evitar doble cobro/stock negativo. | Tests de doble envío, replay, conflicto de clave y última unidad concurrente. | Backend / QA | Pendiente |
| S-12 | Equipo | P | Solo aprobación verificada descuenta stock y crea entrega, como máximo una vez. | Tests de aprobado duplicado, declined, pending, timeout y error proveedor. | Backend / QA | Pendiente |
| S-13 | Equipo | P | Recuperar pago pendiente tras refresh sin reintentar el cobro ciegamente. | E2E de cierre/refresh durante pago y reconciliación por identificador. | Backend / Frontend / QA | Pendiente |
| S-14 | Equipo | P | Limitar exposición de datos de cliente y transacción; validar entradas y acceso. | Modelo de amenaza, respuestas sanitizadas y pruebas de acceso indebido. | Backend / QA | Pendiente |

## Calidad, repositorio y entrega

| ID | Página | Tipo | Directriz y aceptación | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|---|---|---|
| Q-01 | 4,6 | O | Tests unitarios frontend con Jest, cobertura mayor que 80%. | Comando reproducible, salida y coverage-summary/json/html del frontend. | Frontend / QA | Pendiente |
| Q-02 | 4,6 | O | Tests unitarios backend con Jest, cobertura mayor que 80%. | Comando reproducible, salida y coverage-summary/json/html del backend. | Backend / QA | Pendiente |
| Q-03 | 4 | O | Publicar resultados reales de cobertura de ambas aplicaciones en README. | Cifras coincidentes con artefactos y commit probado. | QA / Release | Pendiente |
| Q-04 | 6 | B | Código limpio, legible, responsabilidades claras y complejidad justificada. | Revisión independiente y ejecución de lint/typecheck/build. | Director / QA | Pendiente |
| Q-05 | Equipo | P | Al menos 85% en las cuatro métricas Jest por app, sin exclusiones oportunistas. | Configuración collectCoverageFrom + artefactos completos revisados. | QA | Pendiente |
| Q-06 | Equipo | P | E2E independiente positivo/negativo, responsive, accesibilidad y refresh. | Casos, comandos, resultados y capturas/trace sin datos sensibles. | QA | Pendiente |
| Q-07 | Equipo | P | CI reproduce instalación, lint/typecheck, Jest, build y controles relevantes. | Workflow versionado y ejecución en GitHub para commit entregado. | Release / QA | Pendiente |
| Q-08 | Equipo | P | Auditoría final punto por punto con plus, defectos abiertos y evidencia. | docs/quality/final-audit.md completo con estado real. | Auditor | Pendiente |
| G-01 | 5,6 | O | Repositorio GitHub público y enlace entregable comprobado sin autenticación. | URL y lectura anónima. | Release | Pendiente |
| G-02 | 5 | O | Nombre del repositorio neutro y sin nombre de la empresa evaluadora. | Nombre/description/branding públicos revisados; matiz de alcance arriba. | Director / Release | Pendiente |
| G-03 | 5,6 | O | Solución original; no copiar otros candidatos ni distribuirla activamente a ellos. | Procedencia del código/assets y declaración honesta de uso de AI. | Todos / Director | Pendiente |
| G-04 | 6 | O | Historial muestra evolución con commits genuinos; su ausencia invalida el ejercicio. | git log/diffs, trabajo incremental y remoto concordante. | Release | Pendiente |
| G-05 | 5 | R | Ramas y pull requests por funcionalidad. | Ramas/PR reales, revisiones y enlaces; nunca fabricar historia retroactiva. | Release | Pendiente |
| G-06 | 5 | R | Emplear AI, preferiblemente asistente CLI, de manera revisada. | Registro honesto de colaboración y revisión humana/agentes. | Director | Pendiente |
| G-07 | Equipo | P | Mantener registro de cambios y decisiones ligado a commits. | CHANGELOG/ADR/registro de entrega actualizado. | Release / Director | Pendiente |
| L-01 | 6 | O | Frontend y API funcionales completos. | Build producción + recorrido integrado sobre despliegue público. | Director / QA | Pendiente |
| L-02 | 6 | O | README completo y actualizado junto al enlace GitHub. | Auditoría README: propósito, instalación, variables sin secretos, ejecución, tests/cobertura, API, modelo, URLs, decisiones y limitaciones. | Director / Release / Auditor | Pendiente |
| L-03 | 4,6 | O | Aplicación y API publicadas y conectadas en cloud. | URLs públicas reales, health/API y compra sandbox desde frontend desplegado. | Release / QA | Pendiente |
| L-04 | 6 | O | Enlace de aplicación desplegada en AWS conforme a entregables; es la opción adoptada. | URL AWS/dominio, inventario de recursos y frontend conectado a backend. | Release / QA | Pendiente |
| L-05 | 6 | O | Alcanzar al menos 100 puntos de acuerdo con evaluación externa, sin atribuir nota garantizada. | Tabla de evidencia por criterio; estimación explícitamente no oficial. | Auditor / Director | Pendiente |
| L-06 | Equipo | P | Infraestructura y despliegue reproducibles, con configuración segura documentada. | IaC/script, variables, instrucciones y comprobación de despliegue. | Release | Pendiente |
| L-07 | Usuario | P | Sustituir la prueba anterior en AWS preservando recursos ajenos. | Inventario exacto previo, backup/reversión pertinente y registro de recursos cambiados. | Release / Director | Pendiente |

## Rúbrica y asignación de evidencia

Los máximos siguientes suman 100 base y 50 bonus. Ninguna fila de requisitos multiplica estos puntos. Los badges, el número de tests, los mocks y la intención de implementar no otorgan puntos por sí solos. F-05 es plus descrito en la narrativa sin puntuación adicional independiente.

| Criterio | Máximo | IDs principales | Evidencia para proponer cumplimiento | Estado inicial |
|---|---:|---|---|---|
| README correcto | 5 | L-02, T-20, T-21, Q-03 | README íntegro y todos los comandos/enlaces verificados. | Sin evaluar |
| Imágenes rápidas y sin desbordes UI/UX | 5 | D-02, D-03, D-04 | QA visual y mediciones de assets/carga. | Sin evaluar |
| Checkout completo con tarjeta | 20 | F-01 a F-16 | Recorrido público real de sandbox, errores y recuperación. | Sin evaluar |
| API funcional | 20 | T-01 a T-09, F-09 a F-13 | API/persistencia integradas y pruebas reales. | Sin evaluar |
| Cobertura >80% frontend y backend | 30 | Q-01, Q-02, Q-03 | Dos reportes Jest del commit entregado, todos los tests pasan. | Sin evaluar |
| App y API desplegadas en cloud | 20 | L-01, L-03, L-04 | URLs públicas conectadas y prueba funcional. | Sin evaluar |
| OWASP, HTTPS y cabeceras de seguridad | 5 bonus | S-06, S-07, S-08 | Evidencia de los tres controles en despliegue real. | Sin evaluar |
| Responsive y varios navegadores | 5 bonus | D-01, D-02, D-05 | Matriz real de tamaños/navegadores, sin defectos bloqueantes. | Sin evaluar |
| Dominio CSS | 10 bonus | D-06, T-22 | Revisión del CSS y estados visuales completos. | Sin evaluar |
| Código limpio | 10 bonus | Q-04, T-14 | Revisión independiente y comprobaciones de calidad. | Sin evaluar |
| Hexagonal con puertos/adaptadores | 10 bonus | T-15 | Dependencias y sustitución real de adaptadores. | Sin evaluar |
| ROP | 10 bonus | T-16 | Composición de resultados y comportamiento de fallos probado. | Sin evaluar |

## Evidencia mínima y bloqueos

El auditor no acepta como cumplimiento: cobertura agregada que oculta una app bajo el límite, pantallazos sin escenario/viewport, URL local presentada como pública, mocks presentados como sandbox, despliegue antiguo presentado como la versión actual, configuración HTTPS sin comprobación remota, commits inventados ni pruebas autorrevisadas como sustituto de QA independiente.

El acceso GitHub/AWS comunicado por el usuario no demuestra aún acceso de CLI, permisos concretos ni identificación de los recursos existentes. La sustitución AWS requiere primero inventario y delimitación del despliegue anterior, sin borrar recursos compartidos indiscriminadamente. Un bloqueo de proveedor/credenciales debe identificarse con error sanitizado y contexto reproducible, mientras el resto del trabajo continúa.

El diseño propio y la elección libre de CSS/ORM no eximen de calidad. No se exige CRUD completo de productos, SDK particular, autenticación de usuario, una base específica ni un porcentaje Lighthouse que el documento no pide. Esas decisiones se justifican por el objetivo y no se añaden como obligaciones inventadas.
