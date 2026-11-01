export const ENTERPRISE_AREAS = [
  { code: "hcm", short: "HCM", label: "Personas y organización", href: "#hcm", category: "administracion" },
  { code: "sales", short: "SD", label: "Ventas y distribución", href: "#sd", category: "comercial" },
  { code: "purchases", short: "MM", label: "Abastecimiento", href: "#mm", category: "abastecimiento" },
  { code: "production", short: "PP", label: "Planificación de producción", href: "#pp", category: "abastecimiento" },
  { code: "maintenance", short: "PM", label: "Mantenimiento", href: "#pm", category: "abastecimiento" },
  { code: "quality", short: "QM", label: "Gestión de calidad", href: "#qm", category: "abastecimiento" },
  { code: "inventory", short: "WM", label: "Operaciones de almacén", href: "#wm", category: "abastecimiento" },
  { code: "transport", short: "TM", label: "Gestión de transporte", href: "#tm", category: "abastecimiento" },
  { code: "projects", short: "PS", label: "Proyectos", href: "#ps", category: "administracion" },
  { code: "controlling", short: "CO", label: "Presupuestos y control", href: "#co", category: "finanzas" },
  { code: "assets", short: "AA", label: "Activos fijos", href: "#aa", category: "finanzas" },
  { code: "crm", short: "CRM", label: "Oportunidades comerciales", href: "#crm", category: "comercial" },
  { code: "safety", short: "EHS", label: "Seguridad y ambiente", href: "#ehs", category: "administracion" },
  { code: "service", short: "CS", label: "Servicio al cliente", href: "#cs", category: "comercial" },
] as const;

export const SPECIALIZED_ROLE_LABELS = {
  hr: "Recursos humanos", maintenance: "Mantenimiento", transport: "Transporte", production: "Producción",
  quality: "Calidad", projects: "Proyectos", controller: "Control de gestión", assets: "Activos fijos",
  crm: "Gestión comercial", safety: "Seguridad y ambiente", service: "Servicio al cliente",
};
export const ENTERPRISE_SUMMARIES: Record<string, string> = {
  hcm: "Empleados, ausencias y jornada", sales: "Acuerdos y recorrido comercial", purchases: "Solicitudes y ofertas de proveedores",
  production: "Estructuras, necesidades y órdenes", maintenance: "Equipos, avisos y órdenes de trabajo", quality: "Inspecciones y acciones correctivas",
  inventory: "Ubicación, preparación y tareas", transport: "Vehículos, cargas y viajes", projects: "Proyectos, responsables y tareas",
  controlling: "Presupuestos por centro de costo", assets: "Altas, custodios y bajas de activos", crm: "Prospectos y oportunidades",
  safety: "Incidentes y medidas correctivas", service: "Solicitudes y atención al cliente",
};
export type SpecializedRole = keyof typeof SPECIALIZED_ROLE_LABELS;
export const SPECIALIZED_ROLE_MODULE: Record<SpecializedRole, string> = { hr: "hcm", maintenance: "maintenance", transport: "transport", production: "production", quality: "quality", projects: "projects", controller: "controlling", assets: "assets", crm: "crm", safety: "safety", service: "service" };

export type BusinessField = { key: string; label: string; kind: "text" | "textarea" | "date" | "email" | "select" | "number" | "integer" | "reference" | "lines"; required: boolean; choices: string[]; reference: string | null; minimum: number | null; maximum: number | null };
export type BusinessResource = { code: string; module: string; label: string; origin: string; outcome: string; fields: BusinessField[]; transitions: Record<string, string[]>; initial: string; editable: string[]; approvals: string[]; completion: Record<string, string[]>; limitation: string; access: { read: boolean; write: boolean; approve: boolean } };
export type EnterpriseCatalog = { ready: boolean; migration: string; resources: BusinessResource[]; areas: { code: string; short: string; label: string; owner: string; href: string }[] };
export type BusinessRecord = { id: string; resource_code: string; module_code: string; number: string; title: string; status: string; version: number; data: Record<string, unknown>; derived: { requirements?: { product_id: string; sku: string; name: string; quantity: string; unit: string }[] }; created_by: string; updated_at: string; history?: { version: number; action: string; from_state: string | null; to_state: string; note: string; created_at: string; content_hash: string }[] };

export const stateLabels: Record<string, string> = { draft: "Borrador", submitted: "En revisión", approved: "Aprobado", rejected: "Rechazado", active: "Activo", inactive: "Inactivo", open: "Abierto", released: "Liberado", in_progress: "En ejecución", completed: "Completado", cancelled: "Cancelado", resolved: "Resuelto", closed: "Cerrado", dispatched: "En viaje", delivered: "Entregado", received: "Recibido", selected: "Seleccionado", disposed: "Dado de baja", qualified: "Calificado", proposal: "Propuesta", won: "Ganado", lost: "Perdido", assigned: "Asignado" };
export const optionLabels: Record<string, string> = { indefinite: "Indefinido", fixed_term: "Plazo fijo", internship: "Prácticas", vacation: "Vacaciones", leave: "Permiso", medical_leave: "Descanso médico", low: "Baja", medium: "Media", high: "Alta", critical: "Crítica", truck: "Camión", van: "Furgón", trailer: "Tráiler", other: "Otro", minor: "Menor", major: "Mayor", putaway: "Ubicación", picking: "Preparación", internal_move: "Movimiento interno" };

export const AREA_LINKS: Record<string, { label: string; href: string }[]> = {
  sales: [{ label: "Clientes", href: "#clientes" }, { label: "Cotizaciones", href: "#cotizaciones" }, { label: "Pedidos", href: "#pedidos-de-venta" }, { label: "Ventas y entregas", href: "#ventas" }],
  purchases: [{ label: "Proveedores", href: "#proveedores" }, { label: "Órdenes de compra", href: "#ordenes-de-compra" }, { label: "Recepciones", href: "#compras" }],
  inventory: [{ label: "Inventario", href: "#inventario" }, { label: "Disponibilidad", href: "#disponibilidad" }, { label: "Kardex", href: "#kardex" }],
  production: [{ label: "Materiales", href: "#productos" }, { label: "Disponibilidad", href: "#disponibilidad" }],
  assets: [{ label: "Contabilidad", href: "#contabilidad" }], controlling: [{ label: "Contabilidad", href: "#contabilidad" }, { label: "Flujo de caja", href: "#flujo-de-caja" }],
};
