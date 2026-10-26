# Resultados de QA frontend — EnterpriseCloud ERP

> Inicio: 25 de octubre de 2026.
> Este documento solo registra defectos reproducibles, riesgos no confirmados y
> módulos auditados. No implica cambios de código.

## Lote 01 — Ventas y Punto de venta

**Estado:** cerrado el 25 de octubre de 2026.

**Método:** navegador real Brave contra la instancia publicada de Vercel,
sesión autenticada de prueba. Se revisaron la interfaz, la consola y el
resultado visible de las lecturas del API. No se crearon ventas, comprobantes,
devoluciones, cobros ni movimientos de inventario.

| Módulo | Resultado | Evidencia | Bugs confirmados |
|---|---|---|---|
| Ventas (`#ventas`) | Auditado | Historial cargó 5 registros; resumen, tabla, formulario, validación, selector y búsqueda de cliente funcionaron. La consola no registró errores ni advertencias. | QA-001, QA-003 |
| Punto de venta (`#pos`) | Auditado | Cargó como modo de mostrador; el formulario rápido, el estado vacío de búsqueda y la validación repetida respondieron sin duplicar interfaz. La consola no registró errores ni advertencias. | QA-001, QA-002, QA-003 |

## Bugs confirmados

| ID | Gravedad | Módulos | Descripción y pasos reproducibles | Evidencia |
|---|---|---|---|---|
| QA-001 | Media | Ventas, Punto de venta | El mensaje de validación del formulario se propaga como error del listado después de pulsar **Registrar venta** con el formulario vacío y cerrar con **Cancelar**. El historial muestra el mensaje de campos obligatorios y un botón **Reintentar**, aunque la lectura de ventas no falló. Pulsar **Reintentar** limpia el falso error y vuelve a cargar la tabla. | Reproducido en ambas rutas; el árbol de accesibilidad mostró el mensaje junto al contador del historial y el botón `Reintentar`. |
| QA-002 | Baja | Punto de venta | La validación de la venta rápida indica que se debe completar el **centro de costo**, pero el flujo POS declara que usa el centro de costo general y no muestra ningún control para cambiarlo. El mensaje no corresponde a los campos accionables del usuario en este modo. | Al enviar el formulario POS vacío, el mensaje incluye “centro de costo”; el formulario POS solo expone almacén, cliente, líneas y nota. |
| QA-003 | Media | Ventas, Punto de venta | La búsqueda del selector de cliente queda compartida entre ambos módulos. Buscar `Zambrano` en Ventas, cerrar el formulario y abrir el selector en POS lo deja precargado. Después de buscar `zzzz-qa-sin-resultados` en POS, el selector de Ventas reaparece con esa misma consulta. | Reproducido al alternar `#ventas` → `#pos` → `#ventas`; el campo conservó ambas consultas entre rutas. |
| QA-004 | Alta — resuelto para Ventas; pendiente de regresión en Cotizaciones/Pedidos | Ventas, Cotizaciones, Pedidos de venta | Las mutaciones centrales fallaban desde el navegador aun con datos válidos. La investigación autenticada del 26 de octubre identificó tres causas acumulativas en el backend: objetivo `ON CONFLICT` incompatible con el índice histórico de numeración, metadatos ORM con referencias a tablas sin modelo y un parámetro `NULL` sin tipo en la consulta de reservas. También se corrigió el orden de middleware para que un 500 conserve los encabezados CORS. | Tras desplegar las correcciones se creó desde `#ventas` una venta de desarrollo de S/ 45.00, visible como `V-00000001`; el contador aumentó de 5 a 6 y el acumulado de S/ 2,700.00 a S/ 2,745.00. Cotizaciones y Pedidos no se reejecutaron aún contra esta versión, por lo que no se consideran cerrados. |
| QA-005 | Baja | Cotizaciones | Un mensaje de validación obsoleto permanece visible después de corregir el formulario. Al intentar guardar sin líneas, aparece “Selecciona un cliente y agrega al menos un producto”; después de añadir una línea y conservar un cliente seleccionado, el mensaje sigue hasta un nuevo envío. | Reproducido antes de guardar `COT-20261026-002`; el total ya era S/ 45.00 y el selector tenía un cliente válido, pero el aviso anterior continuaba visible. |

## Comprobaciones sin defectos confirmados

