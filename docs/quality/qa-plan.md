# Plan de QA independiente

Preparado el 2026-09-23. Referencias: `docs/requirements.md`, `docs/architecture/api-contract.md`, `docs/design.md` y `docs/quality/design-checklist.md`. El plan no es un informe de pruebas aprobadas. Resultados en `qa-report.md`; riesgos y controles en `security-review.md`.

## Entornos y significado de la evidencia

| Nivel | Ejecuta | Demuestra | No demuestra |
|---|---|---|---|
| U | Jest, reloj/IDs/gateway controlados | Reglas, transiciones y ramas unitarias | Red sandbox, navegador, cloud ni atomicidad real de DynamoDB |
| I | API HTTP real con almacenamiento aislado, gateway de test explícito si hace falta | DTO, cookies, CSRF, rutas, persistencia e integración propia | Autenticidad o compatibilidad real del proveedor |
| B | Playwright sobre frontend real + API propia real | Interacciones, integración app/API y recuperación de sesión | Resultado del proveedor si el gateway está sustituido |
| BF | Playwright sobre frontend real con rutas/fixtures controlados, declarado como tal | Estados visuales, errores difíciles de provocar y accesibilidad | Funcionamiento de backend o pago real |
| S | Sandbox externo real, TLS válido, llaves de ambiente correcto | Tokenización/cobro/consulta reales del proveedor | Producción, dinero real ni ausencia absoluta de errores |
| C | Despliegue AWS público y GitHub sin autenticación | Publicación de la versión y configuración remota | Lo que no se haya ejecutado sobre esa versión |

Cada ejecución debe identificar nivel. No etiquetar BF/U como B/S. No introducir modos simulados silenciosos en la aplicación; fixtures pertenecen exclusivamente a pruebas. Tests que exigen credenciales quedan bloqueados explícitamente cuando no existen. Ningún `skip` cuenta como pass de un requisito.

## Preparación y aislamiento

1. Registrar commit, cambios sin commit, Node/npm, sistema operativo, navegadores realmente instalados y URLs. No instalar dependencias ni cambiar Git desde el rol QA.
2. Obtener handoff de autores: entrypoints ejecutables, comandos de typecheck/build/Jest, formato de evidencia y puerto de API/frontend. Leer configuración de cobertura antes de aceptar cifras.
3. Usar directorio de datos temporal exclusivo de QA, un seed con stock conocido y sesiones independientes A/B. No resetear inventario del desarrollador ni del despliegue ajeno. Sin pruebas de dinero real.
4. Para concurrencia, sincronizar inicio de solicitudes con barrera y afirmar invariantes persistidas, no solo contar respuestas. Para timeout, controlar red/reloj de pruebas sin asumir que el proveedor abortó.
5. Mantener datos de tarjeta exclusivamente en fixtures privados de ejecución y memoria de componente; no adjuntar traces/HAR/screenshots de formularios con PAN/CVC. Desactivar trace/video automático durante captura de tarjeta; tomar capturas explícitas solo con campos vacíos o resumen enmascarado. No publicar cuerpos de requests sensibles.
6. Cada hallazgo lleva caso, entorno, esperado/observado, evidencia sanitizada, severidad y dueño. El autor corrige; QA solo corrige sus tests cuando su expectativa era incorrecta, documentando motivo.

## Oráculos de pagos e inventario

- Dinero: enteros seguros en centavos de COP, subtotal del catálogo + tarifa base 250000 + entrega 1200000. El cliente confirma el total mediante `expectedTotalInCents`, pero el servidor calcula el cobro.
- Inventario: `stockAvailable = stockOnHand - stockReserved`, todas las cantidades no negativas. PENDING reserva disponibilidad; no consume existencia física ni crea entrega. APPROVED reduce `stockOnHand` y `stockReserved` una vez. DECLINED/ERROR definitivo/VOIDED libera reserva; UNKNOWN conserva reserva hasta reconciliación. Aclarar esta diferencia en cualquier test de la cifra visible.
- Idempotencia: misma sesión/llave/cuerpo normalizado devuelve mismo ID; cuerpo distinto produce 409. Un claim persistido bloquea segundo envío al proveedor, incluso tras timeout/reinicio. La transacción terminal no puede revertirse por evento viejo.
- Recuperación: PAN/CVC/tokens no sobreviven recarga. Draft permitido vive en servidor con sesión; navegador conserva solo puntero seguro. Pago desconocido se consulta, nunca se vuelve a cobrar automáticamente.
- Autorización: sesión A no accede a transacciones/clientes/entregas de B; respuesta 404. Escrituras de navegador requieren origen autorizado y CSRF; webhooks tienen autenticación independiente.

