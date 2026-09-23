# API y contrato de estado, versión 1

Contrato acordado para implementación paralela. Describe comportamiento requerido; no certifica que esté implementado. Base propia: `/api`. JSON UTF-8, nombres camelCase, identificadores UUID, timestamps ISO-8601 UTC, moneda `COP`, dinero entero en centavos. Una compra corresponde a una unidad de un producto (`quantity: 1`).

## Transporte, sesión y errores

SPA y API se sirven bajo el mismo origen; Vite usa proxy local para `/api`. `fetch` usa `credentials: 'include'`. La sesión se identifica mediante cookie opaca `checkout_session`, `HttpOnly`, `SameSite=Lax`, `Path=/api`, duración 24h; `Secure` obligatorio en HTTPS y desactivado únicamente en localhost. El servidor guarda el hash del identificador aleatorio, no su valor. Cada transacción pertenece a esa sesión.

`POST /checkout/session` crea o reutiliza sesión; bootstrap valida `Origin` contra allowlist. Resto de escrituras de navegador exige `Content-Type: application/json`, origen autorizado y `X-CSRF-Token` obtenido en bootstrap. El token CSRF permanece en memoria y se recupera al recargar. No se acepta CORS comodín con credenciales. Webhook tiene autenticación propia por firma y no usa cookie/CSRF.

