# Decisiones de arquitectura

Estado: v1 aprobada para desarrollo, 23 de septiembre de 2026. Este documento registra diseño; el auditor verifica su implementación por separado. Contrato externo: [api-contract.md](api-contract.md).

## ADR-001. Alcance y estructura

React SPA con TypeScript, Redux Toolkit y Vite; NestJS con TypeScript para API. npm workspaces bajo `apps/*`. Una tienda de producto con cinco pasos, sin login, carrito, panel administrativo ni otros métodos de pago. Las decisiones buscan cumplir el enunciado y simplificar la revisión.

```text
apps/
  web/
    src/
      app/                 # store, bootstrap, composición
      features/catalog/    # producto y disponibilidad
      features/checkout/   # estados, modal, backdrop, resultado
      components/          # controles accesibles reutilizados
      services/            # cliente API y tokenización navegador
      styles/              # tokens y composición responsive
    public/images/         # assets originales optimizados
  api/
    src/
      domain/              # entidades, invariantes, Result, dinero
      application/         # casos de uso, contratos de puertos
      infrastructure/
        persistence/       # DynamoDB y archivo local
        payment/           # adaptador sandbox HTTP
        http/              # controllers, DTO, guards y filters
      bootstrap/           # módulos Nest, configuración, servidor/Lambda
    test/                  # contratos, integración de adapters y HTTP
docs/
  architecture/
  team/
  qa/
infra/                     # IaC, operaciones y reversión
```

Se permite agrupar por feature dentro de las capas si se conservan las dependencias. El dominio no importa Nest, AWS, HTTP ni Redux. Los controladores validan DTO, obtienen contexto y traducen `Result`; no deciden precio, stock ni aprobación.

## ADR-002. Puertos, adaptadores y ROP

Puertos mínimos: `CheckoutStore` (operaciones atómicas de negocio), `PaymentGateway`, `Clock`, `IdGenerator` y `SessionStore`. Un repositorio por entidad no debe forzar cinco escrituras independientes para una sola compra; el puerto de persistencia expone `reserveAndCreateTransaction`, `claimPaymentSubmission`, `finalizePayment` y `expireUnsubmittedReservation` con garantías explícitas.

Casos de uso: `ListProducts`, `SaveCheckoutDraft`, `QuoteCheckout`, `CreateTransaction`, `PayTransaction`, `GetTransaction`, `ReconcileTransaction` y lectura autorizada de cliente/entrega. Bootstrap inyecta adapters; tests de casos de uso usan fakes con el mismo contrato.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type DomainError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};
```

La tubería compone validación, consulta, cálculo, reserva y persistencia con `map`/`andThen` o equivalentes asíncronos tipados. Un error corta la vía de éxito y llega al mapper HTTP. Rechazo, stock insuficiente y conflicto son valores de error esperados. Excepciones de red/SDK se capturan en adapters y se traducen; los defectos inesperados se registran sanitizados con requestId. Mostrar un `Result` decorativo mientras toda la lógica depende de throws no satisface ROP.

## ADR-003. Persistencia y modelo

Destino preferido: DynamoDB on-demand, con transacciones condicionales. Evita costo fijo de una base provisionada para una demostración breve y se adapta a Lambda. Infraestructura definitiva depende del inventario AWS del candidato; no se ha creado ningún recurso por esta decisión.

Desarrollo sin Docker: adapter de archivo durable, escrituras mediante mutex de proceso único y reemplazo atómico del archivo. Se etiqueta `local-only`, no se despliega en Lambda ni se presenta como solución de concurrencia distribuida. CI prueba el contrato DynamoDB y, antes de entrega, verifica sus condiciones reales sobre una tabla aislada. Memoria solo en tests.

| Entidad | Campos esenciales | Invariantes |
| --- | --- | --- |
| Product | id, name, description, priceInCents, currency, stockOnHand, stockReserved, stockAvailable, image metadata, version | Enteros no negativos; stockOnHand = stockAvailable + stockReserved |
| Customer | id, ownerSessionHash, fullName, normalizedEmail, phone, createdAt | PII accesible únicamente desde sesión propietaria |
| Transaction | id, ownerSessionHash, customerId, product snapshot, address snapshot, amounts, reference, status, submissionStatus, providerId?, reservationExpiresAt, finalizedAt?, card brand/lastFour?, version | Referencia única; importes inmutables; nunca PAN/CVC/token completo |
| Delivery | id, transactionId, productId, customerId, quantity, address, status READY, createdAt | Como máximo una por transacción aprobada |
| CheckoutSession | session hash, csrf material, draft?, activeTransactionId?, expiresAt/TTL | Sin tarjeta, borrador expira en 24h |
| Idempotency record | session hash, key, requestHash, transactionId, createdAt | Un intento lógico produce una transacción |

La entrega solicitada se guarda como snapshot en transacción pendiente; la entidad `Delivery` se crea al aprobar. Cliente y transacción se conservan también para rechazos, permitiendo auditoría sin inventar un envío.

Modelo físico sencillo de una tabla con `PK` y `SK`: `CATALOG / PRODUCT#id`, `CUSTOMER#id / META`, `TX#id / META`, `DELIVERY#id / META`, `SESSION#hash / META`, `IDEMP#sessionHash / key`. El catálogo usa Query, los IDs GetItem; sesión guarda la transacción activa para refresh. Un índice de referencia y uno de pendientes solo si se requieren para reconciliación; no exponer scans de PII. Snapshots evitan depender de cambios futuros en producto o dirección.

