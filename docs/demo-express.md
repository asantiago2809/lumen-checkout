# Demostración en vivo de Lumen

## 1. Abrir y ejecutar

En VS Code: **Terminal → Nuevo terminal**.

```powershell
cd 'D:\AGENTES PT\lumen-checkout'
npm.cmd run dev
```

**Ya está ejecutándose: no iniciar otra instancia.** Guarda cambios con Ctrl+S; frontend recarga y API recompila. Espera “Found 0 errors” para probar backend. Si lo inicias tú, Ctrl+C lo detiene. También quedó configurado F5 → **Lumen: iniciar API y web**.

| Abrir | Ruta |
| --- | --- |
| Demo local y cambios | <http://localhost:5173/> |
| Swagger local | <http://localhost:3001/api/docs> |
| Salud / productos | <http://localhost:3001/api/health> · <http://localhost:3001/api/products> |
| Demo AWS | <https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/> |
| Swagger AWS | <https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com/api/docs> |
| GitHub | <https://github.com/asantiago2809/lumen-checkout> |
| Todas las guías | <http://127.0.0.1:5180/> |

## 2. Demostrar la compra

**Producto → Pagar con tarjeta → llenar datos → dos consentimientos → resumen → pagar → resultado → volver al producto.** Explica total COP 203.500 y que únicamente aprobar consume stock físico. Comprueba stock antes/después. Si aparece pendiente, consultar ese intento; no cobrar otra vez.

| Campo | Dato ficticio para sandbox |
| --- | --- |
| Visa aprobada | `4242 4242 4242 4242` |
| Visa rechazada | `4111 1111 1111 1111` |
| Vencimiento / CVC / cuotas | `12/29` / `123` / `1` |
| Titular / destinatario | `Persona de Prueba` / `Cliente Sandbox` |
| Email / teléfono | `email@example.test` / `3000000000` |
| Dirección / ciudad / departamento | `Calle de Prueba 10` / `Bogotá` / `Bogotá D.C.` |

Estos dos números son los [datos oficiales de Wompi](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/) y los usados en la evidencia real del proyecto. Usarlos solo en sandbox. Para mostrar el **logo Mastercard**, escribir el prefijo `5555`, sin intentar pagar con ese número incompleto. Logo no equivale a aprobación.

Para mostrar recuperación: completar entrega, esperar **guardado**, recargar; se recupera entrega, pero se pide tarjeta otra vez. Después de enviar un pago, recargar recupera su resultado sin cobrar de nuevo. Una compra sandbox aprobada sí consume una unidad ficticia.

## 3. Dónde modificar

Todas las rutas parten de `D:\AGENTES PT\lumen-checkout`.

| Petición | Archivo |
| --- | --- |
| Producto y portada | `apps/web/src/App.tsx` |
| Formulario, resumen y pago | `apps/web/src/Checkout.tsx` |
| Colores / responsive | `apps/web/src/tokens.css` / `styles.css` |
| Tarjetas / logos | `apps/web/src/validation.ts` / `components.tsx` |
| Redux / llamadas API | `apps/web/src/store.ts` / `api.ts` |
| Endpoint Nest | `apps/api/src/infrastructure/http/api.controller.ts` |
| Reglas, stock, reserva y pago | `apps/api/src/application/checkout.service.ts` |
| Validación entrada / tarifas | `apps/api/src/infrastructure/http/dtos.ts` / `apps/api/src/domain/models.ts` |
| Wompi / base de datos | `apps/api/src/infrastructure/payment/` / `persistence/` |
| Despliegue | `infra/template.yaml` y `infra/README.md` |

## 4. Si piden crear un endpoint

Ejemplo sencillo: **GET `/api/products/:id/stock`**. Dentro de la clase `ApiController`, añadir este método; `Get`, `Param`, `ApiOperation` y `unwrap` ya están disponibles:

```typescript
@Get("products/:id/stock")
@ApiOperation({ summary: "Consultar stock disponible" })
async productStock(@Param("id") id: string) {
  const product = unwrap(await this.checkout.product(id));
  return { data: { productId: product.id, stock: product.stock } };
}
```

**Es un ejemplo para implementar si lo solicitan; no se añadió a la aplicación.** Reutiliza el caso de uso y no inventa inventario. Si solicitan reglas nuevas, ponerlas en el servicio; si es un POST con datos, crear un DTO validado. Esta ruta GET de producto encaja en el acceso público existente; otras rutas pueden requerir sesión.

Guardar, esperar recompilación y recargar Swagger. Abrir la operación → **Try it out → Execute**. También puedes comprobarla:

```powershell
$id = (Invoke-RestMethod http://localhost:3001/api/products).data[0].id
Invoke-RestMethod "http://localhost:3001/api/products/$id/stock"
npm.cmd run typecheck
npm.cmd run test -w apps/api -- --runTestsByPath test/http.spec.ts
```

Añadir un test HTTP para stock existente y producto inexistente antes de considerarla terminada. Si usas las escrituras existentes en Swagger: ejecutar `POST /checkout/session` con `{}`, copiar su `csrfToken` a **Authorize → csrf** y usar `Idempotency-Key` UUID al crear transacción. `GET /health` y `/products` no necesitan ese paso.

[Datos exactos de autorización y JSON para copiar en Swagger](swagger-demo.md). El campo cookie se deja vacío; el navegador la envía automáticamente.

## 5. Ver cambios y publicar

**Local:** Ctrl+S → esperar compilación → recargar Swagger o probar la UI. Cambiar `.env` requiere reiniciar API. **AWS no cambia al guardar ni al hacer push.**

```powershell
npm.cmd run typecheck
npm.cmd run test:coverage
npm.cmd run build
git diff
```

Revisar cada resultado. Después: añadir solo archivos del cambio, commit descriptivo y push/PR. Para publicar AWS, seguir [frontend o API y reversión](live-demo-runbook.md#publicar-solo-frontend). La web se publica en S3 con índice al final; la API se empaqueta y actualiza mediante CloudFormation. No reemplazar todo el stack improvisando comandos.

Para preparar AWS en la terminal integrada:

```powershell
. 'D:\AGENTES PT\entrega\preparar-terminal.ps1'
aws login --profile trama-login --region us-east-1 --remote
aws sts get-caller-identity --profile trama --region us-east-1
```

**AWS verificado el 5 de octubre:** el perfil `trama` autentica en la cuenta esperada y el stack está `UPDATE_COMPLETE`. Renovar solo si la sesión vuelve a vencer. Esta comprobación no publicó cambios.

## 6. Quitar la diferencia de TypeScript del editor

Abrir un `.ts` → Ctrl+Shift+P → **TypeScript: Select TypeScript Version → Use Workspace Version 5.9.3**. VS Code trae 6.0.3 y muestra la deprecación `node10`; el proyecto pasa tipos con 5.9.3. Si queda el aviso, **TypeScript: Restart TS Server**.
