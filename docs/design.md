# Lumen — especificación de diseño UX/UI

Estado: especificación actualizada al acabado moderno implementado el 23 de septiembre de 2026, a petición del usuario. No constituye aprobación visual ni prueba de funcionamiento; el dictamen corresponde al QA independiente. Los importes, existencias, estados y campos definitivos deben coincidir con el contrato de API y la matriz del auditor.

## 1. Producto y dirección visual

Lumen es una experiencia de compra demostrativa de una lámpara de escritorio. La identidad combina la claridad de un producto digital contemporáneo con la composición cuidada de un estudio de objetos: tipografía sans firme, superficies claras, verde bosque y un acento menta luminoso. La imagen principal es un render original de producto, optimizado a WebP. La interfaz es española; la moneda es COP. El catálogo, producto, tarifas y disponibilidad proceden de la API, nunca de valores inventados en la vista.

- Marca: `lumen` en minúsculas, espaciado discreto y un símbolo original de dos arcos que sugieren una lámpara. Logotipo vectorial o texto, sin fuentes externas necesarias.
- Producto de referencia: `Lumen One`; el nombre y descripción renderizados proceden del producto persistido. Titular: `Una luz para tus ideas.` No añadir atributos de materiales, potencia, garantía o duración que el modelo no respalde.
- Lenguaje visual: blanco suave, verde bosque, texto tinta y menta como subrayado amplio del titular. Cobre reservado a detalles de la lámpara. Gran respiración en escritorio; precisión y densidad moderada en móvil. CTA principal de extremos redondos con flecha y movimiento de 3px en hover, anulado con reduced motion. La inspiración solicitada es su claridad y modernidad; no se copian la marca, composición exacta o afirmaciones de otra empresa.
- No usar reseñas, estrellas, escasez artificial, sellos, certificaciones, envíos gratis, logotipos de clientes o garantías inventadas. No presentar el entorno como una tienda operativa.
- Aviso persistente y discreto: `Compra de prueba · entorno sandbox`. Cerca del pago: `Este flujo usa un proveedor de pagos en modo de pruebas.` Mantener branding público neutral; las referencias nominales al proveedor se reservan a la documentación técnica y a sus consentimientos reales. Evitar afirmar aprobación, seguridad certificada o ausencia absoluta de cobros si no se ha verificado la configuración real.

## 2. Sistema de tokens

Todos los componentes usan una única hoja de tokens. Los colores de negocio se expresan también con texto o icono; ningún estado depende exclusivamente del color.

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-canvas` | `#FAFCF9` | Fondo de página |
| `--color-surface` | `#FFFFFF` | Campos, modal, tarjetas |
| `--color-surface-soft` | `#E8F3EB` | Escena de producto y bloques secundarios |
| `--color-ink` | `#17251F` | Títulos, texto y precio |
| `--color-muted` | `#58685F` | Descripción, etiquetas secundarias |
| `--color-primary` | `#205440` | CTA principal y selección |
| `--color-on-primary` | `#FFFFFF` | Texto sobre CTA |
| `--color-line` | `#D7E2D9` | Separadores decorativos |
| `--color-control-border` | `#738378` | Contorno visible de campos y controles |
| `--color-accent` | `#C6762D` | Ilustración y detalles; no texto pequeño |
| `--color-mint` | `#C8F7C8` | Subrayado del titular; nunca único indicador de estado |
| `--color-danger` | `#A32C27` | Mensaje e icono de error |
| `--color-danger-soft` | `#FFF0ED` | Fondo de error |
| `--color-success` | `#205440` | Estado aprobado |
| `--color-success-soft` | `#E5F3E7` | Fondo de aprobación |
| `--color-warning` | `#8A4A0D` | Pendiente o advertencia contextual |
| `--color-warning-soft` | `#FFF2D5` | Fondo de pendiente |
| `--color-neutral-soft` | `#E5EAF0` | Estado informativo |
| `--color-overlay` | `rgba(16, 30, 24, .52)` | Backdrop de modal/resumen |

Contrastes calculados mediante luminancia sRGB relativa para los tokens finales: tinta/canvas 15.41:1, muted/canvas 5.72:1, blanco/primary 8.74:1, muted/surface 5.90:1, danger/surface 7.13:1, warning/warning-soft 6.17:1 y success/success-soft 7.62:1. El contorno de control/surface es 4.00:1 y primary/mint 7.32:1. Son relaciones de tokens, no una certificación WCAG de la implementación. Verificar también hover, disabled, autofill y cualquier combinación nueva.