- Las dos pantallas cargaron con encabezado, métricas y tabla visibles; no se
  observaron desbordes ni roturas visuales evidentes en escritorio.
- El selector de cliente filtró resultados y presentó correctamente su estado
  vacío con una consulta inexistente.
- La pulsación repetida de **Registrar venta** en POS no creó modales ni alertas
  duplicadas.
- Las lecturas que poblaron los historiales y clientes terminaron con datos
  visibles; no hubo errores ni advertencias en la consola durante el lote.

## Riesgos / limitaciones de la sesión

- La sesión autenticada fue transferida explícitamente a Playwright el 26 de
  octubre. Se utilizó para obtener la evidencia de red y ejecutar la venta de
  desarrollo que verificó la corrección de QA-004 en Ventas.
- El historial observado contiene datos existentes de la empresa activa. No se
  validó su estado vacío integral ni un fallo HTTP controlado porque requeriría
  aislar o alterar el backend de pruebas.
- La persistencia de la consulta de cliente entre módulos puede ser intencional
  si se diseñó como borrador comercial global; mientras no esté especificado,
  se mantiene como bug de aislamiento de contexto por su efecto visible.
- No se ejecutaron pruebas responsive/móvil en este lote; deben cubrirse en una
  pasada de regresión tras corregir QA-001 a QA-003.

## Pruebas no ejecutadas

- Emisión de CPE, devolución y sus efectos contables: no se ejecutaron. La
  venta de prueba quedó registrada, pero no se inició un comprobante ni una
  devolución.
- Fallo de red, permisos insuficientes y paginación con más de una página:
  requieren un entorno aislado o datos de prueba preparados.
- Modal de comprobante y su emisión: se omitió por el mismo riesgo de mutación
  fiscal/financiera.

## Lote 02 — Cotizaciones y Pedidos de venta

**Estado:** cerrado el 25 de octubre de 2026.

**Método:** navegador real Brave contra Vercel y datos de desarrollo. El
usuario autorizó explícitamente realizar mutaciones de prueba. Se creó la
cotización `COT-20261026-002` por S/ 45.00 para validar el alta; quedó en
estado Borrador porque su aprobación falló con QA-004.

| Módulo | Resultado | Evidencia | Bugs confirmados |
|---|---|---|---|
| Cotizaciones (`#cotizaciones`) | Auditado con bloqueo | La carga mostró 1 cotización previa aprobada. Se validó el formulario vacío y se creó correctamente una cotización real con una línea. El cambio a Aprobada falló. | QA-004, QA-005 |
| Pedidos de venta (`#pedidos-de-venta`) | Auditado con bloqueo | Cargó un pedido Borrador (`PV-20261025-001`) de S/ 4,200.00. La acción Confirmar cambió a estado de carga y luego falló. | QA-004 |

## Comprobaciones sin defectos confirmados — Lote 02

- Cotizaciones y Pedidos cargaron contenido, métricas y tablas sin pantalla en
  blanco ni overlay de framework.
- La creación de cotización y sus líneas funcionó con datos reales de
  desarrollo, lo que confirma que el flujo de alta básico llega al API.
- No hubo errores ni advertencias en la consola durante el lote.
- El diseño de escritorio permaneció legible; se capturó el estado de error de
  Pedidos de venta como evidencia visual.

## Riesgos / limitaciones de la sesión — Lote 02

- No se reintentaron operaciones mutantes fallidas para evitar duplicar una
  acción si el servidor hubiera procesado la solicitud sin responder.
- QA-004 requiere una ejecución autenticada con Playwright para obtener la
  traza HTTP y atribuir su origen a CORS, backend, proxy o infraestructura.
- Despacho, conversión a venta y emisión fiscal están bloqueados por QA-004;
  no se ejecutaron para no encadenar efectos parciales.

## Pruebas no ejecutadas — Lote 02

- Conversión de la cotización a pedido: depende de la aprobación actualmente
  fallida.
- Despacho y registro de venta desde el pedido: depende de la confirmación
  actualmente fallida e impacta inventario y contabilidad.
- Vista responsive móvil, estados vacíos integrales y errores HTTP simulados:
  quedan para una regresión controlada tras resolver QA-004.

## Historial de lotes

| Lote | Módulos | Estado |
|---|---|---|
| 01 | Ventas, Punto de venta | cerrado |
| 02 | Cotizaciones, Pedidos de venta | cerrado |
