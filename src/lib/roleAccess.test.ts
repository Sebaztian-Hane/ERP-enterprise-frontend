import { describe, expect, it } from "vitest";
import { canAccessModule, defaultModuleFor, isProfileModuleAvailable, type RoleCode, type WorkspaceAccess } from "./roleAccess";

describe("new modules preserve the seven existing roles", () => {
  it.each(["sales", "purchases", "inventory", "viewer"])("does not expose treasury or approvals to %s", (role) => {
    expect(canAccessModule(role, "#flujo-de-caja")).toBe(false);
    expect(canAccessModule(role, "#aprobaciones")).toBe(false);
    expect(canAccessModule(role, "#guia")).toBe(true);
  });
  it("exposes accounting read screens only to their current roles", () => {
    expect(canAccessModule("finance", "#contabilidad")).toBe(true);
    expect(canAccessModule("viewer", "#contabilidad")).toBe(true);
    expect(canAccessModule("inventory", "#contabilidad")).toBe(false);
  });
  it("applies company/user restrictions even to an owner", () => {
    const access: WorkspaceAccess = { role_code: "owner", permissions: ["*"], modules: { inventory: false, products: true } };
    expect(canAccessModule("owner", "#disponibilidad", access)).toBe(false);
    expect(canAccessModule("owner", "#valoracion", access)).toBe(false);
    expect(canAccessModule("owner", "#productos", access)).toBe(true);
    expect(canAccessModule("owner", "#administracion", access)).toBe(false);
  });
  it("does not reuse permissions from another role and finds a valid fallback", () => {
    const access: WorkspaceAccess = { role_code: "inventory", permissions: ["inventory:read"], modules: { inventory: false, products: true } };
    expect(canAccessModule("owner", "#productos", access)).toBe(false);
    expect(defaultModuleFor("inventory", access)).toBe("#productos");
    expect(defaultModuleFor("inventory", { ...access, modules: {} })).toBe("#guia");
  });
  it.each(["owner", "admin", "sales", "purchases", "finance", "inventory", "viewer"] as RoleCode[])("keeps guide accessible to %s", (role) => {
    expect(canAccessModule(role, "#guia")).toBe(true);
  });
  it("preserves retail and wholesale channel restrictions", () => {
    expect(isProfileModuleAvailable("retail", "#pedidos-de-venta")).toBe(false);
    expect(isProfileModuleAvailable("wholesale", "#pos")).toBe(false);
    expect(isProfileModuleAvailable("hybrid", "#pos")).toBe(true);
  });
});
