# Diseño: POS minorista y cobros de mostrador

## Intención

Separar claramente los dos canales comerciales de EnterpriseCloud:

- **Ventas** conserva su función administrativa para la operación mayorista:
  cliente, condiciones, precios, centro de costo, cotización/pedido y
  facturación posterior.
- **Punto de venta** será una estación de mostrador minorista: catálogo rápido,
  carrito visible y cobro inmediato.

Una empresa `retail` verá POS; una `wholesale` verá Ventas, Cotizaciones y
Pedidos; una `hybrid` tendrá ambos. Esta regla ya existe tanto en el frontend
como en la autorización de API, por lo que se conserva `tenant_id` como límite
de aislamiento y no se crean datos compartidos entre empresas.

## Enfoques considerados

1. Retocar el modal actual de POS. Es barato, pero conserva el patrón de
   formulario administrativo y no resuelve el uso rápido en mostrador.
2. Crear una experiencia POS dedicada dentro de la ruta `#pos`, reutilizando
   el dominio de ventas, clientes, productos, almacenes y permisos existentes.
   **Elegido:** mantiene un único libro comercial sin sacrificar una interacción
   apropiada para caja.
3. Hacer una aplicación independiente. Aumenta el coste de operación,
   autenticación y sincronización sin aportar una ventaja proporcional.

## Experiencia POS propuesta

En escritorio, el POS usará tres zonas persistentes:

1. **Cabecera de operación:** almacén/caja, búsqueda por nombre o SKU y acceso
   a cliente. No mostrará campos mayoristas como lista de precios, condición o
   centro de costo; el backend usará el centro general configurado.
2. **Catálogo central:** tarjetas de producto con nombre, SKU, precio y estado
   de disponibilidad. Podrán agregarse con clic o arrastrarse al carrito.
   Habrá búsqueda y filtros por categoría cuando estén disponibles. Las tarjetas
   no usarán imágenes artificiales: se prioriza información real del catálogo.
3. **Carrito fijo:** líneas con incremento/decremento rápido, retiro de línea,
   subtotal, total, cliente y botón de cobro. En móvil se convertirá en panel
   inferior/modal para evitar una superficie demasiado estrecha.

El cobro abrirá un panel con efectivo, Visa, Mastercard, Yape y Plin. Se
permitirán varios medios en una venta; la suma deberá ser igual al total antes
de confirmar. Efectivo mostrará vuelto; tarjeta/billetera permitirán una
referencia opcional u obligatoria según la política futura del tenant.

## Cliente, ticket y comprobante POS

El cliente seguirá siendo una parte explícita del POS, pero con una diferencia
operativa frente al módulo **Ventas**:

- **Ventas administrativas:** siempre exigirán un cliente identificado con DNI
  o RUC antes de registrar la venta, como corresponde al canal mayorista.
- **POS:** mostrará primero las alternativas *Consumidor final*, *Buscar
  cliente* y *DNI/RUC*. Para consumidor final se usará un cliente interno
  por tenant con `tax_id` nulo; no se inventará ni reutilizará un DNI.

Toda venta POS generará un **ticket interno de venta** con detalle de líneas,
precios, total, medios de pago y folio. El ticket no se llamará “guía”, porque
la guía de remisión tiene un uso tributario/logístico distinto.

La emisión fiscal será una elección visible durante el cobro:

| Situación | Comportamiento POS |
|---|---|
| Total hasta S/ 5 y cliente no solicita comprobante | Registrar venta y ticket interno. Marcarla para consolidación diaria; no simular un CPE. |
| Boleta hasta S/ 700 | Permitir boleta con consumidor final sin DNI, o identificar al cliente si lo solicita. |
| Boleta mayor a S/ 700 | Bloquear el cierre sin DNI y nombres completos (o RUC/razón social cuando corresponda). |
| Factura | Requerir RUC de 11 dígitos y razón social; un DNI nunca habilita factura. |

Estas reglas se implementarán en backend y frontend. El constructor UBL y el
adaptador APISUNAT deberán admitir una boleta anónima válida omitiendo la
identificación del adquirente; nunca se enviará un DNI ficticio. El CPE se
creará como reserva/asíncrono siguiendo el flujo fiscal existente. El ticket
siempre estará disponible aunque el CPE esté pendiente, rechazado o no aplique.

## Persistencia y consistencia contable

El pago no será un dato decorativo del frontend. El backend incorporará un
checkout POS atómico e idempotente que, en una transacción:

1. valida el perfil `retail` o `hybrid`, productos, almacén y stock;
2. crea la venta y su cuenta por cobrar;
3. crea uno o más cobros (`payments`) con los métodos indicados;
4. aplica cada cobro a la cuenta por cobrar y deja el saldo en `paid` o
   `partial`;
5. registra caja/banco, auditoría y asientos contables mediante los servicios
   existentes.

Cada pago conservará su propio número, importe, método, cuenta de caja/banco y
referencia. No se almacenará una lista JSON de cobros en `sales`; así se mantiene
la conciliación, reversión, permisos y trazabilidad financiera existentes.

Para evitar una ambigüedad operativa, la primera versión configurará una cuenta
de cobro activa por método para cada tenant. Si falta una, el checkout fallará
antes de crear la venta. El panel de administración podrá ampliar esta
configuración después sin alterar las ventas ya registradas.

## Alcance inicial

- Ruta `#pos` dedicada y usable en escritorio/móvil.
- Catálogo clic/arrastre, búsqueda, carrito, cantidades y eliminación.
- Selección/búsqueda de cliente y opción de cliente de mostrador solo si la
  política tributaria POS permite según el importe y tipo de comprobante.
- Cobro con efectivo, Visa, Mastercard, Yape, Plin y pago combinado.
- Persistencia atómica, permisos, auditoría, idempotencia y pruebas de
  aislamiento por tenant.
- Ventas administrativas no cambian visualmente ni pierden sus capacidades.

## Fuera de alcance de esta entrega

- Integración directa con terminales de tarjeta, Yape o Plin.
- Impresión física de ticket, apertura de cajón o periféricos.
- Imágenes de producto generadas o copiadas desde las referencias.

## Criterios de aceptación

- El tipo de empresa controla la disponibilidad real de Ventas/POS, también en
  API, no solo en el menú.
- Una venta POS no se confirma si los cobros no igualan el total o una cuenta
  de caja configurada no existe.
- Reintentos no duplican venta ni cobros.
- Un tenant no puede consultar ni cobrar con productos, clientes, cuentas o
  métodos de otro tenant.
- El flujo se verifica en navegador en escritorio y móvil, incluyendo arrastre,
  clic, validación, pago combinado y una interacción repetida.