| Categoría | Especificación |
| --- | --- |
| Familia UI | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; Inter solo si existe localmente, sin petición de red |
| Familia de titulares | Misma sans local que UI (`--font-editorial: var(--font-ui)`); peso 650, espaciado compacto. Sin solicitudes de fuentes externas |
| Texto base | 16px, line-height 1.5; controles al menos 16px para evitar zoom automático iOS |
| Texto pequeño | 14px, line-height 1.45; 12px solo para numeración o metadatos no esenciales |
| Título producto | `clamp(42px, 4.9vw, 70px)`, line-height 1.08, peso 650; 45px móvil y 39px a 320px |
| Título modal/estado | 29px móvil, 31px escritorio; 27px a 320px; line-height 1.15 |
| Precio principal | 30px móvil, 32px escritorio; números tabulares; peso 550 |
| Espaciado | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px |
| Radio | 7–8px campos/avisos; 20px modal; 24px escena (18px móvil); 999px CTA principal e indicadores |
| Sombra | Panel flotante: `0 24px 72px rgba(16,30,24,.20)`; evitar sombra en cada elemento |
| Ancho contenido | `max-width: 1440px`, margen auto; padding 20px móvil, 32px tablet, 64px escritorio (48px en pantallas mayores de 1440px) |
| Touch target | 44 × 44px como mínimo; CTA/form-control 48px de alto mínimo |
| Movimiento | 120–180ms color/opacidad/transform, desplazamiento máximo 8px; con `prefers-reduced-motion: reduce`, eliminar movimiento no esencial |

Formato monetario mediante `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` únicamente si el valor en centavos representa pesos enteros. Si existe fracción, conservar hasta dos decimales; jamás truncar ni cambiar el total recibido. Usar `COP` explícito junto al precio principal o en el encabezado del resumen. Separador de miles local consistente, cifras alineadas a la derecha en el resumen y `font-variant-numeric: tabular-nums`.

## 3. Pantalla de producto

Orden DOM: cabecera, contexto sandbox, contenido principal, pie. Dentro del contenido: categoría discreta, título, ilustración, descripción, precio, existencias y CTA. CSS Grid puede organizar escritorio sin crear un orden de teclado diferente al visual. Un único `h1` y un enlace inicial `Saltar al contenido` visible al recibir foco.

### Escritorio desde 1024px

- Cabecera de 94px con marca a la izquierda, `Objetos para habitar tus ideas.` a la derecha y etiqueta Sandbox. Línea de 1px y ninguna navegación ficticia.
- Hero de dos columnas, aproximadamente 54% imagen y 46% información, gap adaptable 36–80px. La imagen ocupa una escena de mínimo 580px de alto con fondo surface-soft y radio 24px. El número `01` aparece como decoración `aria-hidden`.
- Información con ancho de lectura máximo 420px: categoría `Luz de escritorio`, título, descripción de 2–3 líneas, precio, existencias y botón `Pagar con tarjeta` a ancho completo.
- Existencias explícitas `Disponible · 12 unidades` solo con el número real. Si queda una unidad: `Disponible · 1 unidad`. Si el servidor devuelve cero: `Agotado` y CTA deshabilitado. No inventar urgencia.
- Bloque inferior liviano con etiqueta `Detalle del pedido`, explicando que las tarifas se muestran antes de pagar. Evitar listas promocionales sin respaldo.
- Footer de dos líneas máximo: marca y `Demostración técnica · pagos en sandbox`.

### Móvil 375 × 667 y desde 320px

- Cabecera 68px, gutters 20px (16px a 320px), marca y `Sandbox` con texto legible. Sin menú hamburguesa sin contenido.
- Titular y categoría compactos, escena de producto de 307px de alto (280px a 320px), descripción breve y precio. Mantener la lámpara completa y reconocible a 320px.
- El CTA puede estar en un bloque sticky al pie de la página, con fondo canvas sólido, línea superior, total de producto y botón. Reservar espacio equivalente en el contenido para que jamás tape texto. No usar posición fixed en formularios con teclado móvil.
- Si un CTA sticky duplica otro, solo una instancia debe permanecer enfocada y visible en cada breakpoint; preferir una única instancia movida por CSS.
- No forzar todo el producto dentro de 667px recortando texto. Permitir scroll vertical; el objetivo es que la acción primaria sea fácil de alcanzar y la información conserve legibilidad.
- Respetar `env(safe-area-inset-bottom)` y `100dvh` con fallback `100vh`.

