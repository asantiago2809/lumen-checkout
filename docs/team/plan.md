# Plan dirigido y puertas de calidad

Estado inicial: planificación y contratos. Ninguna puerta se considera aprobada por la existencia de este documento. El auditor conserva el registro de cumplimiento y QA conserva el de ejecución.

## Objetivo y prioridad

Entregar antes del lunes 28 de septiembre de 2026 si las evidencias están completas. Fecha interna: domingo 27, sin depender de una hora no acordada el lunes. Se priorizan funcionalidad, API, cobertura y despliegue; el acabado visual, la arquitectura hexagonal, ROP y seguridad se integran desde el comienzo.

## Fases y dueños

| Fase | Dueño | Trabajo paralelo permitido | Salida verificable |
| --- | --- | --- | --- |
| 0. Contratos y riesgos | Director | Auditor de requisitos; coordinador inspecciona entorno y cuentas | Matriz fiel al PDF, contrato consumible, sandbox identificado y alcance cloud inventariado |
| 1. Esqueleto y flujo vertical | Backend y frontend/diseño | Coordinador configura monorepo/CI; director resuelve interfaces | Producto sembrado, sesión, formulario, cotización, PENDING persistido y recorrido completo con adaptadores de prueba claramente identificados |
| 2. Integración auténtica | Backend | Frontend termina estados y responsive; coordinador prepara IaC | Pago sandbox aprobado/rechazado reales, reserva/stock correctos, refresh y duplicados controlados |
| 3. Verificación independiente | QA de software | QA de diseño; autores corrigen defectos por turno disponible | E2E, negativos, accesibilidad, responsive y navegadores con evidencia; cobertura Jest >80% por app |
| 4. Publicación y trazabilidad | Release/coordinador | QA verifica URL desplegada; auditor verifica entregables | HTTPS público, API/documentación, datos persistentes, GitHub público neutral, CI verde y reversión documentada |
| 5. Auditoría final | Auditor independiente | Director prepara resumen; candidato revisa comprensión y entrega | Checklist punto a punto con enlaces, informe de extras comprobados y limitaciones explícitas |

Director, auditor, QA, desarrolladores, diseñador y release son roles concretos con prompts persistentes. Se alternan por fases: el límite de cuatro agentes no equivale a ocho procesos trabajando a la vez.

## Asignación inmediata para el coordinador

1. Backend: `apps/api/**`. Implementar contrato HTTP, dominio puro, Result/ROP, persistencia, reservas atómicas, adaptador sandbox y Jest. No modificar UI ni infraestructura compartida sin coordinar.
2. Frontend/diseño: `apps/web/**`. Implementar SPA React/Redux, diseño original, modal accesible, backdrop real, validación, tokenización efímera, recuperación y Jest. API y estados según contrato, sin secretos privados.
3. Coordinador/release: configuración raíz, dependencias, CI, documentación de ejecución, IaC y registro Git. Crear commits cuando exista una unidad coherente; sin reescribir trabajo compartido.
4. Al liberar un puesto: QA independiente sobre el primer recorrido vertical. Después, auditor final sobre artefactos y evidencia, sin alterar conclusiones para alcanzar una puntuación.

## Puertas

| Puerta | Condición | Evidencia mínima | Bloquea |
| --- | --- | --- | --- |
| G0 Contrato | Rutas, DTO, estados y stock acordados | Contratos y matriz, discrepancias resueltas | Desarrollo divergente |
| G1 Negocio | Cinco pasos, base fee siempre, entrega, persistencia | Ejecución y pruebas del flujo positivo/negativo | Revisión final |
| G2 Dinero y datos | PAN/CVC efímeros, importes servidor, sandbox, sesión, duplicados y concurrencia | Tests de límites y trazas sanitizadas | Despliegue público |
| G3 Cobertura | Jest >80% en ambas apps; objetivo 85% en statements, branches, functions, lines | Reports por app y comando reproducible | Declaración de cumplimiento |
| G4 Experiencia | Sin desbordes, foco correcto, errores comprensibles y refresh seguro | QA independiente en 375x667 CSS px y escritorio; Chromium, Firefox y WebKit cuando disponibles | Entrega |
| G5 Cloud/Git | URL funcional, datos durables, HTTPS, headers, historial real | Smoke público, CI, README/Swagger, commits/PRs y rollback | Entrega |
| G6 Auditoría | Cada requisito clasificado con evidencia y extras diferenciados | Checklist final y limitaciones | Envío por el candidato |

La referencia iPhone SE 2020 de la fuente describe resolución física; el viewport de prueba principal es 375x667 píxeles CSS. Añadir 320px como prueba de robustez, 768px y 1440px. Probar zoom al 200%, teclado, movimiento reducido y teclado virtual.

## Riesgos y tratamiento

| Riesgo | Prioridad | Responsable | Decisión/acción |
| --- | --- | --- | --- |
| Llaves UAT incompatibles con sandbox público | P0 | Backend/coordinador | Emparejar URL UAT sandbox y familia de llaves; comprobar comercio antes de programar pagos |
| Timeout después de enviar cobro | P0 | Backend | Conservar PENDING/SUBMISSION_UNKNOWN, referencia y reserva; nunca recobrar automáticamente |
| Dos compradores del último producto | P0 | Backend/QA | Reserva condicional y finalización atómica; test concurrente real sobre adapter durable |
| Credenciales filtradas por PDF/logs/build | P0 | Release/QA | PDF externo, secretos locales ignorados, logging por allowlist y escaneo de working tree/historia |
| AWS anterior con recursos compartidos | P0 | Coordinador | Inventariar, aislar, respaldar y preparar reversión antes de retirar el despliegue exacto |
| CI verde con integración simulada | P0 | Auditor | Separar tests deterministas de evidencia real sandbox y smoke cloud |
| Tiempo consumido por extras | P1 | Director | Congelar carrito, admin, login, descuentos y otros pagos; primero gates obligatorios |
| Credenciales compartidas del proveedor | P1 | Backend | Usar API; no cambiar cuenta, contraseña, MFA ni configuración global del comercio |
| Servicio cloud con costo fijo innecesario | P1 | Release | Preferir servicios gestionados por uso si el inventario lo permite; no crear RDS/EKS por defecto |
| Pendiente sin webhook configurado | P1 | Backend/release | Reconciliar por backend; diseñar manejo de resultado incierto y documentar límite de operación |

## Intervención del candidato

Ya confirmó lunes, sesión de GitHub y AWS, y autorización para sustituir la prueba anterior. El equipo debe continuar con esas autorizaciones. Puede requerirse autenticación en la sesión oficial, elección de recursos cuando el inventario resulte ambiguo o resolver indisponibilidad del sandbox. El equipo preparará primero opciones concretas y un plan verificable. No se requiere permiso adicional para cada commit, prueba o ajuste reversible autorizado. El envío a evaluadores corresponde al candidato salvo instrucción expresa posterior.

## Disciplina de entrega

Todo avance registra cambios y pruebas reales. Un defecto de pago, seguridad, pérdida de datos, stock negativo o recorrido bloqueado es P0 y detiene entrega. Defectos visuales que impidan leer o accionar son P1. No se compensa un requisito incumplido con extras. README y checklist deben distinguir requisito, mejora, prueba y dependencia no resuelta.