## Matriz automatizable

Todos los casos empiezan **NO EJECUTADO**. La columna nivel indica el menor nivel útil y las repeticiones necesarias para cerrar el requisito.

| Caso | Requisitos | Nivel | Preparación / acción | Aserción de aceptación |
|---|---|---|---|---|
| QA-F01 | F-01,D-04 | B,C | Abrir catálogo con seed conocido. | Nombre, descripción, precio y disponibilidad coinciden con API; imagen carga sin recurso roto. |
| QA-F02 | F-02,F-03 | B | Abrir botón tarjeta y cerrar con control/Escape antes del envío. | Un modal accesible; fondo inerte; foco vuelve al disparador; sin transacción creada. |
| QA-F03 | F-04,F-05 | U,BF | Número vacío/Luhn inválido/longitud inválida; Visa y rangos Mastercard. | Errores vinculados a campos; marca correcta; ningún request de pago inválido. |
| QA-F04 | F-04 | U,BF | Mes 00/13, fecha pasada, mes actual, CVC 2/3/4 dígitos, cuotas 0/1/36/37. | Se aceptan solo formato, vencimiento y límites del contrato. |
| QA-F05 | F-06,T-03 | U,I,B | Nombre/email/teléfono/dirección vacíos, largos o inválidos; +57 válido. | UI y API aplican límites coherentes; no se persiste un pedido inválido. |
| QA-F06 | F-07,F-08 | B | Revisar pedido válido; editar y volver. | Backdrop, tres conceptos y total exacto COP; datos permitidos conservados; tarjeta solo últimos cuatro. |
| QA-F07 | F-09,F-10,F-11 | I,B,S | Confirmar compra y registrar orden de efectos con gateway controlado; repetir en sandbox. | PENDING existe antes de invocar cobro; referencia/importe servidor usados; resultado guardado. |
| QA-F08 | F-12,F-13,F-14 | I,B,S | Aprobación válida, consultar repetidamente y volver al catálogo. | Una entrega vinculada a cliente/producto/tx; stock consumido una vez; UI confirma desde API. |
| QA-F09 | F-11,F-14 | I,BF,S | Rechazo bancario inequívoco. | Resultado rechazado legible; ninguna entrega; reserva liberada; nuevo intento solo tras cierre seguro. |
| QA-F10 | F-11,D-08 | I,BF | Estado PENDING durante más de un ciclo de polling. | Sin aprobación inventada; consulta manual; no habilitar otro cobro. |
| QA-F11 | F-10,S-02 | I,BF | Configuración ausente/proveedor indisponible. | 503/mensaje útil y reintento apropiado; no simulador automático ni falso éxito. |
| QA-F12 | F-15 | B,S,C | Recorrer producto -> datos -> resumen -> resultado -> producto. | Cinco etapas alcanzables; navegación, precio y stock coherentes en versión desplegada. |
| QA-M01 | F-07,S-10 | U,I | Inyectar `amount`, `status`, `price`, cantidad 0/2/-1/fraccionaria en quote/create/pay. | Rechazo DTO/regla; ningún efecto financiero; cantidad exactamente 1. |
| QA-M02 | S-10 | U,I | Precio o tarifas cambian entre quote y create. | 409 PRICE_CHANGED; ningún cobro; nuevo resumen y consentimiento explícito del total. |
| QA-M03 | S-10 | U | Precio cero/negativo/no entero/NaN/overflow y límites válidos. | No se produce total inválido ni redondeo oculto; se falla antes de reservar/cobrar. |
| QA-M04 | S-11,F-09 | I | Dos POST concurrentes con misma sesión/llave/cuerpo; repetir tras reinicio. | Un ID, un cliente de compra/reserva lógica y un registro idempotente durable. |
| QA-M05 | S-11 | I | Reusar llave cambiando producto/dirección/total/cuerpo normalizado. | Cambio material da 409; repetición equivalente vuelve al mismo ID; no pisa snapshot. |
| QA-M06 | S-11 | I | Misma llave en sesiones A/B. | Espacios idempotentes separados sin acceso cruzado; política de stock sigue vigente. |
| QA-M07 | S-11,S-12 | I | Stock 1, dos sesiones crean a la vez; aprobar ganadora. | Máximo una reserva/venta, stock nunca negativo, perdedora 409, una entrega. |
| QA-M08 | S-11,S-12 | U,I | Doble clic/pay concurrente + replay después de timeout y reinicio. | Claim durable previo; create proveedor se invoca como máximo una vez. |
| QA-M09 | S-12 | I | APPROVED duplicado por polling/webhook concurrentes. | Finalización atómica; entrega única; decremento único. |
| QA-M10 | S-12 | U,I | Evento terminal viejo después de APPROVED; resultado con ref/importe/moneda distintos. | No degradar aprobado ni aplicar resultado ajeno; sin mutación de stock/entrega. |
| QA-M11 | S-12,S-13 | U,I | Proveedor crea pago pero respuesta se pierde / JSON inválido / timeout después de enviar. | PENDING/UNKNOWN; reserva conservada; sin segundo POST proveedor. |
| QA-M12 | S-12 | U,I | Reserva NOT_STARTED expira; contrastar con CLAIMED/SUBMITTED/UNKNOWN. | Solo la no enviada se libera según política; canPay=false al expirar; pendientes enviados no vencen ciegamente. |
| QA-M13 | T-17,T-19 | I | Reiniciar API con datos existentes y ejecutar seed de nuevo. | Historial/stock preservados; seed no repone unidades consumidas. |
| QA-R01 | F-16,T-12 | B | Completar datos de entrega, esperar autosave, recargar. | Draft restaurado; tarjeta/consentimientos vacíos con explicación. |
| QA-R02 | F-16 | B | Recargar desde resumen antes de crear PENDING. | Importe recalculado; recaptura segura sin envío automático ni pérdida de entrega. |
| QA-R03 | S-13 | I,B | Cortar respuesta de POST /transactions después de commit, recargar. | Recupera activeTransactionId o repite misma llave; no nueva operación. |
| QA-R04 | S-13 | B | Recargar PENDING/NOT_STARTED sin tarjeta efímera. | Recupera transacción existente y permite recaptura solo cuando canPay=true. |
| QA-R05 | S-13 | B | Recargar CLAIMED/SUBMITTED/UNKNOWN. | Consulta estado existente, no tokeniza ni cobra de nuevo. |
| QA-R06 | F-16,F-14 | B | Recargar aprobado/rechazado, volver a producto. | Resultado persiste y regreso refresca inventario; sin decremento adicional. |
| QA-R07 | F-16,S-09 | U,BF | JSON corrupto/campos extra en puntero; sesión expirada; storage bloqueado. | Recuperación informativa y segura, sin crash ni retención de campos sensibles. |
| QA-R08 | D-08 | U,BF | Requests lentos de draft; cambios rápidos; offline/tab oculta. | Sin borrador viejo pisando nuevo; sin polling agresivo; mensajes y reintento coherentes. |
| QA-S01 | S-01,S-09 | U,B | Inspeccionar localStorage/sessionStorage/IndexedDB/URL/Redux/payloads propios durante pago. | Ausencia PAN/CVC/token; solo campos seguros persistidos; API propia nunca recibe tarjeta completa. |
| QA-S02 | S-02,S-05 | U,I | Inyectar URL producción/HTTP/host arbitrario y familia de llaves inválida. | Configuración rechazada antes de enviar red; destinos sandbox en allowlist. |
| QA-S03 | S-14 | I | Sesión B GET/pay de tx A; customer/delivery A; UUID inexistente. | 404 uniforme; cero datos/efectos cruzados; ausencia sesión 401. |
| QA-S04 | S-06 | I,B | CSRF ausente/falso/de otra sesión; Origin externo/ausente según política; formulario text/plain. | 403/400/415 coherente; no escritura ni CORS comodín con credenciales. |
| QA-S05 | S-06,S-07 | I,C | Inspeccionar Set-Cookie en localhost y HTTPS público. | HttpOnly, SameSite=Lax, Path correcto, TTL; Secure en HTTPS y no sesión cruda en DB. |
| QA-S06 | S-01 | I,C | Consultar sesión/draft/customer/transaction; revisar caches. | Cache-Control no-store; CDN no cachea respuestas personalizadas. |
| QA-S07 | S-06,S-12 | U,I | Webhook firma inválida/alterada/ambiente erróneo/replay/ref ajena. | Rechazo sin efectos; evento válido repetido idempotente; no confiar solo en status. |
| QA-S08 | S-01 | I,BF | API devuelve excepción/red malformada; insertar textos tipo HTML en nombre/dirección. | Errores sanitizados, React texto sin ejecución, sin stack/secretos. |
| QA-S09 | S-01,S-09 | Revisión,C | Escanear fuentes, historial, builds, logs y artefactos. | Sin secretos/cuentas del PDF/PAN/CVC; `.env.example` solo placeholders. |
| QA-S10 | S-06,S-08 | C | Cabeceras reales app/API y carga de assets/pago. | CSP compatible y restrictiva, nosniff, frame policy, referrer policy; sin mixed content. |
| QA-S11 | F-10,S-03 | U,B,S | Dos casillas vacías; aceptar solo una; tokenización ficticia/sandbox. | Ambas necesarias, enlaces reales, no aceptación implícita; tokens enviados solo tras acción explícita. |
| QA-S12 | S-14 | I | Exceso acotado de requests conforme al límite configurado. | 429 observable; no exponer secretos ni bloquear otras sesiones indebidamente. |
| QA-V01 | D-01,D-02,D-03 | BF,B | Producto/formulario/error/resumen/pending/resultado a 320x568,375x667,667x375,390x844,768x1024,1440x900. | Sin overflow horizontal ni CTA/cierre inaccesible; scroll interno usable. |
| QA-V02 | D-07 | BF,B | Tab/Shift+Tab/Enter/Escape, abrir/cerrar y alternar modal/backdrop. | Nombre accesible, foco inicial/trap/restauración; un diálogo; fondo no operable. |
| QA-V03 | D-07 | BF,B | axe por pantalla y estado de error con formulario vacío. | Cero violaciones critical/serious pendientes; revisión manual de las restantes. |
| QA-V04 | D-03,D-06 | BF | Textos máximos, importe largo, referencia larga, zoom/texto 200%, reduced motion. | Lectura completa, sin truncar totales; foco/contraste; animación no esencial reducida. |
| QA-V05 | D-05 | B,BF | Ejecutar en Chromium/Firefox/WebKit realmente disponibles. | Resultados por motor; ninguna afirmación Safari físico a partir de emulación. |
| QA-V06 | D-04 | B,C | Medir assets, tamaños y respuesta fría de producto. | Imágenes optimizadas y sin ruptura de layout; registrar mediciones, no inventar puntaje. |
| QA-L01 | Q-01,Q-02,Q-03 | U | Ejecutar Jest con cobertura por app y revisar inclusiones/exclusiones. | Tests pasan; >80% cada app; objetivo >=85% cuatro métricas; README coincide. |
| QA-L02 | Q-04,L-01 | Local,CI | Typecheck y build desde instalación proporcionada. | Exit 0, bundles válidos y sin errores ocultados; documentar warnings materiales. |
| QA-L03 | G-01,G-04,G-05 | C | URL GitHub anónima, git log/remoto, PR por feature. | Código público y evolución genuina; repo vacío no satisface entrega. |
| QA-L04 | L-02,T-20,T-21 | C | Seguir README, API docs/Postman y modelo. | Pasos ejecutables, sin claves; rutas/documentación alineadas con API real. |
| QA-L05 | L-03,L-04,S-07 | C,S | Abrir URL AWS sin sesión, comprobar versión, API, HTTPS y pago. | App/API conectadas y pago sandbox verificable con TLS válido. |
| QA-L06 | Q-07,L-06,L-07 | Revisión,C | Revisar CI, IaC, inventario y sustitución app anterior. | Pipeline real; recursos delimitados; reversión y ausencia de daño a recursos ajenos. |