### Estados del producto

- Cargando: skeleton de proporciones estables, `aria-busy` en la región y texto accesible `Cargando producto`. No habilitar compra con precio estimado.
- Error de carga: mensaje concreto `No pudimos cargar el producto.` y botón `Volver a intentar`. Conservar estructura de página.
- Agotado: texto visible y acción de compra deshabilitada; permitir reconsultar disponibilidad de forma explícita.
- Al regresar tras pagar: reconsultar producto y existencias. La cantidad visible debe reflejar la API, sin decremento optimista irreversible. Un pago aprobado debe consumir inventario exactamente una vez según backend; otros estados no lo consumen.

## 4. Imagen de producto e ilustración vectorial original

El asset protagonista final es un render original generado para Lumen, con procedencia en `docs/design-assets.md`. `apps/web/public/lumen-one-640.webp` y `lumen-one-1200.webp` son variantes 1:1 de 12KB y 31KB aproximadamente. `ProductImage` utiliza `<picture>`, `srcSet`, `sizes`, dimensiones explícitas y prioridad alta solo en hero. El resumen usa el mismo asset como miniatura. La ruta de producto procede de API; el seed histórico conocido `product_lumen_one` con `/lumen-lamp.svg` se mapea únicamente a este render, sin alterar precio, stock o identidad. Un error de imagen activa el SVG local, elimina la fuente WebP y evita reintentos infinitos.

La ilustración siguiente permanece como fallback original, no como una imagen distinta en el resumen normal:

Crear en el repositorio `apps/web/public/lumen-lamp.svg` o componente SVG equivalente. No requiere foto externa ni image generation. `viewBox="0 0 720 640"`, peso objetivo inferior a 20KB. Descripción accesible: `Ilustración de una lámpara de escritorio Lumen, color verde bosque, sobre una mesa clara.` Si la información ya está en texto inmediato, puede ser decorativa con `aria-hidden="true"`.

Composición sugerida reproducible:

1. Fondo transparente para permitir que el contenedor dicte el color; círculo cálido muy suave centrado en `(370,285)`, radio 190.
2. Mesa horizontal en y=538; elipse de sombra `(370,546)` con radios `(166,18)` y opacidad .12.
3. Base baja elíptica verde, ancho 196, centro `(348,512)`, con línea de luz superficial. Mástil de ancho 18 desde `(348,491)` a `(348,354)`.
4. Brazo articulado de dos segmentos con terminaciones redondas: `(348,354)` a `(420,254)` a `(351,181)`, stroke verde oscuro y grosor 18. Dos círculos de unión de 15px para dar personalidad mecánica.
5. Pantalla inclinada unida en `(351,181)`: silueta de trapecio curvo cuya boca termina cerca de `(273,282)`, exterior verde y borde inferior cobre. Evitar una pantalla que parezca desconectada del brazo.
6. Cono de luz cálida semitransparente desde la pantalla hacia la mesa, detrás del mástil; usar un degradado simple de ámbar a transparente, sin blur pesado.
7. Un libro fino cerrado y un pequeño círculo decorativo pueden balancear la escena. No añadir textos dentro de la imagen ni ornamentación que compita con el producto.

El SVG debe pasar inspección visual real a 320, 375 y 1440px: brazo conectado, sombra coherente, producto entero sin cortes. No usar iconos emoji para estados o marcas de tarjeta. Iconografía propia con SVG 24 × 24, stroke 1.75–2, caps redondos. F-05 exige mostrar el logo de la red detectada: incluir representaciones vectoriales locales reconocibles de Visa y Mastercard, con nombre accesible, solo como identificación de tarjeta y sin sugerir certificación. Preferir activos oficiales redistribuibles cuando se disponga de ellos; el fallback visual debe conservar wordmark de Visa y símbolo de dos círculos de Mastercard, sin sellos inventados. No basta un texto genérico `Tarjeta` ni el nombre de la red sin representación de logo. No depender de descarga remota en runtime.

