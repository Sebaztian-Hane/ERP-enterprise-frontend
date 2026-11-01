import { describe, expect, it } from "vitest";
import { defaultWorkspace, routeAllowed, visibleWorkspaces, workspaceTransactions } from "./workspaceNavigation";
import { WORKSPACE_MODULES, WORKSPACE_TRANSACTIONS } from "./workspaceCatalog";
import { type WorkspaceAccess } from "./roleAccess";

describe("business modules and transactions", () => {
  it.each([["sales", "SD"], ["purchases", "MM"], ["inventory", "WM"], ["finance", "FI"], ["hr", "HCM"], ["maintenance", "PM"], ["production", "PP"], ["quality", "QM"], ["transport", "TM"], ["projects", "PS"], ["controller", "CO"], ["assets", "AA"], ["crm", "CRM"], ["safety", "EHS"], ["service", "CS"]])("%s sees only its business module %s", (role, short) => {
    expect(visibleWorkspaces(role).map(item => item.short)).toEqual([short]);
    expect(defaultWorkspace(role)).toBe(WORKSPACE_MODULES.find(item => item.short === short)?.href);
  });
  it("nests SD transactions and keeps old bookmarks working", () => {
    expect(visibleWorkspaces("owner").filter(item => item.short === "SD")).toHaveLength(1);
    for (const href of ["#sd", "#sd/clientes", "#sd/cotizaciones", "#sd/pedidos", "#sd/ventas", "#ventas", "#clientes"]) expect(routeAllowed(href, "sales")).toBe(true);
    for (const href of ["#pm", "#pm/equipos", "#mm", "#crm", "#cs", "#compras", "#documentos"]) expect(routeAllowed(href, "sales")).toBe(false);
  });
  it("blocks disabled parent modules and personal transactions", () => {
    const access: WorkspaceAccess = { role_code: "sales", permissions: ["sales:read", "customers:read", "products:read"], modules: { sales: false, customers: true, quotes: true, sales_orders: true, products: true } };
    for (const href of ["#sd", "#sd/clientes", "#clientes", "#sd/materiales"]) expect(routeAllowed(href, "sales", access)).toBe(false);
    const restricted = { ...access, modules: { ...access.modules, sales: true, quotes: false } };
    expect(routeAllowed("#sd/cotizaciones", "sales", restricted)).toBe(false);
    expect(routeAllowed("#sd/clientes", "sales", restricted)).toBe(true);
  });
  it("governance is exclusive to the owner even with a wildcard snapshot", () => {
    for (const role of ["admin", "sales", "inventory", "finance", "viewer"] as const) {
      const access: WorkspaceAccess = { role_code: role, permissions: ["*"], modules: { administration: true, operations: true, products: true } };
      for (const href of ["#gobierno", "#gobierno/accesos", "#administracion", "#configuracion", "#centro-de-datos", "#control-operativo"]) expect(routeAllowed(href, role, access)).toBe(false);
    }
    expect(routeAllowed("#gobierno", "owner")).toBe(true);
  });
  it("disabling FI hides its shared reporting and document transactions", () => {
    const access: WorkspaceAccess = { role_code: "finance", permissions: ["reports:read", "documents:read"], modules: { finance: false, reports: true, documents: true, operations: true } };
    expect(visibleWorkspaces("finance", access)).toHaveLength(0);
    for (const route of ["#fi/documentos", "#fi/reportes", "#documentos", "#reportes"]) expect(routeAllowed(route, "finance", access)).toBe(false);
  });
  it("does not duplicate transaction URLs and preserves channel restrictions", () => {
    expect(new Set(WORKSPACE_TRANSACTIONS.map(item => item.href)).size).toBe(WORKSPACE_TRANSACTIONS.length);
    const sd = WORKSPACE_MODULES.find(item => item.short === "SD")!;
    expect(workspaceTransactions(sd, "sales", null, "retail").some(item => item.view === "#cotizaciones")).toBe(false);
    expect(workspaceTransactions(sd, "sales", null, "wholesale").some(item => item.view === "#pos")).toBe(false);
  });
});
