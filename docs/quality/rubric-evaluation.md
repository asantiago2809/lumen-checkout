# Evaluación interna de la rúbrica original

**Nota vigente: 147/150 (99/100 base + 48/50 bonus), en `ad641f4b2e2327aebbf5ebbe7e726f324535e373`.** Supera el mínimo de 100 por 47 puntos. La [reevaluación independiente](#reevaluación-independiente-del-candidato-corregido) documenta el retest local completo y la verificación del despliegue, API y UI pública AWS. **Dictamen actualizado: favorable para entrega en el alcance probado, con EV-01 corregido y mejoras menores abiertas.** Esta nota es interna; no pertenece al empleador, no garantiza su evaluación ni sustituye sus decisiones.

**Evaluación inicial histórica conservada:** `a7d045f` obtuvo **144/150 (96 base + 48 bonus)** y un dictamen de entrega bloqueado por EV-01, aun superando el mínimo numérico. La tabla inicial y la reproducción se conservan debajo; no describen el estado actual del candidato corregido. El arreglo protege reservas nuevas y recuperación con el frontend actualizado, sin reparar retrospectivamente registros antiguos.

## Alcance y método de la evaluación inicial

- Corte: 23 de septiembre de 2026, America/Bogota. Código evaluado: `a7d045f04647cbb43f27240126358deb29bf407a`, `main`. El coordinador confirmó CI [35937691527](https://github.com/asantiago2809/lumen-checkout/actions/runs/35937691527) satisfactorio y árbol de aplicación coincidente con `d0c59b3`.
- Fuente primaria: PDF privado suministrado, páginas 2, 3, 4 y 6, leído directamente. Página 6 establece exactamente seis criterios base que suman 100, seis bonus que suman 50 y mínimo de 100. Sus credenciales, contactos y archivo no se incorporan al repositorio.
- Se revisaron código de frontend, dominio, casos de uso, HTTP, pago y persistencia; configuración de Jest; pruebas y artefactos originales; tres capturas representativas; y las mediciones públicas nuevas del coordinador. `requirements.md` y los informes anteriores sirven de índice, no de prueba de que todo pasa.
- El evaluador ejecutó `npm run test:coverage` sobre este código: salida 0, 68 pruebas API y 82 pruebas frontend. No hizo compras, cambios de infraestructura ni modificaciones a la aplicación.
- Se distinguieron ejecución propia, reproducción independiente del director, medición pública del coordinador y evidencia histórica del equipo. Los 79 E2E son evidencia registrada, no una segunda ejecución del evaluador. Los pagos reales son los dos casos del workflow indicado abajo, no los mocks de E2E.
- La fuente no publica una escala de puntuación parcial. Las deducciones siguientes son juicio interno explícito y conservador, no reglas adicionales atribuidas a la fuente. No se multiplica un criterio por el número de controles de la matriz.

## Calificación inicial histórica por criterio — `a7d045f`

| Criterio original, traducido | Máximo | Nota | Justificación y deducción |
|---|---:|---:|---|
| README completado correctamente | 5 | **5** | Incluye instalación, variables sin secretos, comportamiento, límites, modelo de datos, cobertura por aplicación y URLs públicas de app/API/Swagger. La documentación distingue el sandbox real de los tests controlados. EV-05 se corrigió editorialmente durante esta revisión; no se mantiene descuento por un hallazgo cerrado. |
| Imágenes rápidas y UI/UX dentro de sus límites | 5 | **4** | WebP de 12.2/31.1 KB, descarga observada de 125–212 ms, dimensiones explícitas, fuente responsive, fallback y sin desbordamiento horizontal en las muestras. Se reserva 1 punto por render inicial variable: primera medición LCP 9.464/5.416 s; repetición 2.224/1.344 s sin cambios. EV-02 explica los límites: no se atribuye causa ni se inventa un umbral obligatorio de Lighthouse. |
| Funcionalidad completa del checkout con tarjeta | 20 | **17** | Producto → modal de tarjeta/entrega → resumen/backdrop → resultado → producto; validación, cargos separados, PENDING previo a proveedor, APPROVED/DECLINED reales, stock/entrega y recuperación verificados. **−3 por EV-01**: dos pestañas pueden producir resumen con dirección distinta del pedido que se pagará. Afecta confirmación y recuperación de un dato esencial del flujo. |
| API funcionando correctamente | 20 | **20** | Nest/TypeScript, DTOs y HTTP apropiados, recursos de stock/transacciones/clientes/entregas, controles de propietario, tarifas del servidor, persistencia y escrituras condicionales. Pruebas cubren rechazo, incertidumbre, doble envío, último stock, expiración y conflictos. EV-01 ya se descuenta en checkout y no se vuelve a penalizar aquí; esta nota no declara ausencia universal de defectos en la API. |
| Más de 80% de cobertura unitaria en backend y frontend | 30 | **30** | Jest ejecutado independientemente, 150 pruebas pasan y las cuatro métricas de cada aplicación superan 80%. Configuración incluye reglas de negocio; exclusiones API limitadas a entrypoints mínimos. La cobertura no prueba que EV-01 esté cubierto: su regresión sigue siendo necesaria. |
| App y API desplegadas en cloud | 20 | **20** | Sitio y API conectados en AWS HTTPS, Swagger público, DynamoDB y ejecución genuina del sandbox desde la aplicación desplegada. Los nuevos GET del coordinador devuelven 200. El límite de reconciliación documentado no equivale a ausencia de despliegue. |
| **Subtotal base** | **100** | **96** | |
| Alineación OWASP, HTTPS y cabeceras | 5 | **5** | Cookies HttpOnly/Secure/SameSite, CSRF y Origin, validación estricta, propietario de recursos, importes del servidor, CSP/Helmet y TLS público; PAN/CVC fuera de API/Redux/almacenamiento. Evidencia negativa y sandbox con TLS normal. Es alineación pertinente al ejercicio, no certificación OWASP/PCI ni seguridad absoluta. |
| Responsive y distintos navegadores | 5 | **5** | Artefacto E2E: 79 ejecuciones esperadas, 0 fallidas/omitidas/flaky; Chromium escritorio y 375×667, Firefox, WebKit; escenarios adicionales 320/390/1024 y paisaje. Se revisaron capturas y CSS. No se presenta WebKit emulado como Safari físico ni se exige hardware no solicitado. |
| Habilidad con CSS | 10 | **10** | Tokens coherentes, Grid/Flex, composición y tipografía propias, breakpoints, wrapping de referencias, diálogos desplazables, objetivos táctiles, foco visible y reduced motion. Las capturas revisadas mantienen jerarquía y controles dentro de los límites. La nota corresponde a evidencia de diseño y código, no al solo conteo de tests. |
| Código limpio | 10 | **9** | Capas y nombres claros, controladores delgados, lógica financiera centralizada, validaciones y errores sanitizados. **−1 cualitativo por EV-04**: la frontera JSON del proveedor usa `Record<string, any>` y comprobaciones repartidas, reduciendo la ayuda del sistema de tipos al revisar un contrato sensible. No se exige otra librería ni un número máximo de líneas. |
| Arquitectura hexagonal con puertos y adaptadores | 10 | **9** | `CheckoutStore`, `PaymentGateway` y `Runtime` definen puertos; FileStore/DynamoStore y sandbox implementan adaptadores; composición e inyección real en aplicación/pruebas, dominio sin imports Nest/AWS. **−1 cualitativo por EV-03**: `DomainError` contiene `httpStatus` y reglas del dominio asignan códigos HTTP, acoplamiento de transporte mejorable. La arquitectura sí existe; no es un incumplimiento total del patrón. |
| ROP | 10 | **10** | `Result` discriminado, `ok/fail`, `andThen` en cotización, propagación de fallos y guardas que detienen efectos en creación/pago/finalización. Tests ejecutados prueban caminos inválidos sin reserva/cobro indebido. No se exige composición funcional en toda función ni ocultar excepciones inesperadas de infraestructura dentro de `Result`. |
| **Subtotal bonus** | **50** | **48** | |
| **Total interno** | **150** | **144** | **Mínimo numérico: superado. Entrega: condicionada a EV-01.** |

## Evidencia comprobable inicial

| Evidencia | Resultado y alcance |
|---|---|
| Jest independiente, `npm run test:coverage` | API: 6 suites, 68 tests, statements **98.48%**, branches **95.28%**, functions **100%**, lines **98.48%**. Web: 7 suites, 82 tests, statements **96.10%**, branches **95.27%**, functions **95.23%**, lines **97.20%**. Resúmenes: `apps/api/coverage/coverage-summary.json:1`, `apps/web/coverage/coverage-summary.json:1`. Configuración: `apps/api/jest.config.cjs:6`, `apps/web/jest.config.cjs:6`. |
| [Sandbox real 35936568755](../../tests/e2e/evidence/live-sandbox-35936568755/report.json) | Dos escenarios `passed: true`; tokenización 201 y pay 202, una creación/tokenización/pago por caso; aprobación con entrega y stock 12→11; rechazo sin entrega y stock 11→11; recargas sin otro pay. Contiene un fallo de red de draft por caso: no se oculta ni se interpreta retrospectivamente como aborto demostrado. |
| [E2E originales](../../tests/e2e/evidence/2026-09-23-full-79.json) | `stats` en línea 2901: 79 expected, 0 skipped/unexpected/flaky, errors vacío. Son 11 escenarios HTTP y 17 UI en cuatro proyectos. Ver `playwright.config.ts:26`, `tests/e2e/checkout.spec.ts`, `tests/e2e/api-security.spec.ts`. Gateway controlado y tokenización interceptada; no equivalen al sandbox real. |
| [Primera medición pública](../../tests/e2e/evidence/2026-09-23-public-performance.json) y [repetición con recursos](../../tests/e2e/evidence/2026-09-23-public-performance-resources.json) | Chromium 153, contextos nuevos 375×667 y 1440×900, AWS real, sin pagos ni throttling. En ambas rondas sin overflow ni requests fallidos; CLS móvil 0 y escritorio 0.0157. La variación de LCP impide afirmar rendimiento consistentemente rápido. |
| Código de negocio y adaptadores | `apps/api/src/application/checkout.service.ts:225` crea y reserva atómicamente; `:390` finaliza stock/entrega; `:467` reclama el envío una vez; `:544` reconcilia; `apps/api/src/infrastructure/persistence/dynamo.store.ts:82` usa condiciones y TransactWrite. `apps/api/src/domain/checkout.ts:10` calcula dinero del servidor; `apps/api/src/infrastructure/payment/sandbox.gateway.ts:155` firma y envía. |
| Frontend y seguridad | `apps/web/src/store.ts:43` inicializa Redux/recuperación; `apps/web/src/api.ts:164` tokeniza directamente; `apps/web/src/Checkout.tsx:239` crea antes de pagar; `apps/web/src/components.tsx:152` selecciona WebP y dimensiones; `apps/api/src/infrastructure/http/security.ts:14` protege propietarios/CSRF/origin; `apps/api/src/bootstrap/create-app.ts:105` aplica cabeceras. |
| Diseño inspeccionado | `tests/e2e/evidence/product-mobile.png`, `summary-landscape.png`, `live-sandbox-35936568755/approved-result-restored.png`; tokens y `apps/web/src/styles.css:950` en adelante. Una captura de resultado es solo la zona visible de un diálogo con scroll, no una prueba de que todo el resultado sea simultáneamente visible. |
| Evolución | `git log` muestra commits separados de contratos, scaffolding, backend, frontend, infraestructura, pruebas y correcciones; merges de dos PR. Esto aporta evidencia de progreso genuino. La originalidad no puede certificarse contra todas las soluciones existentes con una revisión de este repositorio. |

## Hallazgos notificados al equipo

### EV-01 — P1: resumen recuperado puede diferir de la dirección de la transacción

**Estado:** abierto en `a7d045f`. **Clase:** requisito funcional fallido en una condición reproducida. **Responsables sugeridos:** Backend + Frontend; QA independiente para cierre. **Impacto en nota:** −3 en checkout, sin descuento duplicado en API.

**Estado vigente:** corregido en `ad641f4` y retestado localmente y en AWS; los 3 puntos se recuperan en la reevaluación. La explicación y reproducción iniciales se conservan para trazabilidad. El cierre tiene el límite de datos heredados documentado en el anexo.

El director reprodujo el caso ejecutando el `CheckoutService` real con almacenamiento en memoria y sin red ni pago: guardar borrador A; crear una transacción pendiente con dirección A; una segunda pestaña guarda borrador B; restaurar la sesión. El servicio acepta B, la transacción sigue `canPay=true` con snapshot A y la UI toma el resumen de B. El evaluador **repitió y confirmó independientemente** el resultado cargando los módulos desde el commit exacto `a7d045f` con `git show`, transpilados en memoria: `saveAccepted=true`, `restoredSummaryAddress='Calle B 456'`, `frozenTransactionAddress='Calle A 123'`, `canPay=true`, cero llamadas al proveedor y cero escrituras de archivos. El anexo conserva el comando reproducible.

El evaluador verificó la cadena de código: `apps/api/src/application/checkout.service.ts:143` guarda cualquier borrador aun con transacción activa y `:362` conserva el borrador previo al crear; `apps/web/src/Checkout.tsx:447` oculta datos de entrega editables al existir transacción y `:667` presenta los datos de `draft`, no el snapshot que se pagará. La reproducción del director es de servicio; no se presenta como compra sandbox ni E2E de navegador ejecutado.

**Criterio de retest:** dos pestañas en la misma sesión, A crea reserva y B intenta guardar información distinta antes/después de la creación; al restaurar y continuar, nombre, contacto, dirección y producto mostrados deben coincidir con el snapshot autoritativo que se pagará. El guardado desfasado debe rechazarse o resolverse explícitamente sin confundir al usuario. Probar también respuesta de creación perdida y una reserva anterior, sin segundo cobro, sin alterar inventario al rechazar el borrador. Añadir regresión de servicio y E2E independiente; después repetir Jest y controles afectados.

### EV-02 — P2: render inicial variable y assets de texto sin compresión

**Estado:** mejora abierta, medida en AWS y recibida por coordinador/Release; fuera de la corrección P1 de esta ronda. **Clase:** calidad de experiencia; no requisito nuevo de puntuación Lighthouse. **Responsable:** Release, con apoyo frontend. **Impacto:** −1 en imágenes/UI por la variación observada; no se descuenta despliegue.

Las dos rondas públicas muestran LCP móvil **9.464 s → 2.224 s** y escritorio **5.416 s → 1.344 s**, sin cambios intermedios. Las imágenes son pequeñas y transfieren rápido. En la segunda ronda, el JS entrega **280,853 bytes encoded = decoded** y el CSS **18,839 bytes encoded = decoded**, coherente con ausencia de compresión de transporte. Son cuatro muestras locales sin throttling; no constituyen una distribución de usuarios ni determinan si el primer retraso provino de red, infraestructura o inicialización. No se afirma que la compresión explique por sí sola el primer LCP.

**Retest:** comprobar negociación `Accept-Encoding`, `Content-Encoding`, tamaño transferido e integridad de JS/CSS tras habilitar compresión; repetir muestras comparables con cache fría/caliente, móvil/escritorio y registrar TTFB/LCP/imagen/CLS. Documentar cualquier variación residual, manteniendo CSP y correcto servicio de contenido. El objetivo de optimización se acuerda internamente; la fuente no fija un número.

### EV-03 — P3: resultado de dominio conoce HTTP

**Estado:** mejora de arquitectura abierta, recibida por Backend/director; fuera de la corrección P1 de esta ronda. **Responsable:** Backend/arquitectura. **Impacto:** −1 cualitativo en hexagonal.

`apps/api/src/domain/result.ts:4` define `httpStatus`, y `:13` asigna 400 por defecto. `domain/checkout.ts:15` y siguientes pasan códigos HTTP al construir errores de negocio. Los puertos y adaptadores son reales, pero una frontera completamente independiente traduciría códigos de dominio en el adaptador HTTP.

**Retest:** conservar los códigos de error de negocio y mover la correspondencia HTTP a la frontera; probar las mismas reglas desde el caso de uso sin conocimiento de HTTP y verificar que la API conserva sus respuestas esperadas.

### EV-04 — P3: contrato JSON del proveedor pierde precisión de tipos

**Estado:** mejora de claridad abierta, recibida por Backend/director; fuera de la corrección P1 de esta ronda. **Responsable:** Backend. **Impacto:** −1 cualitativo en código limpio.

`apps/api/src/infrastructure/payment/sandbox.gateway.ts:24` usa `Record<string, any>` para la respuesta externa; su forma se comprueba manualmente en `config()` y `map()` (`:127`). Existen verificaciones reales de campos e importes, por lo que no se declara una vulnerabilidad o un pago incorrecto a partir de este dato. Usar `unknown` con funciones de validación que produzcan tipos concretos haría más explícita la frontera de confianza y simplificaría su revisión.

**Retest:** ejecutar los tests actuales del gateway y casos de payload nulo, arrays, campos mal tipados/ausentes, metadata de tarjeta inválida, estado desconocido y monto/referencia discordantes. Mantener el resultado incierto o error seguro, sin completar venta a partir de datos inválidos. No se exige instalar una librería.

### EV-05 — P3 documental: consentimiento real marcado todavía como bloqueado

**Estado:** corregido en el working tree durante esta evaluación por el responsable documental; pendiente de integrar por el coordinador. **Responsable:** documentación/QA. **Impacto final:** 0.

La celda `PRIV-03` de `docs/quality/design-checklist.md` conservaba `BLOQUEADO` mientras el cierre y el sandbox real posterior acreditaban configuración/consentimientos. Se notificó a coordinador y director; el responsable actualizó la celda, añadió la evidencia E14 y conservó los límites de QA local y hardware. La observación inicial sobre webhook se retiró: `docs/architecture/api-contract.md:206` ya lo define expresamente como extensión no implementada.

### EV-06 — P3 UX: recarga inmediata antes del autoguardado

**Estado:** límite reproducido por el director; mejora opcional, fuera de la corrección P1. **Responsable:** Frontend/UX. **Impacto:** 0; no añade bloqueo.

La revisión del director ejecutó React y Redux reales en JSDOM con API en memoria, sin red, pagos ni escrituras de archivos. Tras editar y desmontar/reinicializar a los **2 ms**, antes del debounce de **500 ms**, hubo `draftSaves=0`: se recuperó el valor anterior `Cliente Demo` y se perdió la edición aún no confirmada. El cierre del modal también dispara guardado sin esperarlo; una recarga inmediata puede interrumpir ese guardado pendiente.

En una segunda prueba, la respuesta de `saveDraft` quedó deliberadamente pendiente. Al pulsar **Continuar**, la app permaneció en `DETAILS`; solo después de resolver el guardado pasó a `SUMMARY`. La recarga restauró `Confirmed recipient`, con `confirmedDataPreserved=true` y `restoreStep=DETAILS`, donde se vuelven a introducir tarjeta/consentimientos. No se perdió un paso confirmado. Esto concuerda con `Checkout.tsx:203`–`:212` de la versión inicial (`persistDraft(...).unwrap()` antes de avanzar), serialización de guardados en `store.ts:63` y guardado sin espera al cerrar en `Checkout.tsx:151`.

La exigencia de recuperación queda respaldada para progreso confirmado; la fuente no exige persistir cada pulsación antes de 500 ms. Por ello se cierra la incertidumbre como un límite UX conocido, sin nueva deducción. **Retest si se mejora:** editar y recargar/cerrar antes y después del debounce, con guardado lento/fallido; comunicar qué se guardó y preservar el dato confirmado sin persistir PAN/CVC ni introducir otro pago.

### Observaciones sin descuento adicional

- Los dos `NETWORK_FAILURE` de draft del artefacto sandbox siguen sin causa exacta determinada. Guardados anteriores, pago y recuperación sí pasan. No se convierten en pérdida de datos probada ni en afirmación de cero errores de red.
- El alcance del refresh inmediato durante edición quedó comprobado y se registra en **EV-06**; no se confunde con pérdida de progreso confirmado ni se añade una deducción.
- La falta de webhook/worker, login de cliente, CRUD completo, una base específica, hardware físico, lector de pantalla, zoom real o una nota Lighthouse no se penaliza como requisito inventado. `UNKNOWN` sin ID remoto y el límite de contadores por proceso ya están documentados; no equivalen a un cargo aprobado falso.

## Dictamen inicial histórico — `a7d045f`

La evidencia inicial sustentaba un producto implementado y desplegado, cobertura suficiente y los bonus de diseño, seguridad y estructura en el alcance descrito. La nota **144/150** superaba el mínimo literal. **EV-01 impedía entonces recomendar la entrega:** el usuario podía confirmar una dirección diferente a la que utilizaría el pedido. Su corrección se exigió independientemente del buen resultado numérico.

Los hallazgos se enviaron durante esta revisión al coordinador y al director mediante mensajes internos; estos asignaron la corrección documental y recibieron el P1 para backend/frontend. No se contactó al empleador ni a terceros. Este informe es la evaluación inicial del código indicado: resolver EV-01 o cambiar el despliegue no actualiza la nota automáticamente; se necesita registrar la nueva versión y su retest. No se certifica ausencia de defectos ni una calificación externa.

## Anexo: reproducción independiente de EV-01 en el commit evaluado

Desde la raíz del repositorio, en PowerShell. Lee código de `a7d045f` y compila únicamente en memoria; no llama al proveedor, no usa credenciales y no escribe en disco. La clave corta usada aquí pertenece a una llamada directa al caso de uso, no al endpoint HTTP; no pretende probar el validador UUID del controlador.

```powershell
@'
const ts = require('typescript'), crypto = require('node:crypto');
const path = require('node:path'), cp = require('node:child_process');
require.extensions['.ts'] = (module, filename) => {
  const relative = path.relative(process.cwd(), filename).replaceAll(path.sep, '/');
  const source = cp.execFileSync('git', ['show', 'a7d045f:' + relative], { encoding: 'utf8' });
  module._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true
  }}).outputText, filename);
};
const { CheckoutService } = require('./apps/api/src/application/checkout.service.ts');
const { WriteConflict } = require('./apps/api/src/application/ports.ts');
class MemoryStore {
  records = new Map();
  async get(key) { return structuredClone(this.records.get(key) ?? null); }
  async products() {
    return [...this.records].filter(([key]) => key.startsWith('PRODUCT#'))
      .map(([, value]) => structuredClone(value));
  }
  async pending() {
    return [...this.records].filter(([key, item]) => key.startsWith('TX#') && item.value.status === 'PENDING')
      .map(([, value]) => structuredClone(value));
  }
  async commit(writes) {
    for (const write of writes)
      if ((this.records.get(write.key)?.version ?? null) !== write.expectedVersion) throw new WriteConflict();
    for (const write of writes)
      this.records.set(write.key, { value: structuredClone(write.value), version: (write.expectedVersion ?? 0) + 1 });
  }
}
(async () => {
  const store = new MemoryStore();
  const forbidden = () => { throw Error('NO PROVIDER CALL ALLOWED'); };
  const gateway = { configured: () => false, create: forbidden, get: forbidden };
  const service = new CheckoutService(store, gateway, {
    now: () => new Date('2026-09-23T15:00:00Z'), id: crypto.randomUUID,
    token: () => crypto.randomBytes(32).toString('base64url'),
    hash: value => crypto.createHash('sha256').update(value).digest('hex')
  });
  await service.seed();
  const session = await service.bootstrap(), owner = session.session.id;
  const a = {
    productId: 'product_lumen_one', quantity: 1, step: 'SUMMARY',
    customer: { fullName: 'Persona A', email: 'a@example.com', phone: '3000000000' },
    delivery: { addressLine1: 'Calle A 123', city: 'Bogota', region: 'Bogota', country: 'CO' }
  };
  const b = { ...a, customer: { ...a.customer, fullName: 'Persona B' },
    delivery: { ...a.delivery, addressLine1: 'Calle B 456' } };
  await service.saveDraft(owner, a);
  const created = await service.create(owner, 'review-risk-key', { ...a, expectedTotalInCents: 20350000 });
  if (!created.ok) throw Error(created.error.code);
  const overwrite = await service.saveDraft(owner, b);
  const restored = await service.bootstrap(session.token);
  const frozen = await store.get('TX#' + created.value.transaction.id);
  console.log(JSON.stringify({ revision: 'a7d045f', saveAccepted: overwrite.ok,
    restoredSummaryAddress: restored.session.draft.delivery.addressLine1,
    frozenTransactionAddress: frozen.value.address.addressLine1,
    canPay: created.value.transaction.canPay, paymentProviderCalls: 0, filesystemWrites: 0 }, null, 2));
})();
'@ | node
```

Salida observada por este evaluador:

```json
{
  "revision": "a7d045f",
  "saveAccepted": true,
  "restoredSummaryAddress": "Calle B 456",
  "frozenTransactionAddress": "Calle A 123",
  "canPay": true,
  "paymentProviderCalls": 0,
  "filesystemWrites": 0
}
```

**Registro histórico previo al retest:** la ejecución posterior del mismo escenario contra el working tree en corrección rechazó B y devolvió A/A. En ese momento era una señal preliminar del arreglo, **no el cierre de EV-01 ni una reevaluación de puntaje**: faltaban identificar la versión final, validar concurrencia y completar el E2E independiente acordado. La ejecución posterior se documenta a continuación.

## Reevaluación independiente del candidato corregido

**Versión:** `ad641f4b2e2327aebbf5ebbe7e726f324535e373`, confirmado al iniciar y completar la ejecución. **Momento:** E2E iniciado el 24 de septiembre de 2026 a las 00:42:07 UTC (23 de septiembre, America/Bogota); verificación final de UI AWS completada a las 00:49:24 UTC. **Resultado:** EV-01 corregido para los escenarios y el estado inicial indicados; nota vigente **147/150**. **Verificación AWS corregida:** despliegue, ausencia de pendientes heredados, API y recuperación en UI pública comprobados.

El evaluador leyó el diff congelado y ejecutó una única suite completa independiente, después de las pruebas del implementador. No reconstruyó historial ni reinterpretó fallos iniciales como éxitos.

| Comprobación independiente | Resultado | Evidencia |
|---|---|---|
| `npm run test:coverage` | Salida 0; **75 API + 82 frontend = 157 pruebas PASS**, 7 suites por app | [Resumen saneado Jest](../../tests/e2e/evidence/2026-09-23-rubric-jest.json) |
| API, statements / branches / functions / lines | **98.50 / 95.34 / 100 / 98.50%** | Mismo artefacto; incluye 7 nuevas regresiones de borrador/reserva |
| Frontend, mismas métricas | **96.16 / 95.27 / 95.27 / 97.25%** | Mismo artefacto; recuperación de reserva reemplaza los datos visibles y limpia consentimiento |
| `npm run test:e2e` | Salida 0; **91 PASS**, 0 omitidos, fallidos o flaky; **117.827 s** | [91 resultados individuales saneados](../../tests/e2e/evidence/2026-09-23-rubric-full-91.json) |
| QA-R07 / R08 / R09 | **12 PASS**, tres escenarios en Chromium escritorio, Chromium 375×667, Firefox y WebKit | Incluidos en el full91; no constituyen un segundo run adicional |
| Evidencia del defecto antes del arreglo | R07/R08: 2 fallos; R09: 1 fallo; comprobación del implementador después: 12 PASS | [Resumen histórico saneado](../../tests/e2e/evidence/2026-09-23-rubric-red-summary.json); metadatos leídos antes de que Playwright limpiara sus archivos transitorios. No contiene ni reconstruye errores crudos. |
| CI del candidato | `completed`, `success`, `head_sha=ad641f4b2e2327aebbf5ebbe7e726f324535e373`; actualización `2026-09-24T00:46:00Z` | [Workflow 35939598641](https://github.com/asantiago2809/lumen-checkout/actions/runs/35939598641), comprobado también por este evaluador mediante API pública de GitHub |
| Despliegue AWS | `UPDATE_COMPLETE`, artefacto API del commit y JavaScript `index-DaPTUmLB.js` | [Registro de despliegue](../../tests/e2e/evidence/2026-09-23-rubric-deployment.json) del coordinador; contiene SHA-256 del artefacto y condición de corte |
| API pública corregida | **24 controles PASS**, más configuración sandbox **HTTP 200**; sin tokenización ni pago | [Smoke API AWS](../../tests/e2e/evidence/2026-09-23-rubric-cloud-api.json), `2026-09-24T00:47:04.218Z`; script revisado por este evaluador |
| UI pública, R09 antes del pago | **PASS**, recuperación sin reload; tarjeta/consentimientos requieren recaptura; ningún intento de tokenización/pago; limpieza PASS | [Reporte UI AWS](../../tests/e2e/evidence/2026-09-23-rubric-cloud-ui/report.json), `00:49:04–00:49:24 UTC`; [captura saneada](../../tests/e2e/evidence/2026-09-23-rubric-cloud-ui/recovered-summary-masked.png), leída visualmente por este evaluador |

### Corrección revisada y alcance del retest

1. **Backend:** `saveDraft` consulta la reserva dentro del bucle de reintento CAS y rechaza cambios cuando está `PENDING`. Si un guardado perdió la carrera contra `create`, el reintento vuelve a verificar el estado; no sobrescribe el borrador reservado. `create` escribe en la misma transacción el borrador `SUMMARY` normalizado del nombre/contacto/dirección confirmados, junto al puntero a la transacción. No depende de un guardado anterior de otra pestaña.
2. **Frontend:** la recuperación de una creación fallida/conflictiva sustituye `draft` y `transaction` conjuntamente mediante `recoveredCheckout`, borra la cotización anterior y solicita tarjeta y consentimientos de nuevo. Esto cubre la variante R09: resumen B ya abierto, otra pestaña reserva A, respuesta 409 y recuperación sin recargar.
3. **Pruebas de servicio:** cubren borrador previo divergente, normalización, reinicio, estados `NOT_STARTED`/`CLAIMED`/`SUBMITTED`/`UNKNOWN`, carrera CAS y posibilidad de continuar después de expiración/cancelación. La prueba HTTP con SDK Dynamo valida serialización del borrador canónico y rechazo 409 del guardado obsoleto.
4. **E2E independiente:** R07 comprueba autosave tardío de otra pestaña; R08, borrador divergente anterior a la creación; R09, recuperación sin reload. Verifican snapshot visible y persistido, reserva única y tráfico vacío hacia tokenización y `/pay`. La suite completa mantiene aprobaciones/rechazos/stock/seguridad/refresh/responsive con proveedor controlado. **No hubo pago real ni tokenización externa en este retest.**

### Límite de datos heredados y criterio de cierre AWS

El director reprodujo que una sesión **ya inconsistente antes del arreglo**, con borrador B y snapshot A, no es reparada retroactivamente por el nuevo `bootstrap`. Una reserva `NOT_STARTED` heredada puede conservar `canPay=true` hasta su expiración de 15 minutos; una consulta posterior la expira y devuelve `canPay=false`. La corrección evita crear o sobrescribir de esa manera las reservas nuevas, pero no es una migración de backups ni una reparación universal de registros antiguos.

Para este despliegue, el coordinador acreditó consultas completas sobre la tabla base, `ConsistentRead=true`, selección `COUNT` de transacciones `PENDING`: **0 antes y 0 después del cambio**, con **27 registros inspeccionados** en cada consulta y paginación completa. La [evidencia de despliegue](../../tests/e2e/evidence/2026-09-23-rubric-deployment.json) registra esa condición. No se usa un índice eventualmente consistente para inferir ausencia de pendientes. La prueba final de UI ejecutó una sesión nueva con **`index-DaPTUmLB.js` y `index-CAoB3uCW.css`**, coincidentes con el despliegue corregido. Las pestañas de prueba anteriores deben recargarse. No se amplía el alcance a una migración de datos o backups no ejecutada.

### Revisión del smoke AWS y sus límites

El evaluador leyó `scripts/smoke-cloud.mjs` y contrastó sus assertions con el reporte: guardó un borrador divergente B, creó una reserva A, comprobó snapshot canónico completo A, guardado B **409**, otra creación B **409**, restauración A, replay idempotente, reducción de disponibilidad y cancelación `ERROR/NOT_STARTED`, sin entrega y con stock restaurado. Las comprobaciones son reales sobre API AWS y DynamoDB; no son respuestas simuladas. El script no llama a tokenización ni a `/pay`. La configuración 200 acredita disponibilidad de configuración del proveedor, **no un pago real nuevo**.

También se revisó `scripts/smoke-cloud-recovery.mjs` antes de aceptar su resultado. Usa navegador y API públicos, sin mocks de respuesta; aborta tokenización, `/pay` y cualquier solicitud hacia otro origen antes de transmitirla, y falla si ocurre un intento. Comprueba sesión nueva propia y reserva `NOT_STARTED`, recuperación de R09 sin navegación, recaptura de tarjeta/consentimientos y limpieza de la reserva con stock restaurado.

**Resultado UI aceptado tras revisar el artefacto y la captura:** Chromium **153.0.8010.12**, viewport 375×667, `responseMocks=false`, TLS habilitado, `passed=true`, sin fallo. La recuperación presentó el destinatario/dirección A sin recargar tras el conflicto 409; exigió tarjeta y consentimientos nuevos. `blockedPaymentRequests=[]` y `blockedExternalRequestCount=0`: el guard no tuvo que abortar ningún intento de pago ni solicitud externa. La limpieza terminó **ERROR/NOT_STARTED, sin entrega**, sesión vacía y disponibilidad **11→10 durante la reserva→11 al cancelarla**; no consumió stock físico por venta. Los assets del reporte coinciden con el despliegue corregido. La captura muestra el resumen, con datos de entrega enmascarados y solo últimos cuatro dígitos sintéticos, sin PAN, CVC ni contactos visibles.

Este cierre verifica el defecto y su arreglo en la aplicación pública. Los pagos reales APPROVED/DECLINED siguen respaldados por el workflow anterior `35936568755`; **no se repitieron ni se atribuyen al nuevo SHA**. El smoke nuevo es anterior al pago y no demuestra una transacción nueva del proveedor.

### Cambio de puntuación

| Concepto | Inicial `a7d045f` | Candidato `ad641f4` | Razón |
|---|---:|---:|---|
| Checkout completo | 17/20 | **20/20** | Se recuperan los 3 puntos descontados exclusivamente por EV-01, tras regresiones de servicio, CAS y UI en cuatro proyectos |
| Resto de criterios base | 79/80 | **79/80** | Sin cambios; EV-02 permanece abierto |
| Total base | 96/100 | **99/100** | |
| Bonus | 48/50 | **48/50** | EV-03 y EV-04 siguen como mejoras abiertas; no se implementaron ni se conceden sus puntos |
| **Total interno** | **144/150** | **147/150** | **+3 puntos por evidencia nueva**, no por intención de corregir |

**Dictamen vigente: favorable para entrega en el alcance probado.** No quedan defectos bloqueantes conocidos en los escenarios independientes ejecutados sobre `ad641f4`, y EV-01 queda cerrado con pruebas locales, API y UI pública, bajo la condición verificada de ausencia de reservas heredadas pendientes. CI, artefacto desplegado y assets usados por la UI coinciden con el candidato revisado. La nota vigente es **147/150**; la inicial **144/150** se conserva como registro histórico.

EV-02, EV-03, EV-04 y el límite UX EV-06 permanecen asignados como mejoras abiertas; no se ampliaron durante esta corrección. No se afirma que se repararan backups antiguos, que una pestaña con JavaScript anterior esté actualizada, que no existan otros defectos ni que el evaluador externo conceda esta nota. El coordinador conserva la integración documental/CI posterior; un cambio adicional de aplicación requiere valorar su propio retest.