## 5. Flujo de cinco pasos

El flujo canónico es producto → formulario de tarjeta y entrega → resumen en backdrop → estado de transacción → regreso al producto. El último paso actualiza existencias. Un indicador de progreso de tres etiquetas operativas, `Datos`, `Resumen`, `Resultado`, puede aparecer dentro del checkout; no es necesario convertir el producto y el regreso en dos pantallas vacías. Los textos accesibles pueden describir el paso actual sin numeración engañosa.

### Paso 2: modal de tarjeta y entrega

- Escritorio: modal centrado, ancho máximo 620px, alto máximo `calc(100dvh - 48px)`, body con scroll. Móvil: panel de ancho completo y alto disponible; radio superior 20px si queda margen superior, sin margen lateral que comprima los campos.
- Un título `Completa tus datos`, descripción `Revisa el resumen antes de confirmar el pago.` y botón de cierre con nombre `Cerrar formulario de pago`.
- Dos grupos semánticos `fieldset` con `legend`: `Tarjeta` y `Entrega`. Las etiquetas siempre permanecen visibles. No sustituirlas por placeholders.
- Orden de campos: número de tarjeta; nombre del titular; vencimiento y código de seguridad; nombre de quien recibe; correo; teléfono; dirección; complemento opcional; ciudad; departamento si lo exige el contrato. País fijo Colombia si la API lo limita. No añadir campos que el contrato no utilice.
- Reutilizar el nombre de titular como receptor solo con una acción explícita o un campo independiente; no inferir que ambas personas son la misma.
- Número: `inputMode="numeric"`, `autocomplete="cc-number"`, agrupación visual legible; detectar Visa/Mastercard sin prometer aceptación por el mero prefijo. Mostrar nombre de red junto al campo, con texto anunciado al cambiar de desconocida a reconocida. El algoritmo de validación respeta longitudes válidas de las redes soportadas.
- Vencimiento: `MM/AA`, `autocomplete="cc-exp"`; no utilizar selector nativo de mes si deteriora la interacción de tarjeta. CVC: `type="password"` o equivalente oculto, `inputMode="numeric"`, `autocomplete="cc-csc"`; ayuda `3 dígitos al reverso de la tarjeta` solo para redes admitidas de tres dígitos.
- Correo: `type="email"`, `autocomplete="email"`; teléfono `type="tel"`, `autocomplete="tel"`; dirección con atributos estándar pertinentes. No exigir acentos, mayúsculas ni un formato inventado de dirección.
- Desktop: vencimiento/CVC en dos columnas; ciudad/departamento pueden ir en dos columnas. Móvil: vencimiento/CVC conservan 50/50 si cada control supera 130px; dirección y nombre siempre a ancho completo.
- Texto junto a acción: `El pago se confirma en el siguiente paso.` Acción principal `Continuar al resumen`; secundaria `Volver al producto`.
- Consentimientos y enlaces de aceptación del proveedor se mostrarán únicamente si la integración y contrato los requieren, con URLs reales suministradas por el proveedor. No marcar consentimientos por defecto.

Validación: al salir de un campo ya editado y al enviar; mientras se corrige un error mostrado, actualizar sin interrumpir cada pulsación. El submit inválido muestra resumen `Revisa los campos marcados.` y lleva foco al primer inválido. Cada error se conecta mediante `aria-describedby` y `aria-invalid="true"`.

Copys concretos: `Ingresa un número de tarjeta válido.`, `Usa una tarjeta Visa o Mastercard.`, `Ingresa el vencimiento en formato MM/AA.`, `La tarjeta está vencida.`, `Ingresa los 3 dígitos del código de seguridad.`, `Ingresa un correo válido.`, `Ingresa la dirección de entrega.` Los errores del servidor no deben exponer códigos internos ni contenido bruto del proveedor.

### Paso 3: resumen en backdrop

