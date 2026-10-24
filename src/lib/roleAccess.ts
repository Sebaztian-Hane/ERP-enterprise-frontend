export type RoleCode =
  | "owner"
  | "admin"
  | "sales"
  | "purchases"
  | "finance"
  | "inventory"
  | "viewer";

// These routes mirror the API permissions. The browser uses this only to
// tailor the workspace; every write and read remains enforced by the API.
const modulesByRole: Record<RoleCode, readonly string[]> = {
  owner: ["*"],
  admin: ["*"],
  sales: [
    "#ventas",
    "#pos",
    "#cotizaciones",
    "#pedidos-de-venta",
    "#clientes",
    "#productos",
    "#documentos",
  ],
  purchases: [
    "#compras",
    "#proveedores",
    "#ordenes-de-compra",
  ],
  inventory: ["#inventario", "#almacenes", "#kardex", "#inventario-fisico", "#productos"],
  finance: ["#dashboard", "#finanzas", "#cuentas", "#conciliacion", "#documentos", "#reportes"],
  viewer: [
    "#dashboard",
    "#ventas",
    "#pos",
    "#compras",
    "#proveedores",
    "#inventario",
    "#almacenes",
    "#kardex",
    "#inventario-fisico",
    "#productos",
    "#documentos",
    "#cuentas",
    "#reportes",
  ],
};

export function isKnownRole(value: string | null): value is RoleCode {
  return value !== null && Object.hasOwn(modulesByRole, value);
}

export function canAccessModule(role: string | null, href: string) {
  if (!isKnownRole(role)) return false;
  const modules = modulesByRole[role];
  return modules.includes("*") || modules.includes(href);
}

export function defaultModuleFor(role: string | null) {
  if (!isKnownRole(role)) return null;
  const modules = modulesByRole[role];
  return modules.includes("*") ? "#dashboard" : modules[0] ?? null;
}