Respuestas exitosas usan `{ "data": ... }`. Errores:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos indicados.",
    "fields": { "customer.email": "Ingresa un correo válido." },
    "requestId": "req_example"
  }
}
```

No devolver errores crudos del proveedor ni stacks. `fields` es opcional. `400` DTO inválido; `401` sesión vencida; `403` origen/CSRF inválido; `404` recurso inexistente o de otra sesión; `409` stock/conflicto de idempotencia/estado; `422` datos de negocio no aceptables; `429` límite de solicitudes; `503` configuración o dependencia temporalmente indisponible. Un rechazo bancario es resultado de negocio, no error HTTP 500.

## Tipos comunes

```ts
type CheckoutStep = 'PRODUCT' | 'DETAILS' | 'SUMMARY' | 'RESULT';
type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
type SubmissionStatus = 'NOT_STARTED' | 'CLAIMED' | 'SUBMITTED' | 'UNKNOWN';
type CustomerInput = { fullName: string; email: string; phone: string };
type DeliveryInput = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  country: 'CO';
  postalCode?: string;
};
type Amounts = {
  currency: 'COP';
  subtotalInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
};
type CheckoutDraft = {
  productId: string;
  quantity: 1;
  step: 'DETAILS' | 'SUMMARY';
  customer: Partial<CustomerInput>;
  delivery: Partial<DeliveryInput>;
};
```

Normalizar espacios y validar longitudes. Nombre 2-100 caracteres, email válido hasta 254, teléfono colombiano 10 dígitos tras normalizar prefijo `+57`, dirección principal 5-160, complemento hasta 100, ciudad/región 2-80, postal opcional 6 dígitos. El borrador admite campos vacíos/incompletos dentro de límites; crear transacción exige todos los obligatorios completos. No permitir campos adicionales como `amount`, `status`, `pan`, `cvc` o `cardNumber` en DTO de servidor.

## Productos

`GET /products` público, `200`:

```json
{
  "data": [{
    "id": "product_example",
    "name": "Lumen One",
    "description": "Objeto de diseño para tu espacio.",
    "priceInCents": 18900000,
    "currency": "COP",
    "stock": 12,
    "imageUrl": "/images/product.webp",
    "imageAlt": "Lumen One sobre una superficie clara"
  }]
}
```

`GET /products/:id` devuelve un objeto del mismo tipo o `404`. `stock` significa unidades disponibles para nuevas compras; excluye reservas activas. Producto, descripción, precio e imagen son datos de ejemplo que diseño/seed concretan juntos. No existe creación pública de productos. Sembrado idempotente no repone stock existente al iniciar el servidor.

## Configuración pública del checkout

`GET /checkout/config`, `200`:

```json
{
  "data": {
    "environment": "sandbox",
    "paymentApiUrl": "https://api-sandbox.co.uat.wompi.dev/v1",
    "publicKey": "<runtime public merchant key>",
    "currency": "COP",
    "baseFeeInCents": 250000,
    "deliveryFeeInCents": 1200000,
    "acceptance": {
      "terms": { "token": "<runtime token>", "url": "<provider policy URL>" },
      "personalData": { "token": "<runtime token>", "url": "<provider authorization URL>" }
    }
  }
}
```

Únicamente la llave pública sale al navegador, entregada en runtime. Obtener ambos contratos del comercio, mostrar enlaces y exigir aceptación explícita mediante dos casillas inicialmente desmarcadas. No incluir firmas de integridad, llaves privadas o secretos de eventos. Si el sandbox no está configurado/respondiente, devolver `503 PAYMENT_UNAVAILABLE`; no sustituirlo silenciosamente por un simulador.

Las tarifas anteriores son la decisión inicial del producto: cargo base COP 2.500 siempre y entrega COP 12.000 por pedido. Son constantes del backend con una única fuente y deben coincidir en semilla, respuesta, resumen y README; frontend nunca suma valores flotantes como fuente de autoridad.

## Sesión y borrador

`POST /checkout/session`, body `{}`: `201` nueva o `200` existente. Establece cookie y devuelve la misma forma que `GET /checkout/session`:

```json
{
  "data": {
    "csrfToken": "<session-bound random value>",
    "expiresAt": "2026-09-24T12:00:00.000Z",
    "draft": null,
    "activeTransactionId": null
  }
}
```

`GET /checkout/session`: `200` o `401`. `draft` es `CheckoutDraft | null`; jamás contiene tarjeta, token de tarjeta ni consentimiento marcado. Las respuestas de sesión, borrador, clientes y transacciones usan `Cache-Control: no-store`.

`PUT /checkout/draft`: body `CheckoutDraft`, `200 { "data": { "draft": ... } }`. Guardado al salir de un campo o con debounce de 500ms; el botón de continuar espera la confirmación. El servidor aplica TTL de 24h y mantiene el borrador vinculado a la sesión. Cuando hay transacción en curso, editar el borrador no modifica su snapshot. El TTL es una retención del borrador, nunca el mecanismo para liberar reservas de pagos enviados.

`DELETE /checkout/draft`: `204`, limpia borrador y puntero activo solo cuando no haya un pago en curso. Si está `PENDING` con envío iniciado, `409 PAYMENT_IN_PROGRESS`. La transacción financiera no se elimina. Se usa al regresar al producto después de un resultado terminal o para reiniciar un borrador sin pago.

## Cotización

`POST /checkout/quote`, body:

```json
{ "productId": "product_example", "quantity": 1 }
```

Respuesta `200 { "data": { "productId": "product_example", "quantity": 1, "amounts": { "currency": "COP", "subtotalInCents": 18900000, "baseFeeInCents": 250000, "deliveryFeeInCents": 1200000, "totalInCents": 20350000 } } }`.

Servidor consulta precio y disponibilidad. `409 OUT_OF_STOCK` si no hay unidades. La cotización es informativa y no reserva inventario. Al crear transacción se recalcula; si el total cambió desde la revisión del cliente, se requiere nuevo resumen mediante `409 PRICE_CHANGED`. El campo de comparación se llama `expectedTotalInCents` y nunca se usa para cobrar.

## Crear PENDING antes del cobro

`POST /transactions` con `Idempotency-Key: <UUID por intento de compra>`, body:

```json
{
  "productId": "product_example",
  "quantity": 1,
  "expectedTotalInCents": 20350000,
  "customer": { "fullName": "Cliente Demo", "email": "demo@example.com", "phone": "3000000000" },
  "delivery": { "addressLine1": "Calle de ejemplo 10", "city": "Bogotá", "region": "Bogotá D.C.", "country": "CO" }
}
```

El servidor crea cliente, snapshot de entrega solicitado, reserva y transacción `PENDING/NOT_STARTED` de forma atómica, y registra `activeTransactionId` en sesión. Todavía no hay una entidad `Delivery` asignada ni llamada de cobro. Respuesta `201` con `Location: /api/transactions/:id` y `TransactionView`.

Una repetición con misma sesión/llave/cuerpo normalizado devuelve `200` y la transacción existente. Una llave repetida con cuerpo diferente devuelve `409 IDEMPOTENCY_CONFLICT`. La protección se implementa en almacenamiento durable y cubre peticiones concurrentes. El cliente conserva la llave hasta obtener el ID; no genera otra por timeout. Una sesión no puede abrir otra transacción mientras una anterior tenga cobro en curso: `409 PAYMENT_IN_PROGRESS` con `activeTransactionId` recuperable por sesión.

```ts
type TransactionView = {
  id: string;
  reference: string;
  status: TransactionStatus;
  submissionStatus: SubmissionStatus;
  product: { id: string; name: string; quantity: 1 };
  amounts: Amounts;
  card: { brand: string; lastFour: string } | null;
  delivery: { id: string; status: 'READY'; city: string } | null;
  statusMessage: string;
  canPay: boolean;
  createdAt: string;
  updatedAt: string;
};
```

`canPay` es verdadero solamente para `PENDING/NOT_STARTED` con reserva válida. Las respuestas no incluyen PII innecesaria ni payload completo del proveedor. La referencia es generada por servidor y estable durante toda la operación.

## Enviar pago existente

Antes del envío, el navegador tokeniza directamente contra `paymentApiUrl` con llave pública. PAN, CVC, expiración, titular y token completo son valores efímeros; no entran en acciones Redux, DevTools, almacenamiento, telemetría ni nuestra API de borradores.

`POST /transactions/:id/pay`, body:

```json
{
  "cardToken": "<ephemeral provider card token>",
  "installments": 1,
  "acceptanceToken": "<terms token explicitly accepted>",
  "acceptPersonalAuth": "<personal-data token explicitly accepted>"
}
```

`installments` es entero 1-36 y el formulario permite elegirlo, por defecto 1. Validar token no vacío hasta 512 caracteres y cada aceptación hasta 8192. El cliente envía los tokens solo tras las casillas; no se persisten aceptaciones como marcadas en el navegador. El servidor guarda el momento y evidencia mínima de versión de consentimiento, sin logs de tokens.

El backend valida propietario/estado, reclama el envío mediante escritura condicional durable y persiste `CLAIMED` antes de la llamada externa. Usa importe, moneda y referencia de la transacción, genera firma de integridad en servidor y llama al sandbox. No acepta importes ni estado del cliente. No mantiene una transacción de base de datos abierta durante la red.

Respuesta `202` con `TransactionView` si continúa pendiente; `200` si ya es terminal. Repetir `/pay` nunca vuelve a enviar un cobro cuando existe claim: devuelve snapshot `202/200`. Un timeout, respuesta ilegible o error ambiguo después de enviar queda `PENDING/UNKNOWN`; texto: “Estamos confirmando el pago. No necesitas pagarlo de nuevo.” No convertir incertidumbre en `ERROR` ni liberar stock. Rechazo inequívoco antes de crear pago puede cerrar `ERROR` y liberar reserva; debe estar probado y clasificado por el adaptador.

No se reenvía ciegamente un `POST` al proveedor: no se asume idempotencia externa. Si no se obtuvo ID externo y el proveedor no ofrece búsqueda por referencia comprobada, conservar la operación incierta y documentar reconciliación operativa. Es una limitación explícita preferible a un doble cobro.

## Resultado, consultas y reconciliación

`GET /transactions/:id`, sesión propietaria, `200 TransactionView`. Si el pago está pendiente y existe ID externo, el backend consulta al proveedor con llave privada, valida referencia/importe/moneda y aplica el resultado mediante finalización atómica. Consultas repetidas o eventos duplicados no duplican entrega ni decrementan nuevamente stock.

Frontend consulta nuestra API con espera progresiva 2s, 3s, 5s y 8s, máximo 60s por ciclo, suspendiendo en pestaña oculta/offline. Agotado el ciclo, conserva `PENDING`, explica el estado y ofrece “Consultar estado”. No muestra una aprobación por tiempo transcurrido ni habilita nuevo pago ante incertidumbre.

`GET /customers/:id` y `GET /deliveries/:id` devuelven solo recursos de la sesión, o `404`; satisfacen lectura de entidades sin directorios públicos de PII. Customer: `{ id, fullName, email, phone }`. Delivery: `{ id, transactionId, productId, quantity: 1, status: 'READY', address: DeliveryInput }`. No son necesarios endpoints de administración ni edición de estados arbitrarios.

`POST /webhooks/payment`, preparado para `transaction.updated`: comprobar firma de eventos, ambiente sandbox, referencia, importe y moneda antes de aplicar; procesamiento idempotente, `200` para evento válido repetido, `400/401` inválido. Configurar el webhook del comercio compartido no se hace sin analizar su impacto; polling backend es la integración mínima verificable. Un worker de reconciliación puede reutilizar el mismo caso de uso sin acoplarlo a HTTP.

`GET /health` público devuelve `{ "data": { "status": "ok" } }` cuando la aplicación está lista; no expone secretos o configuración. OpenAPI en `/api/docs`, documento `/api/docs-json`. Seguridad cookie/CSRF y respuestas se documentan; no incluir llaves reales como ejemplos.

## Redux, pantallas y recuperación

Redux conserva producto, borrador rehidratado, cotización, fase, estado de requests y `TransactionView`. Los reducers son puros y efectos usan thunks/RTK Query. El componente de tarjeta mantiene su información sensible fuera de Redux. Persistir en navegador solo `{ version: 1, productId, step, transactionId, idempotencyKey }`; ningún nombre, dirección, correo, teléfono, token, PAN o CVC.

| Momento del refresh | Restauración |
| --- | --- |
| Producto | Reconsultar catálogo y stock |
| Modal | Cargar draft de sesión, restaurar entrega; tarjeta vacía con explicación breve |
| Resumen antes de crear transacción | Restaurar borrador/cotización; solicitar reingreso de tarjeta para continuar |
| POST de creación sin respuesta | Repetir misma llave o recuperar `activeTransactionId` de sesión |
| PENDING antes de `/pay` | Recuperar ID; solicitar tarjeta si falta; enviar una sola vez |
| Envío/pago pendiente | Consultar ID existente; nunca cobrar otra vez automáticamente |
| Resultado final | Recuperar resultado y ofrecer regreso al producto |
| Sesión vencida o almacenamiento corrupto | Descartar solo punteros inválidos, mostrar mensaje y reiniciar de forma segura |

Los cinco pasos son `PRODUCT -> DETAILS modal -> SUMMARY backdrop -> RESULT -> PRODUCT`. Pendiente se presenta dentro de RESULT, sin inventar un sexto paso. El resumen mantiene la capa de contexto visible, separa subtotal/cargo base/envío/total y exige acción explícita de pagar. Tras resultado terminal, regreso al producto limpia draft y consulta stock; no redirigir tan rápido que impida leer el resultado.

## Variables de integración

Servidor: `PAYMENT_API_URL`, `PAYMENT_PUBLIC_KEY`, `PAYMENT_PRIVATE_KEY`, `PAYMENT_INTEGRITY_SECRET`, `PAYMENT_EVENTS_SECRET`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, `STORE_DRIVER`, `AWS_REGION`, `DYNAMODB_TABLE`, `LOCAL_DATA_PATH`. Documentar `.env.example` únicamente con placeholders. `STORE_DRIVER=file` es desarrollo local de proceso único; `dynamodb` es durable y apto para concurrencia en despliegue.

Allowlist de proveedores: `https://api-sandbox.co.uat.wompi.dev/v1` para el ambiente del documento y `https://sandbox.wompi.co/v1` para sandbox público con su propia familia de llaves. El entorno y las llaves deben coincidir; bloquear URLs de producción y UAT sin `sandbox`. No buscar alternativas de producción ante un error.

## Fuentes verificadas el 23 de septiembre de 2026

- [Tokens de aceptación](https://docs.wompi.co/docs/colombia/tokens-de-aceptacion/): dos consentimientos y consulta de comercio mediante `/merchants/info` con `x-merchant-public-key`; la variante antigua en URL se retira el 31 de octubre de 2026. Verificar compatibilidad real de UAT, registrando cualquier fallback justificado.
- [Métodos de pago](https://docs.wompi.co/docs/colombia/metodos-de-pago/): tokenización y `CARD` con cuotas. No asumir comportamiento idéntico entre UAT y sandbox público; ejecutar contract smoke con datos de prueba.
- [Transacciones](https://docs.wompi.co/docs/colombia/transacciones/) y [seguimiento](https://docs.wompi.co/docs/colombia/seguimiento-de-transacciones/): creación/consulta de transacción desde servidor con llave privada y estados financieros.
- [Eventos](https://docs.wompi.co/docs/colombia/eventos/): autenticidad del evento y reconciliación.