- Cerrar el formulario antes de abrir el resumen: un solo diálogo activo. Backdrop oscuro sobre el producto, panel a la derecha en desktop de 460px máximo; móvil como panel ancho completo que puede ocupar toda la altura y hacer scroll.
- Título `Revisa tu pedido`; miniatura compacta, producto y cantidad. Mostrar destinatario/dirección en 2–4 líneas que puedan envolver. Acción `Editar datos` regresa al formulario preservando solo datos permitidos.
- Tarjeta: `Visa terminada en 1234` o `Mastercard terminada en 1234`. Jamás PAN completo ni CVC en el resumen, DOM oculto, Redux, URL, storage, analítica o logs.
- Tres conceptos separados, siempre visibles y provenientes de la API: `Producto`, `Tarifa base`, `Envío`. Luego separador y `Total a pagar`. Mostrar cero como `$ 0` si corresponde; no esconder una tarifa incluida ni agregar una no autorizada. Si el producto admite cantidad, la fila especifica unidades y subtotal real.
- Indicar moneda `COP`. La suma visual debe coincidir exactamente con el total servidor, sin cálculo monetario de coma flotante ni tarifas independientes duplicadas en frontend.
- Acción principal `Pagar $ [total]` usando el formatter común. Si el importe fuese demasiado largo a 320px, permitir dos líneas completas; nunca reducir tamaño del texto, truncar el total ni empujar la fila fuera del panel.
- Texto inferior `Pago en modo de prueba` y consentimiento real si aplica. Ningún sello visual que sugiera respaldo comercial del proveedor.
- Si cambian precio, tarifa o stock al confirmar: presentar el total actualizado, explicar `El pedido cambió. Revisa el nuevo total antes de continuar.` y requerir nueva confirmación. No confirmar un importe diferente silenciosamente.
- `Editar datos` y cierre son posibles antes del envío. Tras crear una transacción, salir de la vista no cancela el pago; comunicar ese hecho cuando aplique.

### Paso 4: transacción y resultado

| Estado real | Título y contenido | Acción/efecto |
| --- | --- | --- |
| Creando/tokenizando | `Preparando tu pago` y descripción breve | Deshabilitar submit y marcar `aria-busy`; impedir doble envío sin bloquear lectura |
| Pendiente proveedor | `Tu pago sigue en proceso` / `Aún no hay una respuesta definitiva. Puedes consultar el estado con esta referencia.` | Mostrar referencia y `Consultar estado`; consulta moderada, sin icono de aprobado |
| Aprobado confirmado por API | `Pago aprobado` / `Tu pedido quedó registrado.` | Mostrar total, producto, referencia y resumen de entrega real; `Volver al producto` |
| Rechazado | `El pago no fue aprobado` / mensaje comprensible verificable | `Intentar con otra tarjeta` regresa a captura; `Volver al producto`; no consumir inventario ni inventar entrega |
| Error confirmado sin transacción | `No pudimos iniciar el pago` | `Volver a intentar` cuando backend confirma que es seguro; nunca mostrar aprobado |
| Timeout/desconexión con resultado incierto | `Estamos verificando tu pago` / `La conexión se interrumpió antes de confirmar el resultado.` | Recuperar por referencia/idempotencia; consultar estado, impedir crear otro pago mientras el resultado sea incierto |
| Cancelado/expirado, si la API lo expone | Texto específico del estado | Permitir nuevo intento solo si el estado es final según contrato |

La animación de proceso es finita visualmente, no un porcentaje inventado. Una espera larga cambia el texto hacia consulta de estado, nunca hacia aprobación. `role="status"`/`aria-live="polite"` para cambios asíncronos; `role="alert"` para errores que requieren corrección. No reanunciar un mensaje idéntico en cada poll.

El estado aprobado usa un círculo de 56–64px con check SVG, título y referencia; puede tener una sutil ilustración de luz. No confeti intenso, countdown ni descarga de factura inexistente. Referencias largas usan `overflow-wrap: anywhere`; botón `Copiar referencia` debe confirmar éxito con un mensaje accesible si se implementa.

### Paso 5: regresar y refrescar

`Volver al producto` cierra el estado y reconsulta inventario. Puede dejar una confirmación discreta `Consulta finalizada` o un acceso a la última referencia cuando sea útil, sin volver a enviar ni volver a consumir stock. No mostrar el nombre/dirección del cliente en la página pública tras terminar.