## ADR-004. Stock aprobado, reservas y ambigüedad de la fuente

La secuencia del documento agrupa actualización de transacción, asignación de producto y actualización de stock después de pago completado o fallido. Interpretación adoptada: todos los resultados actualizan la transacción; exclusivamente `APPROVED` consume inventario y genera entrega. Descontar definitivamente y despachar ante rechazo produciría pérdida de inventario y una compra no pagada. Se documenta como resolución razonada de ambigüedad, no como requisito textual inequívoco.

Para evitar sobreventa sin cobrar a alguien cuando no hay stock:

1. `CreateTransaction` condiciona `stockAvailable >= quantity`, reduce disponible, aumenta reservado y crea PENDING/idempotencia/cliente en la misma operación durable.
2. Una aprobación verificada reduce `stockOnHand` y `stockReserved`, deja disponible igual, crea entrega y finaliza transacción atómicamente.
3. Rechazo, error inequívoco o anulación sin aprobación previa reduce reservado, aumenta disponible y finaliza, sin entrega.
4. Operaciones concurrentes se resuelven con condiciones en almacenamiento, no con un contador de JavaScript ni un check seguido de write sin condición.
5. Finalizar requiere transacción todavía PENDING y reserva activa. Repetir resultado retorna estado existente sin aplicar efectos por segunda vez. Una respuesta externa conflictiva con un terminal existente se registra como anomalía para revisión, no se aplica a ciegas.

Reserva sin envío expira a los 15 minutos; limpieza explícita cambia transacción a ERROR con razón interna `RESERVATION_EXPIRED` y libera unidades atómicamente. Cancelación previa a `/pay` aplica el mismo patrón con razón `CANCELLED`. Nunca se libera por simple TTL una reserva cuyo envío fue reclamado, enviado o incierto. Las reservas inciertas priorizan evitar doble venta; requieren reconciliación y un riesgo visible, no desaparición silenciosa.

Test obligatorio: dos creaciones simultáneas para una última unidad producen una reserva exitosa y un conflicto, nunca stock negativo; aprobación repetida produce exactamente una entrega y un decremento; rechazo devuelve la unidad.

## ADR-005. Pago en dos fases y límites de exactitud

El backend devuelve primero el ID de un PENDING persistido. Luego `/pay` reclama de manera condicional un único envío y guarda referencia antes de tocar la red. El frontend dispone así de un ID recuperable incluso si se corta la conexión. La misma idempotency key se reutiliza si se pierde la respuesta de creación.

No hay una transacción distribuida entre nuestra base y el proveedor. Un fallo entre claim y respuesta externa puede dejar resultado desconocido. No se promete exactly-once externo: se evita reenvío automático, se conserva PENDING, se consulta por ID cuando se conoce y se contempla evento firmado. Si UAT no ofrece una búsqueda por referencia verificada, el caso sin ID externo requiere reconciliación operativa; debe figurar en README y QA.

La recepción de un ID o HTTP 201 del proveedor no equivale a aprobación. Solo un estado final verificado aplica efectos. Comparar reference, amount y currency evita asociar un evento o consulta a otra compra. Redactar mensajes propios, no mostrar JSON ni errores del gateway al comprador.

## ADR-006. Tarjeta, consentimiento y recuperación

Tokenizar en navegador directamente con sandbox y llave pública. PAN/CVC nunca atraviesan nuestra API, Redux, persistencia o logs. El token de tarjeta completo solo vive durante el intento en memoria del coordinador de checkout; puede sobrevivir al cierre visual del modal mediante una ref local y se elimina al enviar/finalizar o abandonar. Últimos cuatro dígitos y marca permiten mostrar un resumen enmascarado.

