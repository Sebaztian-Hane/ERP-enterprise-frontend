import { ENTERPRISE_AREAS } from "./enterprise";

export type WorkSection = "Datos maestros" | "Preparación" | "Operación" | "Seguimiento" | "Administración";
export type WorkspaceTransaction = { href: string; label: string; description: string; section: WorkSection; view: string; resource?: string };
export type WorkspaceModule = { id: string; short: string; label: string; href: string; description: string; category: "comercial" | "abastecimiento" | "finanzas" | "administracion"; roles: readonly string[]; entitlements: string[]; transactions: WorkspaceTransaction[] };
const legacy = (href: string, label: string, description: string, section: WorkSection, view: string): WorkspaceTransaction => ({ href, label, description, section, view });
const record = (href: string, label: string, description: string, section: WorkSection, resource: string): WorkspaceTransaction => ({ href, label, description, section, view: href.split("/")[0], resource });
const processDefinitions: Record<string, WorkspaceTransaction[]> = {
  sales: [
    legacy("#sd/clientes", "Clientes", "Identidad, contactos y condiciones de crédito", "Datos maestros", "#clientes"),
    legacy("#sd/materiales", "Consulta de materiales", "Catálogo compartido de productos y precios", "Datos maestros", "#productos"),
    record("#sd/acuerdos", "Acuerdos comerciales", "Vigencia y condiciones de suministro", "Preparación", "sales_contracts"),
    legacy("#sd/cotizaciones", "Cotizaciones", "Propuesta comercial y aprobación del cliente", "Preparación", "#cotizaciones"),
    legacy("#sd/pedidos", "Pedidos y entregas", "Pedido, preparación y seguimiento de la entrega", "Operación", "#pedidos-de-venta"),
    legacy("#sd/ventas", "Ventas y facturación", "Registro de venta, comprobantes y devoluciones", "Operación", "#ventas"),
    legacy("#sd/pos", "Punto de venta", "Venta de mostrador según el perfil del negocio", "Operación", "#pos"),
  ],
  purchases: [
    legacy("#mm/materiales", "Materiales y productos", "Ficha industrial, unidades y clasificación", "Datos maestros", "#productos"),
    legacy("#mm/proveedores", "Proveedores", "Identidad y contactos de abastecimiento", "Datos maestros", "#proveedores"),
    record("#mm/solicitudes", "Solicitudes de compra", "Necesidad, cantidad y fecha requerida", "Preparación", "requisitions"),
    record("#mm/cotizaciones", "Cotizaciones de proveedores", "Ofertas, plazos y selección de proveedor", "Preparación", "supplier_quotes"),
    legacy("#mm/ordenes", "Órdenes de compra", "Autorización y compromiso de abastecimiento", "Operación", "#ordenes-de-compra"),
    legacy("#mm/compras", "Compras y recepciones", "Ingreso de mercadería y obligación por pagar", "Operación", "#compras"),
  ],
  inventory: [
    legacy("#wm/almacenes", "Almacenes", "Centros de almacenamiento y ubicación", "Datos maestros", "#almacenes"),
    legacy("#wm/materiales", "Materiales y productos", "Maestro compartido para la operación logística", "Datos maestros", "#productos"),
    legacy("#wm/existencias", "Existencias y movimientos", "Entradas, salidas y transferencias", "Operación", "#inventario"),
    record("#wm/tareas", "Tareas de almacén", "Ubicación, preparación y movimiento interno", "Operación", "warehouse_tasks"),
    legacy("#wm/disponibilidad", "Disponibilidad y reservas", "Stock físico, compromisos y cantidad disponible", "Seguimiento", "#disponibilidad"),
    legacy("#wm/conteos", "Inventario físico", "Conteo, revisión y conciliación de diferencias", "Seguimiento", "#inventario-fisico"),
    legacy("#wm/kardex", "Kardex", "Historial de movimientos por material", "Seguimiento", "#kardex"),
    legacy("#wm/valoracion", "Valoración de inventario", "Existencias valoradas al costo de referencia", "Seguimiento", "#valoracion"),
  ],
  hcm: [record("#hcm/empleados", "Empleados", "Organización, puesto y contrato", "Datos maestros", "employees"), record("#hcm/ausencias", "Ausencias y vacaciones", "Solicitud, revisión y decisión", "Operación", "absences"), record("#hcm/jornadas", "Jornadas de trabajo", "Registro y revisión de horas", "Seguimiento", "attendance")],
  maintenance: [record("#pm/equipos", "Equipos técnicos", "Identificación, ubicación y criticidad", "Datos maestros", "equipment"), record("#pm/avisos", "Avisos de mantenimiento", "Incidencia, prioridad y resolución", "Preparación", "maintenance_notifications"), record("#pm/ordenes", "Órdenes de mantenimiento", "Planificación, ejecución y cierre del trabajo", "Operación", "maintenance_orders")],
  transport: [record("#tm/vehiculos", "Vehículos", "Flota, tipo y capacidad de carga", "Datos maestros", "vehicles"), record("#tm/ordenes", "Órdenes de transporte", "Origen, destino, carga y fecha prevista", "Preparación", "freight_orders"), record("#tm/viajes", "Viajes", "Asignación, salida y evidencia de entrega", "Operación", "trips")],
  production: [record("#pp/listas", "Listas de materiales", "Producto, componentes y cantidades base", "Datos maestros", "bills_of_material"), record("#pp/ordenes", "Órdenes de producción", "Necesidades, liberación y seguimiento", "Operación", "production_orders")],
  quality: [record("#qm/inspecciones", "Lotes de inspección", "Muestra, resultados y disposición", "Operación", "inspections"), record("#qm/no-conformidades", "No conformidades", "Hallazgos, acciones correctivas y cierre", "Seguimiento", "nonconformities")],
  projects: [record("#ps/proyectos", "Proyectos", "Responsable, fechas y presupuesto", "Preparación", "projects"), record("#ps/tareas", "Tareas de proyecto", "Asignaciones, plazos y avance", "Operación", "project_tasks")],
  controlling: [record("#co/presupuestos", "Presupuestos", "Plan y autorización por centro de costo", "Preparación", "budgets")],
  assets: [record("#aa/activos", "Activos fijos", "Alta, custodia, vida útil y baja", "Datos maestros", "fixed_assets")],
  crm: [record("#crm/oportunidades", "Oportunidades comerciales", "Prospecto, propuesta y resultado comercial", "Operación", "opportunities")],
  safety: [record("#ehs/incidentes", "Incidentes y acciones", "Reporte, investigación y medidas correctivas", "Operación", "safety_incidents")],
  service: [record("#cs/solicitudes", "Solicitudes de servicio", "Cliente, atención, solución y cierre", "Operación", "service_tickets")],
};
const businessRoles: Record<string, string[]> = { sales: ["sales"], purchases: ["purchases"], inventory: ["inventory"], hcm: ["hr"], maintenance: ["maintenance"], transport: ["transport"], production: ["production"], quality: ["quality"], projects: ["projects"], controlling: ["controller"], assets: ["assets"], crm: ["crm"], safety: ["safety"], service: ["service"] };
const entitlementGroups: Record<string, string[]> = { sales: ["sales", "customers", "quotes", "sales_orders", "pos"], purchases: ["purchases", "suppliers", "purchase_orders", "products"] };
export const WORKSPACE_MODULES: WorkspaceModule[] = [
  ...ENTERPRISE_AREAS.map(area => ({ id: area.code, short: area.short, label: area.code === "purchases" ? "Materiales y abastecimiento" : area.code === "inventory" ? "Gestión de almacenes" : area.label, href: area.href, category: area.category, description: ({ sales: "Del cliente y la propuesta a la entrega y facturación", purchases: "De la necesidad de material a la recepción de la compra", inventory: "Del ingreso físico al control y despacho de existencias" } as Record<string, string>)[area.code] ?? processDefinitions[area.code].map(item => item.label).join(" · "), roles: [...businessRoles[area.code], ...(["hcm", "safety"].includes(area.code) ? [] : ["viewer"])], entitlements: entitlementGroups[area.code] ?? [area.code], transactions: processDefinitions[area.code] })),
  { id: "finance", short: "FI", label: "Finanzas y contabilidad", href: "#fi", category: "finanzas", description: "De la obligación al cobro, pago y registro contable", roles: ["finance", "viewer"], entitlements: ["finance", "reconciliation", "operations"], transactions: [
    legacy("#fi/cartera", "Cuentas por cobrar y pagar", "Cartera, saldos y vencimientos", "Operación", "#cuentas"), legacy("#fi/tesoreria", "Cobros, pagos y caja", "Bancos, caja y aplicación de pagos", "Operación", "#finanzas"), legacy("#fi/conciliacion", "Conciliación bancaria", "Comparación y conciliación de movimientos", "Seguimiento", "#conciliacion"), legacy("#fi/contabilidad", "Contabilidad financiera", "Libro diario y balance de comprobación", "Seguimiento", "#contabilidad"), legacy("#fi/aprobaciones", "Aprobaciones", "Solicitudes, decisiones y evidencia", "Operación", "#aprobaciones"), legacy("#fi/flujo", "Flujo de caja", "Saldos por moneda y antigüedad de cartera", "Seguimiento", "#flujo-de-caja"), legacy("#fi/documentos", "Documentos de soporte", "Archivo de respaldo de la operación", "Seguimiento", "#documentos"), legacy("#fi/reportes", "Informes financieros", "Consulta y exportación de resultados", "Seguimiento", "#reportes"),
  ] },
  { id: "documents", short: "DMS", label: "Gestión documental", href: "#dms", category: "administracion", description: "Archivo, consulta y trazabilidad de documentos", roles: ["viewer"], entitlements: ["documents"], transactions: [legacy("#dms/archivo", "Archivo empresarial", "Documentos y referencias de la empresa", "Operación", "#documentos")] },
  { id: "reports", short: "BI", label: "Análisis e informes", href: "#bi", category: "finanzas", description: "Indicadores y análisis de la operación", roles: ["viewer"], entitlements: ["reports"], transactions: [legacy("#bi/panel", "Panel ejecutivo", "Indicadores de la empresa", "Seguimiento", "#dashboard"), legacy("#bi/informes", "Reportes", "Consultas y exportación", "Seguimiento", "#reportes")] },
  { id: "governance", short: "ADM", label: "Administración del propietario", href: "#gobierno", category: "administracion", description: "Usuarios, roles, configuración y migraciones", roles: [], entitlements: ["administration", "operations"], transactions: [legacy("#gobierno/accesos", "Usuarios y permisos", "Asignación de roles y módulos por usuario", "Administración", "#administracion"), legacy("#gobierno/configuracion", "Configuración empresarial", "Impuestos, monedas y reglas de operación", "Administración", "#configuracion"), legacy("#gobierno/migraciones", "Centro de migraciones", "Grupos, plantillas, simulación y carga final", "Administración", "#centro-de-datos"), legacy("#gobierno/control", "Control operativo", "Configuración de controles y autorizaciones", "Administración", "#control-operativo")] },
];
export const WORKSPACE_TRANSACTIONS = WORKSPACE_MODULES.flatMap(module => module.transactions.map(transaction => ({ ...transaction, workspace: module })));
export const transactionFor = (href: string) => WORKSPACE_TRANSACTIONS.find(item => item.href === href);
export const workspaceFor = (href: string) => WORKSPACE_MODULES.find(item => item.href === href);