Recarga: restaurar producto, paso seguro y referencia de transacción según contrato. No persistir PAN, CVC ni tokens privados; campos de tarjeta se vacían. Si se vuelve al resumen sin tarjeta utilizable, pedir recaptura antes de continuar y explicarlo: `Por tu privacidad, vuelve a ingresar los datos de la tarjeta.` Una transacción ya creada se consulta por su referencia; no obliga a recapturar ni crea otra. Minimizar PII persistida; preferir datos efímeros de formulario y recuperación desde sesión autorizada cuando exista.

## 6. Interacción y accesibilidad

- Modal y resumen: `role="dialog"`, `aria-modal="true"`, título conectado por `aria-labelledby`, foco inicial en título o primer campo apropiado, focus trap y fondo `inert`. Al cerrar, volver al disparador exacto. No implementar traps incompatibles con zoom, lectores de pantalla o teclado móvil.
- `Escape` cierra la captura o resumen antes de envío. Mientras se consulta una transacción puede cerrar únicamente la vista sin cancelar, manteniendo acceso claro al estado; no convertir `Escape` en cancelación implícita. Clic de backdrop debe seguir la misma regla y no descartar tarjeta sin explicación; se recomienda cerrar solo con control explícito/Escape para evitar pérdidas accidentales.
- Focus visible: anillo de 3px en tinta con offset 3px en fondos claros; blanco sobre panel oscuro. Nunca `outline: none` sin sustituto. Hover y focus no desplazan layout.
- Botones reales para acciones, enlaces reales para navegación. Sin `div` clickable. Spinner decorativo no sustituye el nombre del botón. Los botones de icono tienen nombre accesible específico.
- 200% de zoom de navegador, 200% de texto y reflow a 320px sin scroll horizontal de página. No alturas fijas en bloques con texto variable.
- Campos con label, ayuda y error asociados; obligatorios indicados con texto inicial y no solo asterisco. `Complemento (opcional)` debe ser explícito.
- Orden tab lógico; Enter envía el formulario activo solo una vez. Espacio activa botones. No capturar eventos globales que interfieran con entrada o navegación.
- Pantallas de error/pending/aprobado deben ser distinguibles sin color. Evitar subrayados decorativos que parezcan enlaces y textos clickables sin affordance.
- Acciones deshabilitadas conservan etiqueta legible y motivo cercano; no dejar a la persona adivinando un campo faltante. Para submit inválido, preferir botón activo con validación descriptiva.
- Todas las cadenas están en español y `document.documentElement.lang` es `es-CO` o `es` consistente con el proyecto. Definir título de página significativo `Lumen · Luz de escritorio` y cambiarlo en resultado si ayuda.

## 7. Matriz de validación de diseño

Matriz completa operativa: `docs/quality/design-checklist.md`. El mínimo de tamaños es 320 × 568, 375 × 667, 667 × 375 (SE en paisaje), 390 × 844, 768 × 1024, 1024 × 768 y 1440 × 900. Revisar producto, formulario con errores, resumen con nombre/dirección largos, proceso, pendiente, rechazado, error de red, aprobado y retorno con stock actualizado.

Ejecutar Chromium y Firefox; WebKit/Safari cuando el entorno permita ejecución real. Emular 375 × 667 en Chromium no demuestra Safari en iPhone: reportar esa diferencia. Revisar navegación por teclado, foco y un lector de pantalla si existe; el análisis automático no sustituye estos controles.

## 8. Handoff y definición de terminado

Desarrollo recibe estos tokens, layouts, estados y textos; puede ajustar composición por evidencia visual conservando requisitos y accesibilidad. Cualquier decisión nueva sobre precio, tarifa, stock, consentimiento, pago o datos debe acordarse con director/backend, no resolverse solo con CSS.

Guardar capturas sin PII ni datos de tarjeta en `docs/quality/evidence/design/` con nombres que identifiquen viewport, estado y navegador. El autor puede hacer autoinspección; QA independiente debe evaluar el flujo final. Solo marcar aprobado lo probado, con archivo/comando/navegador/evidencia. Un screenshot aislado no verifica focus trap, backend o comportamiento del pago.

Bloquean entrega: recortes/overflow, texto ilegible, teclado sin salida, foco perdido, campo sin label, error sin explicación, total inconsistente, PAN/CVC persistidos o expuestos, aprobación inventada, stock incorrecto, interacción primaria inaccesible o una pantalla requerida ausente. El checklist separa defectos de diseño, funcionales y dependencias de entorno.