Borrador de datos personales se guarda en servidor bajo cookie HttpOnly. Persistencia de navegador usa una lista explícita de punteros no sensibles y versión del esquema. En refresh, rehidratar sesión y borrador; tarjeta debe ingresarse de nuevo. Si ya se cobró o se está confirmando, consultar el ID existente. No se ofrece repetir pago hasta resultado terminal seguro.

Dos consentimientos explícitos se muestran con sus enlaces vigentes. Reobtener tokens si caducaron; la UI no marca casillas automáticamente. Sesión, CSRF, no-store, validación estricta, límites de cuerpo/rate y redacción de logs complementan el aislamiento de tarjeta. HTTPS y cabeceras se prueban en URL desplegada, no solo en configuración local.

## ADR-007. Diseño y accesibilidad

Dirección original: comercio sobrio con protagonismo del producto, superficies cálidas, tipografía legible, acento controlado y jerarquía clara. Usar un sistema pequeño de tokens, espaciado consistente, botones y campos compartidos. No reutilizar la identidad de otro proyecto ni llenar la página de efectos para aparentar complejidad.

Mobile-first a 375x667 CSS px, expansión mediante grid/flex. Imagen hero local optimizada con dimensiones explícitas, variantes eficientes y texto alternativo; no depender de imágenes remotas enormes. Modal con nombre accesible, trampa de foco, cierre por Escape antes de pago y retorno del foco al disparador. Backdrop con capa de contexto visible, resumen legible y total destacado. Resultado con referencia, estado y siguiente acción.

Campos con labels visibles, `inputMode` apropiado, autocompletado de entrega y errores asociados mediante `aria-describedby`; ningún estado se comunica solo por color. Botones al menos 44px de alto, contraste medido, movimiento reducido y scroll interno sin ocultar acciones. Diseño no contiene nombres de SDK, códigos técnicos, secretos ni pasos de depuración en el recorrido del comprador.

## ADR-008. Cloud, historia y operación

Objetivo de infraestructura: S3 privado + CloudFront para SPA y ruta `/api/*` hacia Lambda con NestJS, DynamoDB para estado y parámetros secretos fuera del bundle/repositorio. Asegurar comportamiento de cookies, métodos y cache distinto para API, y fallback SPA sin convertir errores API en HTML. Puede adaptarse al despliegue existente si conserva HTTPS, persistencia y aislamiento de secretos.

Antes de sustituir la prueba anterior: identificar stack/recursos, dependencias compartidas, DNS/orígenes, respaldo y rollback. Preparar nueva app y validarla antes de cortar el destino anterior. La autorización del usuario existe; el inventario determina el blanco exacto. No tocar MFA, otras aplicaciones o servicios compartidos sin una razón confirmada.

Feature branches/PRs por unidad revisable cuando GitHub esté conectado, commits incrementales reales y changelog de cambios relevantes. Repo público con nombre neutral `lumen-checkout`. No copiar el PDF, credenciales ni contactos. No reescribir commits para simular progreso ni afirmar una revisión externa inexistente.

## ADR-009. Calidad y evidencia

Jest obligatorio por app, cobertura >80%; gate interno >=85% de statements, branches, functions y lines. No excluir dominio, use cases o reducers para inflar porcentajes. Las pruebas cubren invariantes, DTO, autorización, adapter mappings, reducers, validación, pasos y recuperación. E2E complementa y no reemplaza Jest.

QA independiente prueba aprobado/rechazado/pendiente/error, doble click, último producto concurrente, refresh en cada fase, pérdida de red antes/después de envío, sesión ajena, origen inválido, montos alterados, datos inválidos, teclado, zoom, móvil y navegadores. Reports y screenshots registran comando, fecha, entorno y resultado. Una simulación sirve para determinismo y fallas; integración real y cloud tienen evidencia separada.

## Estado de dependencias externas al fijar v1

El coordinador comprobó que el host UAT sandbox del documento resuelve DNS, pero su cadena TLS falla en los clientes locales inspeccionados. Se mantuvo validación TLS; no se aplicó bypass. El sandbox público responde HTTPS, pero requiere llaves de su propio ambiente. Las credenciales del PDF están en configuración local ignorada, no en documentación.

Acceso autenticado a GitHub/AWS puede requerir intervención del candidato. Esta dependencia no impide desarrollar contratos, implementación y pruebas locales; sí impide declarar listo un despliegue o pago real antes de verificarlos.