## Orden de ejecución y criterios de salida

Primero U/typecheck/build y contrato HTTP con datos aislados; después B/BF y diseño. Repetir flujo principal en S/C cuando se resuelvan credenciales/TLS/despliegue. Paralelizar navegadores solo si sus datos están aislados. Tests de última unidad y expiración requieren fixture controlado y no deben competir con otras pruebas.

Bloquean entrega: fuga sensible, cobro/stock/total incorrectos, falta de autenticidad del resultado, segundo cobro tras incertidumbre, acceso entre sesiones, interacción primaria inaccesible, cobertura insuficiente, falta de sandbox real o despliegue público sin comprobar. El mínimo de puntos no reemplaza obligaciones sin evidencia. Un fallo de entorno bloquea su gate concreto y permite continuar los casos independientes.

## Dependencias conocidas al preparar el plan

- Root reportó fallo de confianza TLS `untrusted root` hacia UAT sandbox desde Python/.NET/curl Windows. No desactivar verificación de certificados; gate S pendiente de resolver por cadena de confianza válida o ruta oficial compatible comprobada.
- Repositorio público creado según evidencia UI del coordinador; aún sin push confirmado al preparar este plan. GitHub CLI en autenticación. No aprobar historial remoto ni CI.
- Perfil AWS existente con sesión vencida; usuario renovando acceso. No hay URL desplegada verificada por QA.
- Frontend y API están en construcción. E2E se escribirá contra componentes y rutas reales cuando los autores avisen; no existen pases declarados.
