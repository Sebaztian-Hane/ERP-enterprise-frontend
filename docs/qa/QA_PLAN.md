# Plan de QA frontend — EnterpriseCloud ERP

> Inicio: 25 de octubre de 2026. Alcance por lote: máximo dos módulos.
> Entorno objetivo: instancia publicada con datos de desarrollo. Las mutaciones
> solo se realizan cuando el usuario las autoriza explícitamente. El plan se
> actualiza al cerrar cada lote.

## Convenciones

- Estados: `pendiente`, `en curso`, `auditado`, `bloqueado`.
- Cada módulo se revisa por carga, navegación, controles, formularios,
  validación, carga/vacío/error, interacción repetida, consola/red y vista
  móvil cuando sea viable.
- No se confirma un defecto sin pasos reproducibles y evidencia; las hipótesis
  se registran como riesgo.

## Inventario de módulos y rutas

| # | Módulo | Ruta hash | Flujo crítico inicial | Estado |
|---:|---|---|---|---|
| 1 | Panel ejecutivo | `#dashboard` | Carga de métricas y enlaces | pendiente |
| 2 | Ventas | `#ventas` | Crear venta, historial y CPE | auditado |
| 3 | Punto de venta | `#pos` | Venta rápida de mostrador | auditado |
| 4 | Cotizaciones | `#cotizaciones` | Crear y aprobar cotización | auditado |
| 5 | Pedidos de venta | `#pedidos-de-venta` | Confirmar y despachar pedido | auditado |
| 6 | Clientes | `#clientes` | Buscar, crear y editar cliente | pendiente |
| 7 | Compras | `#compras` | Registrar compra y proveedor | pendiente |
| 8 | Proveedores | `#proveedores` | RUC, alta, edición y estado | pendiente |
| 9 | Órdenes de compra | `#ordenes-de-compra` | Confirmar y recibir orden | pendiente |
| 10 | Inventario | `#inventario` | Stock, movimientos y ajuste | pendiente |
| 11 | Almacenes | `#almacenes` | Crear/editar almacén | pendiente |
| 12 | Kardex | `#kardex` | Filtros y trazabilidad | pendiente |
| 13 | Inventario físico | `#inventario-fisico` | Conteo, aprobación y ejecución | pendiente |
| 14 | Productos | `#productos` | Catálogo, precios y búsqueda | pendiente |
| 15 | Finanzas | `#finanzas` | Cobro, pago y caja | pendiente |
| 16 | Cuentas por cobrar/pagar | `#cuentas` | Filtros, vencimientos y saldos | pendiente |
| 17 | Conciliación | `#conciliacion` | Partida y matching bancario | pendiente |
| 18 | Reportes | `#reportes` | Filtros, gráficos y exportación | pendiente |
| 19 | Configuración | `#configuracion` | Maestros y políticas | pendiente |
| 20 | Administración | `#administracion` | Usuarios, roles y auditoría | pendiente |
| 21 | Documentos | `#documentos` | Archivo, carga y descarga | pendiente |
| 22 | Control operativo | `#control-operativo` | Aprobaciones y contabilidad | pendiente |

## Lote actual: 01

1. **Ventas (`#ventas`)**: auditado el 25/10/2026. Historial, apertura/cierre
   de formulario, validación, selector/búsqueda de cliente, estado de carga y
   recuperación no destructiva revisados.
2. **Punto de venta (`#pos`)**: auditado el 25/10/2026. Carga específica,
   formulario simplificado, validación repetida, selector/búsqueda vacía y
   recuperación no destructiva revisados.

## Lote actual: 02

1. **Cotizaciones (`#cotizaciones`)**: auditado el 25/10/2026. Se comprobó
   carga, validación, creación real de una cotización de desarrollo y cambio
   de estado.
2. **Pedidos de venta (`#pedidos-de-venta`)**: auditado el 25/10/2026. Se
   comprobó carga, listado y confirmación real de un pedido de desarrollo.

## Próximo lote propuesto

1. **Clientes (`#clientes`)**: listado, búsqueda, creación/edición, documento
   de identidad y persistencia.
2. **Compras (`#compras`)**: listado, alta, proveedor, líneas, comprobante y
   recepción de inventario en datos de desarrollo.

## Dependencias y limitaciones conocidas

- Playwright CLI está disponible desde el 25/10/2026. Para flujos autenticados
  requiere una sesión de prueba iniciada en su propio navegador o una
  transferencia de estado autorizada expresamente por el usuario.
- Casos que creen ventas, CPE, cobros, inventario o movimientos bancarios solo
  se ejecutarán con datos de prueba y autorización explícita para mutar datos.
