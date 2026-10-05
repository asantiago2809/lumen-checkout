# Guía de sustentación de Lumen Checkout

Guía en español para explicar la prueba técnica, recorrer el código y resolver cambios durante una entrevista. Describe la implementación revisada en `54da7d73f9b189531adf5fd79325a82510c43adf`; las líneas de código corresponden a esa versión. Preparada el **5 de octubre de 2026**. La [auditoría de entrega](quality/delivery-audit.md) conserva la evaluación y las evidencias de septiembre.

## Índice

1. [Explicación inicial y recorrido](#explicación-inicial-y-recorrido)
2. [Rutas y accesos](#rutas-y-accesos)
3. [Ejecutar y comprobar](#ejecutar-y-comprobar)
4. [Arquitectura y recorrido del pago](#arquitectura-y-recorrido-del-pago)
5. [Mapa del backend](#mapa-del-backend)
6. [Mapa del frontend](#mapa-del-frontend)
7. [Datos y estados](#datos-y-estados)
8. [Todas las operaciones de la API](#todas-las-operaciones-de-la-api)
9. [Preguntas del líder y respuestas](#preguntas-del-líder-y-respuestas)
10. [Cambios que podrían pedirte](#cambios-que-podrían-pedirte)
11. [Pruebas y evidencia](#pruebas-y-evidencia)
12. [Infraestructura y diagnóstico](#infraestructura-y-diagnóstico)
13. [Índice de la documentación](#índice-de-la-documentación)
14. [Preparación antes de compartir pantalla](#preparación-antes-de-compartir-pantalla)

## Explicación inicial y recorrido

Una apertura de aproximadamente un minuto, para adaptar a tus propias palabras:

> Lumen es un checkout de una lámpara ficticia con React, Redux Toolkit y una API NestJS. El usuario revisa el producto, completa tarjeta y entrega, confirma un resumen, recibe el resultado y regresa al producto con el stock actualizado. El servidor controla precios, inventario y estado financiero. La tarjeta se tokeniza directamente con Wompi. Primero guardo una transacción pendiente y reservo inventario; después reclamo un único envío al proveedor. Solo una aprobación verificada consume stock físico y crea la entrega. Separé dominio, casos de uso y adaptadores para probar esas reglas y cambiar almacenamiento sin acoplarlas a HTTP. La entrega incluye AWS, Swagger, pruebas, historia Git y evidencia real de sandbox, con sus límites documentados.

Recorrido sugerido de diez minutos:

| Tiempo | Mostrar | Idea que debes explicar |
| --- | --- | --- |
| 0–2 min | Producto y formulario | Cinco momentos del flujo, diseño responsive, validación y logos |
| 2–4 min | Resumen y recuperación | Importes del servidor, guardado confirmado, tarjeta efímera |
| 4–6 min | `create`, `pay`, `finalize` | Reserva, idempotencia, claim y aprobación verificada |
| 6–8 min | Puertos, DynamoDB y pruebas | Dependencias, atomicidad y caso de última unidad |
| 8–10 min | CI, sandbox y límites | Evidencia real, diferencia frente a mocks y siguientes mejoras |

No memorices respuestas que no puedas conectar con el código. Para una pregunta difícil: explica la regla, abre el símbolo que la implementa, muestra una prueba y reconoce el límite pertinente. El proyecto documenta desarrollo asistido por IA; explica con transparencia tu intervención y las validaciones que puedes defender.

## Rutas y accesos

| Recurso | Dirección | Acceso |
| --- | --- | --- |
| Aplicación local | <http://localhost:5173/> | Sin usuario ni contraseña; requiere procesos locales |
| API local | <http://localhost:3001/api/health> | Salud pública; no comprueba cada dependencia externa |
| Swagger local | <http://localhost:3001/api/docs> | Lectura pública; escrituras con sesión y CSRF |
| OpenAPI local | <http://localhost:3001/api/docs-json> | Contrato JSON |
| Aplicación AWS | <https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/> | Pública, sandbox |
| Swagger AWS | <https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/api/docs> | Mismo origen de la aplicación |
| OpenAPI AWS | <https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/api/docs-json> | Contrato JSON público |
| Repositorio | <https://github.com/asantiago2809/lumen-checkout> | Lectura pública; escribir requiere tu sesión GitHub |
| Historial de CI | <https://github.com/asantiago2809/lumen-checkout/actions> | Consultar el commit correspondiente |
| CI de entrega en main | <https://github.com/asantiago2809/lumen-checkout/actions/runs/35952312346> | Ejecución histórica satisfactoria |
| Compra real sandbox registrada | <https://github.com/asantiago2809/lumen-checkout/actions/runs/35950887803> | Evidencia de aprobado y rechazado |
| Consola AWS | <https://console.aws.amazon.com/console/home?region=us-east-1> | Tu cuenta, región `us-east-1`; no se necesita para comprar |

No existe panel administrativo, login de comprador ni una contraseña de demostración. La identidad del checkout es una cookie de sesión, y no permite recuperar la compra desde otro dispositivo. Las credenciales privadas están en configuración del servidor; no hacen falta para consultar código, Swagger ni evidencia.

El 5 de octubre se verificaron 17 controles públicos: HTTPS, cabeceras, coincidencia de los dos bundles con el build local, endpoints, repositorio/documentos públicos y render a 375 y 1440 px. API, catálogo, Swagger, OpenAPI y configuración sandbox local también devolvieron HTTP 200. Estas comprobaciones no ejecutaron un nuevo cobro. En septiembre hubo un problema TLS de UAT en Windows; hoy la consulta local de configuración respondió, lo que no demuestra por sí solo tokenización o pago desde todos los navegadores.

## Ejecutar y comprobar

Para una modificación y posterior publicación, seguir la [guía de cambios y despliegue en vivo](live-demo-runbook.md), que incluye autenticación, verificación y reversión.

Desde la raíz del repositorio:

```powershell
npm.cmd run dev
```

Inicia Vite en 5173 y Nest en 3001. El proceso inicial compila la API y luego observa cambios. Usa `Ctrl+C` en esa terminal para detener sus procesos. Si ya está ejecutándose, reutilízalo; no abras otra instancia sobre los mismos puertos.

En una copia nueva: Node >=22.12, `npm ci`, configurar `apps/api/.env` desde `.env.example` sin reemplazar una configuración existente, y después iniciar. El [README](../README.md#run-from-a-fresh-checkout) contiene los comandos completos. La semilla es idempotente: reiniciar no repone inventario consumido.

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/products
Get-NetTCPConnection -State Listen -LocalPort 3001,5173
```

| Comando desde la raíz | Para qué sirve |
| --- | --- |
| `npm.cmd run typecheck` | Tipos de ambas aplicaciones |
| `npm.cmd run test:coverage` | Jest y cobertura por aplicación |
| `npm.cmd run build` | Compilación y bundle de producción |
| `npm.cmd run check:secrets` | Detección preventiva de credenciales versionadas |
| `node --test infra/static-site/index.test.cjs` | Entrega estática, caché y gzip |
| `npm.cmd run test:e2e` | Suite independiente; usa 5174 y 3002 |

Para E2E, preparar primero `npm.cmd run build -w apps/api` y, si faltan navegadores, `npx playwright install chromium firefox webkit`. En Linux pueden requerirse las dependencias del sistema con `--with-deps`. E2E tiene su propio servidor, base temporal y gateway controlado; no usa el inventario de desarrollo ni certifica por sí solo un pago real.

## Arquitectura y recorrido del pago

```text
React + Redux ── /api por mismo origen ── Nest HTTP
     │                                     │
     │ tarjeta efímera                     ▼
     └── tokenización Wompi          CheckoutService
              │                        │           │
              └── token opaco ────────► │           │
                                  CheckoutStore  PaymentGateway
                                      │           │
                                  File/Dynamo   Wompi sandbox
```

El diagrama muestra responsabilidades, no una transacción distribuida. Nest compone los adaptadores; el dominio no importa Nest, AWS ni HTTP. React llama a la API propia para sesión, cotización, reserva y resultado. PAN y CVC van directamente al proveedor mediante tokenización. El token opaco sí pasa al backend para enviar el pago, pero no se persiste completo.

1. **Iniciar:** productos y sesión; recuperar borrador confirmado o transacción existente.
2. **Completar:** validar tarjeta/entrega y obtener ambos consentimientos. Guardar únicamente el borrador no financiero.
3. **Cotizar:** leer precio y tarifas del servidor; mostrar subtotal, cargo base, envío y total.
4. **Crear:** `POST /transactions`, llave idempotente y total esperado. Escribir atómicamente producto reservado, cliente, transacción, idempotencia y sesión con borrador canónico.
5. **Tokenizar:** el navegador recibe el token del proveedor y vacía los campos de tarjeta tras la tokenización correcta.
6. **Pagar:** `POST /transactions/:id/pay`. El backend persiste `CLAIMED` antes de la llamada externa y firma el snapshot del importe.
7. **Confirmar:** validar referencia, importe, moneda y estado. Un ID o HTTP 201 no significa aprobación.
8. **Finalizar:** aprobar consume stock físico y crea entrega una sola vez; rechazo definitivo libera reserva. Incertidumbre conserva pendiente y reserva.
9. **Recuperar:** consultar el ID existente, sin enviar otro cobro automáticamente. Regresar al producto limpia el borrador elegible y actualiza stock.

## Mapa del backend

Rutas relativas a la raíz. Los enlaces abren el archivo y su línea en GitHub; usa el mismo número en el editor de la copia revisada.

| Quiero encontrar | Archivo y línea | Símbolo o responsabilidad |
| --- | --- | --- |
| Composición de dependencias | [create-app.ts:33](../apps/api/src/bootstrap/create-app.ts#L33) | `createApp`, adaptadores, Helmet, validación, Swagger |
| Puertos | [ports.ts:23](../apps/api/src/application/ports.ts#L23) | `CheckoutStore`; `PaymentGateway` en 41, `Runtime` en 51 |
| Result y ROP | [result.ts:22](../apps/api/src/domain/result.ts#L22) | `Result`, `ok`, `fail`, `andThen` |
| Cálculo de dinero | [checkout.ts:10](../apps/api/src/domain/checkout.ts#L10) | `quote`, cantidad, stock, enteros seguros |
| Entidades y tarifas | [models.ts:1](../apps/api/src/domain/models.ts#L1) | Tipos; tarifas en 108–109 |
| Producto inicial | [checkout.service.ts:47](../apps/api/src/application/checkout.service.ts#L47) | `seed`; no reinicia producto existente |
| Sesión y propietario | [checkout.service.ts:74](../apps/api/src/application/checkout.service.ts#L74) | `sessionFromToken`, `bootstrap`, `owned` |
| Borrador y dos pestañas | [checkout.service.ts:121](../apps/api/src/application/checkout.service.ts#L121) | `saveDraft`; vuelve a comprobar el pendiente al reintentar |
| Creación e idempotencia | [checkout.service.ts:220](../apps/api/src/application/checkout.service.ts#L220) | `create`, normalización, snapshot y reserva |
| Expiración y finalización | [checkout.service.ts:367](../apps/api/src/application/checkout.service.ts#L367) | `expire`, `matches` en 381, `finalize` en 388 |
| Reclamar y enviar pago | [checkout.service.ts:465](../apps/api/src/application/checkout.service.ts#L465) | `pay`; claim durable antes de red |
| Consultar y reconciliar | [checkout.service.ts:541](../apps/api/src/application/checkout.service.ts#L541) | `transaction`, validación del proveedor |
| Controladores | [api.controller.ts:34](../apps/api/src/infrastructure/http/api.controller.ts#L34) | `unwrap` y rutas delgadas |
| Errores HTTP | [domain-error-status.ts:5](../apps/api/src/infrastructure/http/domain-error-status.ts#L5) | Mapa exhaustivo de los 14 códigos de dominio |
| Entrada estricta | [dtos.ts:99](../apps/api/src/infrastructure/http/dtos.ts#L99) | `QuoteDto`, `CreateDto` en 103, `DraftDto` en 120; `PayDto` en 133 |
| Sesión y CSRF | [security.ts:14](../apps/api/src/infrastructure/http/security.ts#L14) | `CheckoutGuard`; Origin/rate en 52; filtro en 98 |
| Cliente Wompi | [sandbox.gateway.ts:33](../apps/api/src/infrastructure/payment/sandbox.gateway.ts#L33) | Configuración, timeout, firma, creación y consulta |
| Validar JSON externo | [sandbox-response.ts:46](../apps/api/src/infrastructure/payment/sandbox-response.ts#L46) | Aceptaciones; `transactionFrom` en 71 |
| Atomicidad DynamoDB | [dynamo.store.ts:71](../apps/api/src/infrastructure/persistence/dynamo.store.ts#L71) | `commit`, transacciones y versiones esperadas |
| Persistencia local | [file.store.ts:13](../apps/api/src/infrastructure/persistence/file.store.ts#L13) | Mutex de proceso, versiones y reemplazo atómico |
| Secretos y Lambda | [runtime-secrets.ts:13](../apps/api/src/bootstrap/runtime-secrets.ts#L13), [lambda-runtime.ts:14](../apps/api/src/bootstrap/lambda-runtime.ts#L14) | SSM permitido y reutilización del arranque |

## Mapa del frontend

| Quiero encontrar | Archivo y línea | Qué debes explicar |
| --- | --- | --- |
| Montaje y Provider | [main.tsx:7](../apps/web/src/main.tsx#L7) | React y Redux Toolkit |
| Producto y apertura | [App.tsx:7](../apps/web/src/App.tsx#L7) | Carga, error, agotado, modal y fondo `inert` |
| Estado global | [store.ts:11](../apps/web/src/store.ts#L11), [types.ts:1](../apps/web/src/types.ts#L1) | Producto, borrador, cotización y transacción |
| Recuperar al recargar | [store.ts:70](../apps/web/src/store.ts#L70) | `initialize`; sesión como autoridad |
| Estado de guardado | [store.ts:61](../apps/web/src/store.ts#L61) | Comparación de edición con snapshot confirmado |
| Cola de guardado | [store.ts:91](../apps/web/src/store.ts#L91), [Checkout.tsx:125](../apps/web/src/Checkout.tsx#L125) | Serialización y debounce 500 ms |
| Cerrar y continuar | [Checkout.tsx:157](../apps/web/src/Checkout.tsx#L157), [Checkout.tsx:204](../apps/web/src/Checkout.tsx#L204) | Esperar persistencia; conservar formulario si falla |
| Orquestar compra | [Checkout.tsx:248](../apps/web/src/Checkout.tsx#L248) | Crear, tokenizar, pagar y recuperar |
| API y tokenización | [api.ts:30](../apps/web/src/api.ts#L30), [api.ts:150](../apps/web/src/api.ts#L150) | Cookie/CSRF propios y tarjeta directa al proveedor |
| Punteros persistidos | [api.ts:204](../apps/web/src/api.ts#L204), [store.ts:243](../apps/web/src/store.ts#L243) | Lista permitida; no serializar Redux completo |
| Consulta progresiva | [usePolling.ts:6](../apps/web/src/usePolling.ts#L6) | 2/3/5/8 s, pausa oculta/offline y ciclo de 60 s |
| Marca y validación | [validation.ts:4](../apps/web/src/validation.ts#L4), [validation.ts:44](../apps/web/src/validation.ts#L44) | Prefijos, Luhn, vencimiento, CVC y cuotas |
| Logos de tarjeta | [components.tsx:44](../apps/web/src/components.tsx#L44) | SVG Visa/Mastercard; formulario y resumen lo consumen |
| Imágenes | [components.tsx:141](../apps/web/src/components.tsx#L141) | WebP responsive y fallback SVG |
| Campos accesibles | [Checkout.tsx:45](../apps/web/src/Checkout.tsx#L45) | `Field`: label, mensajes y asociaciones de error |
| Foco del modal | [components.tsx:181](../apps/web/src/components.tsx#L181) | `Dialog`: contención, Escape y restauración |
| Identidad y responsive | [tokens.css:1](../apps/web/src/tokens.css#L1), [styles.css:1037](../apps/web/src/styles.css#L1037) | Variables compartidas y media queries; movimiento reducido en 1338 |

## Datos y estados

El precio inicial es COP 189.000; cargo base COP 2.500; entrega COP 12.000. Total COP 203.500. El cálculo usa **18.900.000 + 250.000 + 1.200.000 = 20.350.000 centavos**, enteros seguros. Cada pedido contiene una unidad.

**Cambio local de entrevista, 5 de octubre:** se agrega IVA del 19% exclusivamente sobre producto: COP 35.910. Nuevas cotizaciones y pedidos locales suman **COP 239.410** (23.941.000 centavos) e incluyen `vatRatePercent` y `vatInCents`. Los pedidos anteriores conservan sus importes. El despliegue entregado en AWS sigue con la versión anterior hasta publicar este cambio.

| Entidad | Función | Relación principal |
| --- | --- | --- |
| Product | Precio, imagen y contadores de inventario | Referenciado por transacción y entrega |
| Customer | Snapshot de contacto por intento | Propietario por sesión, no directorio público |
| Transaction | Snapshot de producto, dirección, importes y resultado | Cliente, producto, proveedor y entrega opcional |
| Delivery | Despacho `READY` creado una vez al aprobar | Una transacción aprobada |
| CheckoutSession | Borrador, CSRF, transacción activa, vencimiento 24 h | Identidad opaca del navegador |
| Idempotency | Llave por sesión, hash del cuerpo y transacción | Un intento lógico recuperable |

Son referencias lógicas; DynamoDB no aporta claves foráneas SQL. La tabla usa `pk`, `sk` y `version`; catálogo `CATALOG / PRODUCT#id`, otras entidades con prefijo de tipo. El GSI `pending-index` ayuda a encontrar pendientes. La semilla y el esquema están en el código y [README](../README.md#architecture-and-data-model).

| Situación partiendo de 12 unidades | Disponible | Reservado | Físico sin vender |
| --- | ---: | ---: | ---: |
| Inicial | 12 | 0 | 12 |
| Reserva PENDING | 11 | 1 | 12 |
| Aprobación | 11 | 0 | 11 |
| Rechazo en lugar de aprobar | 12 | 0 | 12 |

Invariante: `stockOnHand = stockAvailable + stockReserved`. La reserva reduce disponibilidad; únicamente la aprobación consume inventario físico.

| Tipo de estado | Valores | Por qué se separa |
| --- | --- | --- |
| Interfaz | PRODUCT, DETAILS, SUMMARY, RESULT | El regreso a PRODUCT es el quinto momento |
| Financiero | PENDING, APPROVED, DECLINED, ERROR, VOIDED | Lo que sabemos del resultado |
| Envío | NOT_STARTED, CLAIMED, SUBMITTED, UNKNOWN | Si otro intento podría duplicar el cobro |

La reserva no enviada vence lógicamente a los 15 minutos y se libera durante lecturas pertinentes. La sesión expira a las 24 horas; el TTL de DynamoDB no libera reservas. Los pendientes ya reclamados o inciertos requieren conciliación, no expiración ciega.

## Todas las operaciones de la API

Prefijo `/api`. Éxito `{data: ...}`, excepto `DELETE /checkout/draft`, que devuelve 204 sin cuerpo; fallo `{error: {code, message, fields?, requestId?}}`. Swagger expone **14 operaciones de negocio**; las dos rutas de documentación son adicionales.

| Método y ruta | Uso |
| --- | --- |
| GET `/health` | Proceso listo, sin revelar configuración |
| GET `/products` | Catálogo y disponible |
| GET `/products/:id` | Producto particular |
| GET `/checkout/config` | Llave pública sandbox y consentimientos vigentes |
| POST `/checkout/session` | Crear o recuperar cookie de sesión |
| GET `/checkout/session` | Recuperar CSRF, borrador y transacción activa |
| PUT `/checkout/draft` | Guardar datos no financieros |
| DELETE `/checkout/draft` | Limpiar borrador o cancelar reserva elegible |
| POST `/checkout/quote` | Cotización calculada por servidor |
| POST `/transactions` | PENDING y reserva, con `Idempotency-Key` |
| POST `/transactions/:id/pay` | Enviar una vez el pago existente |
| GET `/transactions/:id` | Estado propio y reconciliación si hay ID externo |
| GET `/customers/:id` | Contacto de la sesión propietaria |
| GET `/deliveries/:id` | Entrega de la sesión propietaria |

Para practicar Swagger, empezar con `POST /checkout/session` y `{}`. El navegador conserva la cookie HttpOnly. Copiar el `csrfToken` de esa respuesta al botón **Authorize**, campo `csrf`; es un valor efímero de tu sesión, no una contraseña del proyecto. En creación, usar UUID como `Idempotency-Key` y conservarlo al reintentar la misma compra. No compartir capturas con cookies o tokens. Las operaciones de escritura sí cambian datos; para recorrer documentación basta leer los esquemas.

Un rechazo bancario es un resultado financiero, no HTTP 500. `409` representa conflictos como inventario, precio o intento activo; `401` sesión vencida; `403` CSRF/origen inválido; `404` recurso inexistente o ajeno; `503` dependencia indisponible. El contrato detallado está en [api-contract.md](architecture/api-contract.md).

## Preguntas del líder y respuestas

### Arquitectura y negocio

**1. ¿Por qué React, Redux y Nest?** React y Redux forman parte del alcance; Redux concentra el flujo recuperable. Nest aporta composición, validación y documentación HTTP. Los casos de uso siguen dependiendo de puertos, no del framework. Evité añadir carrito, login o administración que no se necesitaban.

**2. ¿Qué hace hexagonal a esta aplicación?** `CheckoutService` depende de `CheckoutStore`, `PaymentGateway` y `Runtime`. El arranque inyecta archivo o DynamoDB y el gateway. El dominio tiene reglas y tipos sin AWS/Nest/HTTP; la traducción de errores HTTP vive en su adaptador. Mostrar `ports.ts`, `create-app.ts` y `domain-error-status.ts`.

**3. ¿Dónde está ROP?** `Result<T>` distingue explícitamente éxito y error; `andThen` encadena validaciones de la cotización y detiene el camino de éxito ante un fallo. Los casos de uso propagan errores esperados antes de efectos. No todas las excepciones de infraestructura se convierten en Result: el filtro sanitiza las inesperadas. Mostrar `domain/checkout.ts` y `result.ts`.

**4. ¿Por qué DynamoDB y no SQL?** Se eligió para integrar Lambda, pago por uso y escrituras atómicas condicionales con patrones de acceso conocidos. El costo es diseñar claves, índices y consistencia explícitamente, sin joins ni claves foráneas. Con consultas relacionales o reportes más complejos, SQL sería una alternativa razonable. Mostrar `dynamo.store.ts` e `infra/template.yaml`.

**5. ¿Puede el cliente alterar el precio?** Envía un total esperado para detectar cambios; el servidor cotiza de nuevo y cobra el snapshot propio. Usa centavos enteros y valida límites seguros. Una discrepancia produce `PRICE_CHANGED`, nunca se cobra el valor enviado por el navegador.

**6. ¿Por qué reservar antes de pagar?** Para no cobrar cuando ya no quedan unidades. Se reserva disponible y se conserva físico hasta aprobación. Interpreté la ambigüedad del enunciado de forma que un rechazo no despache ni consuma mercancía. La decisión está en ADR-004.

### Pagos, concurrencia y fallos

**7. ¿Qué pasa con dos compradores de la última unidad?** La versión esperada del producto y `TransactWriteItems` permiten que solo una reserva confirme. El otro intento vuelve a leer y encuentra agotado. Los retries CAS están limitados a cinco y actualmente no tienen backoff.

**8. ¿Para qué sirve la llave idempotente?** Asocia sesión, cuerpo normalizado y transacción. Repetir la misma llave y cuerpo devuelve el intento existente; cambiar el cuerpo produce conflicto. La llave no debe regenerarse ante una respuesta perdida. `create` implementa esta regla.

**9. ¿Un botón deshabilitado evita dobles cobros?** Ayuda a la experiencia, pero la garantía está en el backend: claim persistido antes de llamar al proveedor. Un segundo `/pay` observa ese claim y no reenvía. En frontend un `ref` también bloquea el doble clic inmediatamente.

**10. ¿Garantizas exactly once?** No entre la base y el proveedor remoto. No hay una transacción distribuida. El diseño impide nuestros reenvíos después del claim; una caída entre reclamar y recibir respuesta puede dejar un pendiente que requiere conciliación. Es un compromiso explícito entre disponibilidad y evitar duplicados.

**11. ¿Por qué un timeout no es un rechazo?** El proveedor pudo procesar la operación sin que llegara la respuesta. Se conserva `PENDING/UNKNOWN`, reserva y `canPay=false`. Con ID externo se consulta y valida; sin ID no se implementó una búsqueda por referencia verificada ni un reintento ciego.

**12. ¿Cómo confías en la respuesta de Wompi?** Se recibe como `unknown`, se valida estructura, estados e importes, y luego se compara referencia/importe/moneda con el snapshot. Un JSON malformado o una aprobación que no corresponde queda incierto. TypeScript por sí solo no valida la red. Mostrar `sandbox-response.ts` y `matches`.

**13. ¿Cómo evitas una segunda entrega?** `finalize` solo modifica un pendiente y confirma stock, transacción y entrega atómicamente con versiones esperadas. El segundo finalizador encuentra estado terminal y no repite efectos. No se implementaron reembolsos ni reversión de una aprobación posterior.

**14. ¿La reserva se limpia exactamente al minuto 15?** No hay tarea periódica. Vence lógicamente y se libera al leer productos, cotización o transacción por las rutas pertinentes, solo si nunca se reclamó envío. El GSI puede tener consistencia eventual. TTL limpia sesiones; no decide estados financieros.

**15. ¿Qué error interesante encontraron y corrigieron?** Una pestaña podía modificar el borrador después de reservar desde otra. Ahora la creación guarda el borrador canónico en la misma transacción y cada retry de `saveDraft` vuelve a comprobar el pendiente. El frontend recupera borrador y transacción juntos, vaciando tarjeta y consentimientos. Mostrar `draft-reservation.spec.ts` y las regresiones de pestañas en E2E.

### Frontend, diseño y seguridad

**16. ¿Por qué tarjeta fuera de Redux?** PAN, CVC y vencimiento son datos efímeros del componente. Redux gestiona el proceso; serializar su estado completo expondría datos en DevTools o persistencia. La API propia recibe solo el token opaco y parámetros del pago, no PAN/CVC. Esto reduce exposición; no es una certificación PCI.

**17. ¿Qué persiste y qué vuelve al refrescar?** En navegador solo `version`, `productId`, `step`, `transactionId`, `idempotencyKey`. En servidor el borrador confirmado y la transacción de sesión. No se recuperan tarjeta ni casillas de consentimiento. Si el pago fue enviado, se consulta el mismo ID.

**18. ¿El autoguardado garantiza no perder ninguna pulsación?** No. Tiene debounce de 500 ms y espera respuesta. La interfaz distingue pendiente, guardando, guardado y error con reintento. Cerrar/continuar esperan; refrescar antes de confirmar todavía puede perder la última edición. No existe `beforeunload`.

**19. ¿Cómo evitas que una respuesta antigua marque como guardado lo nuevo?** La cola serializa solicitudes; el estado compara el contenido editado con el snapshot confirmado, además de contar pendientes. Una respuesta antigua no confirma una edición posterior. Entre pestañas también se necesitan las reglas atómicas del backend.

**20. ¿Qué marcas reconoce el logo?** Visa por prefijo 4 y Mastercard por 51–55 o 2221–2720. Visa admite 13/16/19 dígitos; Mastercard 16. Ambas pasan Luhn, vencimiento y CVC de tres dígitos. Otras marcas se rechazan en la UI. Un prefijo parcial puede activar el logo: eso no demuestra validez ni aprobación.

**21. ¿Probaste Mastercard y una compra real?** La detección/validación de Visa y Mastercard tiene pruebas de interfaz y unidad. La evidencia real final de sandbox corresponde a Visa aprobado y rechazado. No presento esa evidencia como una compra real Mastercard o de otra franquicia.

**22. ¿Cómo funciona polling?** Consultas seriales con espera 2/3/5/8 segundos, pausa al ocultarse/offline y límite de ciclo 60 segundos. Al agotarlo se mantiene pendiente y se permite consultar manualmente. Una solicitud ya iniciada puede terminar después; desmontar impide aplicar resultados tardíos. No se inventa aprobación por tiempo.

**23. ¿Cómo lo proteges si no hay login?** Cookie opaca HttpOnly, Secure en producción, SameSite=Lax y HMAC de su identificador en almacenamiento. Se verifica propietario, CSRF y Origin. DTO estrictos rechazan campos extra y recursos ajenos devuelven 404. La sesión de navegador no equivale a una cuenta de usuario.

**24. ¿Qué decisiones hacen usable el modal?** Nombre accesible, fondo `inert`, contención y devolución del foco, Escape controlado, labels visibles y errores asociados. Los estados no dependen solo del color. Tokens, Grid/Flex, campos y botones compartidos mantienen consistencia responsive.

**25. ¿Por qué no copiaste la página de Wompi?** El diseño toma como objetivo claridad y calidad de un checkout moderno y crea identidad Lumen, producto original, arte local y acento verde. El sistema usa tokens y componentes compartidos, imágenes WebP y fallback SVG; no es una copia de la marca del proveedor.

### Calidad, infraestructura y evolución

**26. ¿Qué significa 99% de cobertura?** Es el porcentaje del código instrumentado ejecutado por Jest, separado en statements, branches, functions y lines. No equivale a ausencia de errores ni a cobertura de todos los escenarios reales. Mostrar cobertura de cada app y pruebas de invariantes, no solo el número.

**27. ¿Mocks o Wompi real?** Hay ambas evidencias: 103 E2E deterministas con API real y gateway controlado, y otra ejecución Linux contra AWS/DynamoDB/proveedor real. En el sandbox final se observó un aprobado con entrega/stock 11→10 y un rechazado sin entrega/stock 10→10. No se mezclan esos niveles.

**28. ¿Cómo se despliega?** CloudFormation declara API Gateway HTTPS, Lambda API, Lambda estática, S3 privado, DynamoDB, IAM y logs. La configuración privada se obtiene de SSM cifrado. La opción CloudFront quedó disponible pero no activada por una restricción de verificación de la cuenta. El dominio actual usa API Gateway.

**29. ¿Qué optimización hiciste?** Imágenes WebP responsive, sin fuente externa, gzip negociado y caché acotada para estáticos inmutables, además de más recursos para la Lambda estática. Se registró reducción de transferencia y muestras de LCP; una muestra móvil de primera visita quedó en 4.976 s. No son percentiles de usuarios reales.

**30. ¿Qué falta para mayor escala?** Reconciliación periódica y webhook firmado, operación de pendientes sin ID, rate limiting compartido o en el borde, más observabilidad de negocio y medición de latencia en campo. El archivo local no es almacenamiento distribuido. Priorizaría robustez de confirmación antes de sumar métodos de pago.

**31. ¿Por qué no hay webhook?** La implementación usa consultas autenticadas. Un webhook exige validar firma, ambiente, referencia e importes, deduplicar eventos y aplicar la misma finalización atómica. La variable de secreto de eventos está reservada, pero no constituye un endpoint implementado.

**32. ¿Cómo fue el trabajo asistido por agentes?** Los roles y prompts están versionados: desarrollo, diseño, QA, seguridad, release y auditoría. La evidencia son código, pruebas, decisiones y commits reales, no la afirmación de un agente. Explica qué decisiones entiendes, qué verificaste personalmente y qué mejorarías, sin atribuirte validaciones que no hiciste.

**33. ¿Por qué no microservicios?** El alcance es un checkout pequeño con invariantes que deben cambiar juntas. Separar prematuramente inventario, pagos y entregas añadiría coordinación distribuida. La separación por puertos permite evolucionar sin pagar ese costo desde el inicio.

**34. ¿Qué aporta CI frente a probar en tu máquina?** Instalación limpia en Linux/Node 22, tipado, cobertura, pruebas estáticas, build y navegadores. Descubre diferencias del entorno y guarda artifacts. La ejecución de sandbox es separada porque depende de terceros y consume inventario ficticio. Los artifacts tienen retención de 14 días; el reporte seguro importante también está versionado.

## Cambios que podrían pedirte

Antes de editar: confirma comportamiento esperado y un ejemplo; localiza la regla; añade o ajusta una prueba que demuestre el cambio; implementa; ejecuta el test específico y tipos; explica efectos en API/UI/datos. No ejecutes un despliegue AWS para practicar un cambio local.

| Petición | Dónde empezar | Qué debe comprobarse |
| --- | --- | --- |
| Cambiar tarifa de envío | `apps/api/src/domain/models.ts:109`, `domain/checkout.ts:24` | Total servidor, config, resumen, firma y fixtures. Cambiar solo el texto no cambia el cobro |
| Bajar cuotas máximas de 36 a 12 | `apps/web/src/Checkout.tsx:518`, `validation.ts:74`, API `dtos.ts:133` | 1/12 válidos; 0/13 inválidos tanto UI como HTTP |
| Mostrar código postal opcional | `Checkout.tsx:527`, `validation.ts:82`, `api.ts:110` | Campo ya existe en tipos; omitir vacío, validar seis dígitos, resumen y refresh |
| Exigir código postal | API `AddressDto`, `domain/models.ts:20`, formulario web | Creación estricta; conservar borrador parcial; ausente/inválido/válido |
| Cambiar color o espaciado | `tokens.css`, media queries de `styles.css` | Contraste, foco, 320/375 px, texto largo, movimiento reducido y axe |
| Configurar tiempo de polling | `usePolling.ts:6` | Sustituir ambos límites, no solapar consultas, cancelar resultados tardíos |
| Configurar tiempo de reserva | `checkout.service.ts:325` y `expire:367` | Reloj inyectado antes/en límite; no liberar una reserva ya reclamada |
| Comprar varias unidades | Tipos `quantity:1`, DTO, quote, servicio, UI | Cambio transversal: subtotal, reserva, entrega y concurrencia con stock insuficiente |
| Añadir otra franquicia | `validation.ts`, `components.tsx`, contrato de tokenización | Prefijos, longitud, CVC, proveedor y evidencia real; el logo por sí solo no basta |
| Añadir webhook | Puerto/caso de uso, HTTP y seguridad | Firma vigente, evento repetido/fuera de orden, datos coincidentes y atomicidad |

Ejemplos de pruebas enfocadas, desde la raíz:

```powershell
npm.cmd run test -w apps/web -- --runTestsByPath src/validation.test.ts
npm.cmd run test -w apps/web -- --runTestsByPath src/usePolling.test.tsx
npm.cmd run test -w apps/api -- --runTestsByPath test/checkout.spec.ts
npm.cmd run test -w apps/api -- --runTestsByPath test/draft-reservation.spec.ts
npm.cmd run typecheck
npm.cmd run test:e2e -- tests/e2e/checkout.spec.ts --grep "QA-X02|QA-X05|QA-U02"
```

Estos son ejercicios propuestos, no funcionalidades añadidas. Para Git: rama acotada, diff revisable y commit convencional descriptivo, por ejemplo `feat(checkout): limit installments to twelve` si ese es el cambio realmente realizado. No alterar ni fabricar historia para una demostración.

## Pruebas y evidencia

Resultados de la entrega de septiembre de 2026; consultar el run y su commit antes de atribuir un resultado a una versión distinta.

| Capa | Resultado registrado | Ubicación |
| --- | --- | --- |
| API Jest | 81 tests; S 99%, B 95.66%, F 100%, L 99% | [apps/api/test](../apps/api/test), `apps/api/coverage/` al generarla |
| Web Jest | 89 tests; S 96.55%, B 95.09%, F 96.15%, L 97.60% | Tests junto a `apps/web/src`, `apps/web/coverage/` |
| Playwright | 103 ejecuciones, 0 fallos/skips/flaky | [tests/e2e](../tests/e2e), [configuración](../playwright.config.ts) |
| Estáticos | 12 tests | [index.test.cjs](../infra/static-site/index.test.cjs) |
| Proveedor real | Visa APPROVED y DECLINED | [reporte seguro](../tests/e2e/evidence/live-sandbox-35950887803/report.json) |
| Auditoría interna | 149/150; 81 controles verificados de 82 | [delivery-audit.md](quality/delivery-audit.md) |

S/B/F/L significan statements, branches, functions y lines. El requisito de Jest era >80% por aplicación; el objetivo de revisión fue >=85% en las cuatro métricas. Los umbrales automáticos actuales de Jest son 85% API y 81% web; los resultados finales superan 85% en ambas. El control L05 de calificación externa no lo puede emitir el equipo. **149/150 es una evaluación interna**, no la nota de la empresa.

Los 103 E2E son 11 escenarios API y 23 escenarios UI en cuatro proyectos: Chromium escritorio, Chromium 375×667, Firefox y WebKit. Hay pruebas adicionales de tamaños estrechos, teclado, foco y accesibilidad automática. No se certifican Safari físico, lector de pantalla físico ni zoom real al 200%.

Pruebas que conviene abrir:

| Tema | Archivo |
| --- | --- |
| Precio, última unidad, doble envío, aprobación y expiración | [checkout.spec.ts](../apps/api/test/checkout.spec.ts) |
| Carreras de borrador y pedido reservado | [draft-reservation.spec.ts](../apps/api/test/draft-reservation.spec.ts) |
| DTO, sesión, CSRF y códigos HTTP | [http.spec.ts](../apps/api/test/http.spec.ts) |
| Respuestas proveedor y firma | [gateway.spec.ts](../apps/api/test/gateway.spec.ts) |
| Serialización DynamoDB con HTTP real | [dynamo-http.spec.ts](../apps/api/test/dynamo-http.spec.ts) |
| Persistencia y arranque | [persistence.spec.ts](../apps/api/test/persistence.spec.ts), [lambda.spec.ts](../apps/api/test/lambda.spec.ts) |
| Marcas y validación | [validation.test.ts](../apps/web/src/validation.test.ts), [components.test.tsx](../apps/web/src/components.test.tsx) |
| Flujo y guardado | [App.test.tsx](../apps/web/src/App.test.tsx), [store.test.ts](../apps/web/src/store.test.ts) |
| Polling y transporte | [usePolling.test.tsx](../apps/web/src/usePolling.test.tsx), [api.test.ts](../apps/web/src/api.test.ts) |
| Recorrido independiente | [checkout.spec.ts](../tests/e2e/checkout.spec.ts), [api-security.spec.ts](../tests/e2e/api-security.spec.ts) |

## Infraestructura y diagnóstico

| Recurso o tema | Ubicación |
| --- | --- |
| Tabla DynamoDB, TTL e índice | [infra/template.yaml:38](../infra/template.yaml#L38) |
| Rol API y Lambda | [infra/template.yaml:84](../infra/template.yaml#L84), Lambda en 111 |
| API Gateway y rutas | [infra/template.yaml:133](../infra/template.yaml#L133) |
| S3 privado y CloudFront opcional | [infra/template.yaml:170](../infra/template.yaml#L170), distribución en 225 |
| Lambda de estáticos y rutas | [infra/template.yaml:294](../infra/template.yaml#L294), función en 322 |
| Salidas del stack | [infra/template.yaml:373](../infra/template.yaml#L373) |
| Empaquetado API | [scripts/package-api.ps1](../scripts/package-api.ps1) |
| Procedimiento despliegue y rollback | [infra/README.md](../infra/README.md) |
| CI calidad y artifacts | [.github/workflows/quality.yml](../.github/workflows/quality.yml) |
| CI proveedor real | [.github/workflows/sandbox.yml](../.github/workflows/sandbox.yml) |

Stacks usados: `lumen-checkout` y `lumen-checkout-artifacts`. Funciones: `lumen-checkout-api` y `lumen-checkout-web`, región `us-east-1`. Configuración cifrada en SSM `/lumen-checkout/sandbox`; el parámetro se carga al inicializar Lambda mediante una lista de campos permitidos. No hay refresco periódico de secretos implementado. La memoria quedó en 512 MiB por función dentro del límite de la cuenta.

La cuenta o sesión AWS solo se necesita para inspeccionar/administrar infraestructura. La documentación no contiene llaves, tokens privados ni valores del parámetro. No muestres `.env`, el valor de SSM, almacenamiento de sesión o registros con datos personales al compartir pantalla.

| Síntoma | Comprobación y explicación |
| --- | --- |
| Localhost no abre | Revisar terminal/procesos y puertos; ejecutar `npm run dev` desde la raíz |
| UI abre pero catálogo falla | Revisar `/api/health`, puerto 3001 y proxy de Vite |
| Puerto ocupado | Identificar proceso con `Get-NetTCPConnection`; no matar procesos ajenos por número de puerto |
| Configuración de pago 503 | Revisar presencia de variables, ambiente/llaves emparejados y respuesta del proveedor sin imprimir secretos |
| Certificado de UAT no confiable | Mantener validación TLS; no usar `NODE_TLS_REJECT_UNAUTHORIZED=0`; exponer el límite del entorno |
| Pago pendiente tras timeout | Consultar el mismo intento; no borrar la base ni repetir un POST al proveedor |
| 403 al escribir desde Swagger | Crear sesión y autorizar CSRF desde el mismo origen permitido |
| 409 al guardar borrador | Puede existir una compra pendiente; recuperar sesión y snapshot canónico |
| Stock menor después de una demo | Es persistente; un sandbox aprobado consume una unidad ficticia |
| Artefacto CI vencido | Retención 14 días; usar evidencia segura versionada y ejecutar de nuevo solo cuando corresponda |

## Índice de la documentación

Leer primero README, esta guía, requisitos y auditoría de entrega. Los documentos de diseño registran decisiones; la implementación actual y la evidencia de cierre determinan qué se terminó.

| Documento | Uso |
| --- | --- |
| [README](../README.md) | Instalación, modelo, API, calidad, despliegue y límites |
| [Requisitos](requirements.md) | 82 controles y trazabilidad del enunciado |
| [Auditoría de entrega](quality/delivery-audit.md) | Cierre vigente, checklist, mejoras y limitaciones |
| [Contrato API](architecture/api-contract.md) | Payloads, seguridad, estados y recuperación; webhook marcado como futuro |
| [Decisiones](architecture/decisions.md) | ADR y alternativas; árbol propuesto inicial no sustituye el mapa real de esta guía |
| [Diseño](design.md) | Dirección visual, componentes y estados |
| [Activos visuales](design-assets.md) | Procedencia y optimización del producto original |
| [Plan QA](quality/qa-plan.md) | Escenarios y estrategia de verificación |
| [Reporte QA](quality/qa-report.md) | Ejecuciones históricas; no usar sus conteos iniciales como últimos resultados |
| [Checklist diseño](quality/design-checklist.md) | Responsive, accesibilidad y hallazgos |
| [Seguridad](quality/security-review.md) | Controles y límites de revisión |
| [Rúbrica](quality/rubric-evaluation.md) | Evolución 144 → 147 → 149 y hallazgos corregidos |
| [Auditoría anterior](quality/final-audit.md) | Evidencia histórica, reemplazada por delivery-audit |
| [Release](quality/release-report.md) | Cronología real de despliegues, fallos, rollback y verificaciones |
| [Infraestructura](../infra/README.md) | Despliegue y operación AWS |
| [Evidencia E2E](../tests/e2e/evidence/README.md) | Alcance y procedencia de capturas/reportes |
| [Changelog](../CHANGELOG.md) | Cambios por etapa, sin reemplazar el historial Git |
| [Acuerdo de trabajo](../AGENTS.md) | Reglas, responsabilidades y gates |
| [Equipo](team/README.md), [plan](team/plan.md) | Organización y handoffs |
| [Director](team/director.md), [auditor](team/auditor.md) | Prompts de coordinación y evaluación |
| [Backend](team/backend-developer.md), [frontend](team/frontend-developer.md), [diseñador](team/designer.md) | Prompts de implementación |
| [QA](team/qa-engineer.md), [QA diseño](team/design-qa.md), [seguridad](team/security-reviewer.md), [release](team/release-engineer.md) | Prompts de revisión y entrega |

La entrega solicitaba frontend/API completos, repositorio público con README, despliegue AWS, modelo de datos, cobertura por app y documentación API mediante Postman o Swagger. El PDF no impone destinatario, asunto o canal de correo. Los contactos de su portada no constituyen por sí mismos una instrucción de envío. El PDF original permanece privado; no se copia al repositorio ni al paquete público.

## Preparación antes de compartir pantalla

- Tener abiertos producto local, Swagger, esta guía, editor en `checkout.service.ts`, repositorio y CI pertinente.
- Verificar que la aplicación y el proveedor respondan ese día; no asumir disponibilidad por una evidencia anterior.
- Para cambios, usar una rama de práctica y pruebas enfocadas. Mantener el entorno desplegado de entrega identificable.
- Para una compra usar únicamente datos ficticios del sandbox correspondiente; confirmar el resultado real y revisar stock. La app está configurada para sandbox; la validación estructural no distingue por sí sola una tarjeta real de una ficticia.
- Explicar qué contiene cada capa y mostrar una regla probada antes de recorrer todos los archivos.
- Si se usa asistencia de IA durante la entrevista, acordar su uso con el entrevistador. Prepararse para explicar cada decisión y cambio sin depender de respuestas memorizadas.

La evidencia más fuerte es poder enlazar **requisito → decisión → código → prueba → comportamiento observado**, reconociendo qué queda fuera del alcance.
