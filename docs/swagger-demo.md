# Datos para probar Swagger

Abrir <http://localhost:3001/api/docs>. Estos ejemplos son para el entorno local; en AWS se deben obtener sesión, tokens e IDs desde su propio Swagger.

## Autorizar la ventana de la captura

| Campo | Qué poner |
| --- | --- |
| `cookie`, nombre `checkout_session` | **Dejar vacío.** El navegador recibe y envía la cookie HttpOnly automáticamente |
| `csrf`, nombre `X-CSRF-Token` | El valor `data.csrfToken` devuelto por la sesión de ese mismo navegador |

1. Cerrar **Available authorizations**.
2. Expandir **POST /api/checkout/session → Try it out**.
3. Body: `{}`. Pulsar **Execute**; debe responder 200 o 201.
4. En **Response body**, copiar solo el texto de `data.csrfToken`, sin comillas.
5. Abrir **Authorize**, pegarlo en **csrf → Value**, pulsar **Authorize** debajo de csrf y cerrar.

No introducir llaves de Wompi, credenciales AWS ni un token obtenido por otra herramienta/navegador. No escribir `Bearer`. Al recargar Swagger puede ser necesario volver a autorizar csrf; `GET /api/checkout/session` permite recuperar el valor mientras la sesión sea válida. El candado visual de cookie puede seguir abierto: la prueba real es que el request se autorice.

## Consultar sin modificar datos

`GET /api/health`: sin campos. `GET /api/products`: sin campos. `GET /api/products/{id}`: usar `product_lumen_one` (ID comprobado en el catálogo local).

`POST /api/checkout/quote`, después de autorizar csrf:

```json
{
  "productId": "product_lumen_one",
  "quantity": 1
}
```

El total del ejercicio local con IVA es `23941000` centavos, COP 239.410: el producto aporta COP 189.000 y su IVA del 19% COP 35.910, más cargo base y envío. AWS conserva los importes de la entrega anterior hasta desplegar este cambio. Usar siempre el total devuelto por la cotización del entorno correspondiente. Esta operación no reserva inventario.

## Guardar borrador

`PUT /api/checkout/draft`:

```json
{
  "productId": "product_lumen_one",
  "quantity": 1,
  "step": "DETAILS",
  "customer": {
    "fullName": "Cliente Sandbox",
    "email": "email@example.test",
    "phone": "3000000000"
  },
  "delivery": {
    "addressLine1": "Calle de Prueba 10",
    "city": "Bogotá",
    "region": "Bogotá D.C.",
    "country": "CO"
  }
}
```

Debe guardar si no existe una transacción pendiente. Consultar `GET /api/checkout/session` para ver el borrador. Estos datos son ficticios.

## Crear una transacción pendiente

Este paso **reserva una unidad**. Para una demo sin pago, cancelarla al terminar con `DELETE /api/checkout/draft`.

En el campo **Idempotency-Key** colocar un UUID nuevo. Generarlo en PowerShell con `[guid]::NewGuid().ToString()`. Mantener ese mismo UUID si se reintenta exactamente la misma compra.

`POST /api/transactions`, body:

```json
{
  "productId": "product_lumen_one",
  "quantity": 1,
  "expectedTotalInCents": 23941000,
  "customer": {
    "fullName": "Cliente Sandbox",
    "email": "email@example.test",
    "phone": "3000000000"
  },
  "delivery": {
    "addressLine1": "Calle de Prueba 10",
    "city": "Bogotá",
    "region": "Bogotá D.C.",
    "country": "CO"
  }
}
```

Copiar `data.id` de la respuesta para `GET /api/transactions/{id}`. Debe empezar en `PENDING` / `NOT_STARTED`. Si cambió el precio, repetir cotización y usar su total. Si la sesión ya tiene pendiente, recuperar ese intento; no forzar una segunda creación.

## Pago y campos dinámicos

Para demostrar el pago usar [el formulario y sus tarjetas sandbox](demo-express.md#2-demostrar-la-compra). Nuestra API no recibe PAN ni CVC.

`POST /api/transactions/{id}/pay` requiere estos valores **generados**, no contraseñas fijas:

| Campo | Origen |
| --- | --- |
| `id` de ruta | `data.id` al crear la transacción en la misma sesión |
| `cardToken` | Tokenización de tarjeta del proveedor; no poner el número de tarjeta |
| `installments` | `1` para la demo |
| `acceptanceToken` | `GET /api/checkout/config` → `data.acceptance.terms.token`, después de aceptación explícita |
| `acceptPersonalAuth` | `GET /api/checkout/config` → `data.acceptance.personalData.token`, después de autorización explícita |

No hay un `cardToken` reutilizable publicado en la guía. La UI se encarga de tokenizar y enviar los consentimientos. Si se envió el pago y quedó incierto, consultar su ID; no intentar limpiarlo ni volver a cobrar. Los IDs de cliente/entrega son generados, pertenecen a la sesión y no se deben inventar; entrega solo existe después de aprobación.

## Limpiar una demo sin pago

`DELETE /api/checkout/draft`, sin body y con csrf: **204 sin cuerpo**. Cancela una reserva que todavía no se haya enviado y conserva el registro de auditoría. Después consultar productos para confirmar disponible. Si responde `PAYMENT_IN_PROGRESS`, consultar la transacción activa; no borrar almacenamiento.
