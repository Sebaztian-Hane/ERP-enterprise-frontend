import { ENTERPRISE_AREAS, SPECIALIZED_ROLE_MODULE, type SpecializedRole } from "./enterprise";

export type RoleCode =
  | "owner"
  | "admin"
  | "sales"
  | "purchases"
  | "finance"
  | "inventory"
  | "viewer" | SpecializedRole;

export type WorkspaceAccess = { role_code: RoleCode; permissions: string[]; modules: Record<string, boolean> };
export type BusinessProfile = "retail" | "wholesale" | "hybrid";

const moduleCodes: Record<string, string> = {
  "#dashboard": "reports", "#ventas": "sales", "#pos": "pos", "#cotizaciones": "quotes",
  "#pedidos-de-venta": "sales_orders", "#clientes": "customers", "#compras": "purchases",
  "#proveedores": "suppliers", "#ordenes-de-compra": "purchase_orders", "#inventario": "inventory",
  "#almacenes": "inventory", "#kardex": "inventory", "#inventario-fisico": "inventory",
  "#productos": "products", "#finanzas": "finance", "#cuentas": "finance",
  "#conciliacion": "reconciliation", "#reportes": "reports", "#configuracion": "operations",
  "#control-operativo": "operations", "#administracion": "administration", "#documentos": "documents",
  "#contabilidad": "operations", "#aprobaciones": "operations", "#flujo-de-caja": "finance",
  "#disponibilidad": "inventory", "#valoracion": "inventory",
};

export function isProfileModuleAvailable(profile: BusinessProfile | undefined, href: string) {
  return !(profile === "retail" && ["#cotizaciones", "#pedidos-de-venta"].includes(href)) && !(profile === "wholesale" && href === "#pos");
}

// These routes mirror the API permissions. The browser uses this only to
// tailor the workspace; every write and read remains enforced by the API.
const modulesByRole: Record<RoleCode, readonly string[]> = {
  owner: ["*"],
  admin: ["*"],
  hr: ["#hcm"], maintenance: ["#pm"], transport: ["#tm"], production: ["#pp"], quality: ["#qm"], projects: ["#ps"],
  controller: ["#co"], assets: ["#aa"], crm: ["#crm"], safety: ["#ehs"], service: ["#cs"],
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
    "#productos",
  ],
  inventory: ["#inventario", "#almacenes", "#kardex", "#inventario-fisico", "#productos", "#disponibilidad", "#valoracion"],
  finance: ["#dashboard", "#finanzas", "#cuentas", "#conciliacion", "#documentos", "#reportes", "#contabilidad", "#aprobaciones", "#flujo-de-caja"],
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
    "#contabilidad", "#disponibilidad", "#valoracion",
  ],
};

export function isKnownRole(value: string | null): value is RoleCode {
  return value !== null && Object.hasOwn(modulesByRole, value);
}

export function canAccessModule(role: string | null, href: string, access?: WorkspaceAccess | null) {
  if (!isKnownRole(role)) return false;
  if (["#administracion", "#configuracion", "#centro-de-datos", "#control-operativo"].includes(href) && role !== "owner") return false;
  if (href === "#guia") return true;
  const area = ENTERPRISE_AREAS.find((item) => item.href === href);
  if (area) {
    if (access) return access.role_code === role && access.modules[area.code] === true && (access.permissions.includes("*") || access.permissions.includes(`${area.code}:read`));
    if (role === "owner" || role === "admin") return true;
    if (role in SPECIALIZED_ROLE_MODULE) return SPECIALIZED_ROLE_MODULE[role as SpecializedRole] === area.code;
    const fallback: Record<string, string[]> = { sales: ["sales"], purchases: ["purchases"], inventory: ["inventory"], finance: [], viewer: ENTERPRISE_AREAS.filter((item) => !["hcm", "safety"].includes(item.code)).map((item) => item.code) };
    return fallback[role]?.includes(area.code) ?? false;
  }
  const modules = modulesByRole[role];
  if (!(modules.includes("*") || modules.includes(href))) return false;
  if (!access) return true; // Compatibility with servers before /auth/access.
  if (access.role_code !== role) return false;
  if (href === "#centro-de-datos") return ["products", "customers", "suppliers", "operations", ...ENTERPRISE_AREAS.map((item) => item.code)].some((code) => access.modules[code] === true);
  const parents: Record<string, string> = { customers: "sales", quotes: "sales", sales_orders: "sales", pos: "sales", suppliers: "purchases", purchase_orders: "purchases", reconciliation: "finance" };
  const parent = parents[moduleCodes[href]];
  if (parent && access.modules[parent] !== true) return false;
  return moduleCodes[href] ? access.modules[moduleCodes[href]] === true : false;
}

export function defaultModuleFor(role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  if (!isKnownRole(role)) return null;
  const modules = modulesByRole[role];
  const candidates = modules.includes("*") ? ["#dashboard", ...Object.keys(moduleCodes)] : modules;
  return candidates.find((href) => canAccessModule(role, href, access) && isProfileModuleAvailable(profile, href)) ?? "#guia";
}
