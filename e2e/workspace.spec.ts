import { expect, test, type Page } from "@playwright/test";
import { ENTERPRISE_AREAS, SPECIALIZED_ROLE_MODULE, type BusinessRecord, type BusinessResource } from "../src/lib/enterprise";
import type { RoleCode } from "../src/lib/roleAccess";
import type { MigrationProject } from "../src/lib/migrationProjects";

type Role = RoleCode;
const tenant = { id: "00000000-0000-0000-0000-000000000002", name: "DUNS - Evaluación ERP", timezone: "America/Lima", business_profile: "hybrid" };
const user = { id: "00000000-0000-0000-0000-000000000001", email: "operator@example.test", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { full_name: "Operador de pruebas" }, created_at: "2026-01-01T00:00:00Z", factors: [] };
const product = { id: "00000000-0000-0000-0000-000000000003", sku: "MAT-001", name: "Material de pruebas", unit_code: "NIU", unit_id: "00000000-0000-0000-0000-000000000005", unit_name: "Unidad", unit: "NIU", category_id: null, sale_price: "100.00", average_cost: "80.00", tracking_mode: "none", cost_method: "weighted_average", is_active: true };
const warehouse = { id: "00000000-0000-0000-0000-000000000004", code: "ALM-01", name: "Almacén de pruebas" };
const columns = ["sku", "name", "category", "unit", "sale_price", "average_cost", "tracking_mode", "cost_method", "is_active", "description", "material_type", "barcode", "brand", "manufacturer", "manufacturer_part_number", "net_weight", "gross_weight", "weight_unit", "country_of_origin", "hs_code", "lead_time_days", "minimum_order_quantity", "reorder_point", "safety_stock", "storage_conditions"];

const equipment: BusinessResource = {
  code: "equipment", module: "maintenance", label: "Equipos técnicos", origin: "Equipo y ubicación", outcome: "Equipo habilitado para mantenimiento", initial: "draft", editable: ["draft"], approvals: [], completion: {}, limitation: "Documento operativo con historial.", access: { read: true, write: true, approve: true },
  transitions: { draft: ["active", "cancelled"], active: ["inactive"], inactive: ["active"] },
  fields: [{ key: "location", label: "Ubicación", kind: "text", required: true, choices: [], reference: null, minimum: null, maximum: null }, { key: "criticality", label: "Criticidad", kind: "select", required: true, choices: ["low", "medium", "high"], reference: null, minimum: null, maximum: null }],
};

async function bootstrap(page: Page, role: Role, disabled: string[] = [], enterpriseReady = true) {
  const requests: { path: string; method: string; idempotency?: string; body: string | null }[] = [];
  const documents: BusinessRecord[] = [];
  let migration: MigrationProject | null = null;
  const migrationObjects = [
    { code: "units", module: "products", label: "Unidades de medida", columns: ["code", "name"], dependencies: [] },
    { code: "products", module: "products", label: "Materiales y productos", columns, dependencies: ["units"] },
    { code: "employees", module: "hcm", label: "Empleados", columns: ["number", "title"], dependencies: [] },
  ].filter((item) => !disabled.includes(item.module)).map((item) => ({ ...item, effect: "Crea registros maestros", schema_ready: true, blocked_dependencies: [] }));
  const migrationGroups = [{ code: "base", label: "Maestros comunes", objects: ["products"] }, ...(!disabled.includes("hcm") ? [{ code: "hcm", label: "HCM · Personas y organización", objects: ["employees"] }] : [])];
  await page.addInitScript(({ tenant, user }) => {
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access_token = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", aal: "aal2", exp, iat: exp - 3600 })}.${encode("test-only-signature")}`;
    localStorage.setItem("sb-tufvaozdbbhdiiyrxtlh-auth-token", JSON.stringify({ access_token, refresh_token: "test-only-refresh", token_type: "bearer", expires_in: 3600, expires_at: exp, user }));
    localStorage.setItem("enterprisecloud.activeTenantId", tenant.id);
  }, { tenant, user });
  const modules = Object.fromEntries(["sales", "pos", "customers", "quotes", "sales_orders", "purchases", "suppliers", "purchase_orders", "inventory", "products", "finance", "reconciliation", "documents", "reports", "operations", "administration", ...ENTERPRISE_AREAS.map((area) => area.code)].map((code) => [code, !disabled.includes(code)]));
  const specialized = SPECIALIZED_ROLE_MODULE[role as keyof typeof SPECIALIZED_ROLE_MODULE];
  const permissions = specialized ? ["read", "write", "approve"].map((action) => `${specialized}:${action}`) : role === "owner" || role === "admin" ? ["*"] : role === "inventory" ? ["inventory:read", "inventory:write", "products:read", "products:write"] : role === "viewer" ? ["inventory:read", "products:read", "accounting:read"] : role === "finance" ? ["treasury:read", "accounting:read", "approvals:read"] : ["products:read"];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    if (url.pathname.startsWith("/auth/v1/")) return route.fulfill({ json: url.pathname.endsWith("/user") ? user : {} });
    if (!url.pathname.startsWith("/api/v1/")) return route.abort();
    const path = url.pathname.replace("/api/v1", "");
    requests.push({ path, method: route.request().method(), idempotency: route.request().headers()["idempotency-key"], body: route.request().postData() });
    let payload: unknown = [];
    if (path === "/auth/tenants") payload = [tenant];
    else if (path === "/auth/access") payload = { role_code: role, permissions, modules };
    else if (path === "/auth/me") payload = { role_code: role };
    else if (path === "/migration-projects/catalog") payload = { ready: true, migration: "0066_migration_projects.sql", objects: migrationObjects, groups: migrationGroups };
    else if (path === "/migration-projects") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        migration = { id: body.request_id, name: body.name, groups: body.groups, status: "draft", version: 1, created_by: user.id, created_at: new Date().toISOString(), simulation: {}, receipt: {}, objects: migrationObjects.filter((item) => body.groups.includes(item.module === "hcm" ? "hcm" : "base")).map((item) => ({ code: item.code, filename: null, rows: 0, file_sha256: null, status: "empty" })) };
        payload = migration;
      } else payload = { ready: true, projects: migration ? [{ ...migration, object_count: migration.objects.length }] : [] };
    }
    else if (path.startsWith("/migration-projects/") && migration) {
      if (path.endsWith("/file")) {
        const code = path.split("/").at(-2);
        const item = migration.objects.find((item) => item.code === code)!;
        item.filename = `${code}.csv`; item.rows = 1; item.status = "uploaded"; item.file_sha256 = "a".repeat(64);
        migration.version++; migration.simulation = {}; migration.status = "uploaded";
      } else if (path.endsWith("/simulate")) {
        for (const item of migration.objects.filter((item) => item.filename)) { item.status = "ready"; item.report = { rows: 1, created: 1, reused: 0, status: "ready", errors: [] }; }
        migration.version++; migration.status = "ready"; migration.simulation = { can_commit: true, digest: "a".repeat(64), total_created: 1, total_rows: 1, objects: Object.fromEntries(migration.objects.filter((item) => item.report).map((item) => [item.code, item.report!])) };
      } else if (path.endsWith("/commit")) {
        migration.status = "migrated"; migration.version++; migration.receipt = { digest: "a".repeat(64), total_created: 1 }; migration.objects.forEach((item) => { if (item.filename) item.status = "migrated"; });
      }
      payload = migration;
    }
    else if (path === "/enterprise/catalog") payload = { ready: enterpriseReady, migration: "0065_enterprise_modules.sql", areas: [], resources: [equipment] };
    else if (path === "/enterprise/equipment/records") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        const row: BusinessRecord = { ...body, id: `equipment-${documents.length + 1}`, resource_code: "equipment", module_code: "maintenance", status: "draft", version: 1, derived: {}, created_by: user.id, updated_at: new Date().toISOString(), history: [{ version: 1, action: "create", from_state: null, to_state: "draft", note: "Alta del documento", created_at: new Date().toISOString(), content_hash: "a".repeat(64) }] };
        documents.push(row); payload = row;
      } else payload = { records: documents, meta: { page: 1, page_size: 25, total: documents.length, total_pages: 1, has_previous: false, has_next: false } };
    }
    else if (path.startsWith("/enterprise/records/")) {
      const row = documents.find((item) => path.includes(item.id))!;
      if (path.endsWith("/transition")) {
        const body = route.request().postDataJSON();
        const previous = row.status; row.status = body.to_state; row.version += 1;
        row.history?.push({ version: row.version, action: "transition", from_state: previous, to_state: row.status, note: body.note, created_at: new Date().toISOString(), content_hash: "b".repeat(64) });
      }
      payload = row;
    }
    else if (path === "/products") payload = url.searchParams.has("page") ? { products: [product], meta: { page: 1, page_size: 25, total: 1, total_pages: 1, has_previous: false, has_next: false } } : [product];
    else if (path === "/products/units") payload = [{ id: product.unit_id, code: "NIU", name: "Unidad", is_active: true }];
    else if (path.endsWith("/material-profile")) payload = { attributes: {}, fields: [{ key: "barcode", group: "Identificación", description: "Código de barras como texto." }] };
    else if (path === "/inventory/warehouses") payload = [warehouse];
    else if (path === "/operations/inventory/availability") payload = [{ id: "position-1", product_id: product.id, warehouse_id: warehouse.id, on_hand: "10", reserved_quantity: "2", available_quantity: "8" }];
    else if (path === "/operations/inventory/valuation") payload = [{ product_id: product.id, sku: product.sku, name: product.name, quantity: "10", average_cost: "80.00", inventory_value: "800.00" }];
    else if (path === "/operations/finance/cash-flow") payload = [{ id: "cash-1", code: "CAJA-01", name: "Caja operativa", currency: "PEN", balance: "120.00", month_inflow: "150.00", month_outflow: "30.00" }];
    else if (path === "/operations/finance/aging") payload = [{ id: "invoice-1", kind: "receivable", due_date: "2026-10-01", balance_amount: "100", overdue_days: 31, aging_status: "overdue" }];
    else if (path === "/imports/templates") payload = [{ module: "products", label: "Materiales y productos", columns, example: columns.map(() => ""), version: "2.0", download_url: "/imports/products/template", export_url: "/imports/products/export", fields: [{ key: "barcode", group: "Identificación", required: false, description: "Código de barras como texto." }] }];
    else if (path === "/imports/products/preview") payload = { valid_rows: 1, errors: [], conflicts: [], can_commit: true, sample: [{ sku: product.sku, name: product.name, material_profile: { barcode: "000123" } }], file_sha256: "a".repeat(64) };
    else if (path === "/imports/products/commit") payload = { imported: 1, file_sha256: "a".repeat(64) };
    return route.fulfill({ json: payload });
  });
  return requests;
}

for (const role of ["owner", "admin", "sales", "purchases", "finance", "inventory", "viewer"] as Role[]) {
  test(`launcher respects ${role} access`, async ({ page }) => {
    await bootstrap(page, role);
    await page.goto("/#guia");
    await expect(page.getByRole("heading", { name: "Cómo usar EnterpriseCloud" })).toBeVisible();
    await page.getByRole("button", { name: "Aplicaciones", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Aplicaciones de EnterpriseCloud" });
    await expect(dialog.getByRole("button", { name: /Guía de uso/ })).toBeVisible();
    const hasCash = ["owner", "admin", "finance"].includes(role);
    await expect(dialog.getByRole("button", { name: /Flujo de caja/ })).toHaveCount(hasCash ? 1 : 0);
    const hasStock = ["owner", "admin", "inventory", "viewer"].includes(role);
    await expect(dialog.getByRole("button", { name: /Disponibilidad y reservas/ })).toHaveCount(hasStock ? 1 : 0);
  });
}

test("company restrictions remove inventory modules even for an owner", async ({ page }) => {
  await bootstrap(page, "owner", ["inventory"]);
  await page.goto("/#guia");
  await page.getByRole("button", { name: "Aplicaciones", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /Disponibilidad y reservas/ })).toHaveCount(0);
});

async function createMigration(page: Page) {
  await page.goto("/#centro-de-datos");
  await page.getByRole("button", { name: "Crear grupo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Crear grupo de migraci\u00f3n" });
  await dialog.getByLabel("Nombre del grupo").fill("Evaluaci\u00f3n de materiales");
  await dialog.getByLabel(/Maestros comunes/).check();
  await expect(dialog.getByText(/2 plantillas asignadas/)).toBeVisible();
  await dialog.getByRole("button", { name: "Crear grupo", exact: true }).click();
  await expect(page.getByText(/25 columnas/)).toBeVisible();
}

test("migration group stages, simulates and requires the final checkbox", async ({ page }) => {
  const requests = await bootstrap(page, "owner");
  await createMigration(page);
  await page.getByRole("button", { name: "Acciones \u00b7 Materiales y productos" }).click();
  await page.getByRole("menuitem", { name: "Cargar archivo", exact: true }).click();
  await page.getByLabel("Archivo de migraci\u00f3n").setInputFiles({ name: "products.csv", mimeType: "text/csv", buffer: Buffer.from("sku,name,unit,sale_price,average_cost\nMAT-001,Material,NIU,100,80") });
  await expect(page.getByText("products.csv", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Simular grupo", exact: true }).click();
  await page.getByRole("button", { name: "Revisar y confirmar grupo" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmaci\u00f3n final de migraci\u00f3n" });
  await expect(dialog.getByRole("button", { name: "Confirmar carga completa" })).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Confirmar carga completa" }).click();
  await expect(page.getByText(/Migraci\u00f3n completada: 1/)).toBeVisible();
  const commit = requests.find((request) => request.path.endsWith("/commit"));
  expect(commit?.idempotency).toBeTruthy();
  expect(JSON.parse(commit?.body ?? "{}")).toMatchObject({ confirmed: true, digest: "a".repeat(64) });
  await page.screenshot({ path: "test-results/migration-group-desktop.png", fullPage: true });
});

test("inventory can reserve while viewers only consult", async ({ page }) => {
  const requests = await bootstrap(page, "inventory");
  await page.goto("/#disponibilidad");
  await page.getByRole("button", { name: "Reservar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Reservar disponibilidad" });
  await dialog.getByLabel("Cantidad").fill("2");
  await dialog.getByLabel("Referencia de la necesidad").fill("NEC-001");
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByRole("status")).toContainText("Reserva registrada");
  const command = requests.find((request) => request.path === "/operations/inventory/reservations" && request.method === "POST");
  expect(command?.idempotency).toBeTruthy();
  expect(JSON.parse(command?.body ?? "{}").reference_type).toBe("manual");
});

test("viewer has no inventory mutation and purchases has read-only material fields", async ({ page }) => {
  await bootstrap(page, "viewer");
  await page.goto("/#disponibilidad");
  await expect(page.getByRole("cell", { name: /MAT-001/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reservar", exact: true })).toHaveCount(0);
});

test("purchases can consult materials without seeing write controls", async ({ page }) => {
  await bootstrap(page, "purchases");
  await page.goto("/#productos");
  await expect(page.getByRole("button", { name: "Nuevo producto" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver producto", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ver producto" });
  await expect(dialog.getByLabel("SKU", { exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
});

test("new screens render on desktop and mobile without horizontal overflow", async ({ page }) => {
  await bootstrap(page, "owner");
  await page.goto("/#flujo-de-caja");
  await expect(page.getByRole("heading", { name: "Flujo de caja", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CAJA-01" })).toBeVisible();
  await page.screenshot({ path: "test-results/cash-flow-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#guia");
  await expect(page.getByRole("heading", { name: "Cómo usar EnterpriseCloud" })).toBeVisible();
  await page.screenshot({ path: "test-results/help-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("data center remains usable in dark mode on mobile", async ({ page }) => {
  await bootstrap(page, "owner");
  await page.addInitScript(() => localStorage.setItem("enterprisecloud.theme", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#centro-de-datos");
  await expect(page.getByRole("heading", { name: "Centro de migraciones" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await createMigration(page);
  await page.getByRole("button", { name: "Acciones \u00b7 Materiales y productos" }).click();
  await expect(page.getByRole("menuitem", { name: "Descargar plantilla Excel" })).toBeVisible();
  await page.evaluate(() => window.scrollBy(0, window.scrollY > 20 ? -20 : 20));
  await expect(page.getByRole("menuitem", { name: "Descargar plantilla Excel" })).toBeVisible();
  await page.screenshot({ path: "test-results/data-center-mobile-dark.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("value help opens over a transaction and preserves values on cancellation", async ({ page }) => {
  await bootstrap(page, "owner");
  await page.goto("/#inventario");
  await page.getByRole("button", { name: "Ajustar stock" }).click();
  const transaction = page.getByRole("dialog", { name: "Ajustar existencia" });
  await transaction.getByRole("button", { name: "Entradas posibles: Producto", exact: true }).click();
  const help = page.getByRole("dialog", { name: "Entradas posibles: Producto", exact: true });
  await expect(help.getByRole("cell", { name: "MAT-001", exact: true })).toBeVisible();
  await help.getByRole("radio").check();
  await page.screenshot({ path: "test-results/value-help-dialog.png", fullPage: true });
  await help.getByRole("button", { name: "Seleccionar", exact: true }).click();
  await expect(transaction.getByRole("combobox", { name: "Producto", exact: true })).toHaveValue("Material de pruebas");
  await transaction.getByRole("button", { name: "Entradas posibles: Producto", exact: true }).click();
  await help.getByRole("searchbox").fill("no coincide");
  await help.getByRole("button", { name: "Cancelar" }).click();
  await expect(transaction.getByRole("combobox", { name: "Producto", exact: true })).toHaveValue("Material de pruebas");
  await expect(transaction).toBeVisible();
});

test("migration creation uses only assigned modules and business pages have no import button", async ({ page }) => {
  await bootstrap(page, "owner", ["hcm"]);
  await page.goto("/#centro-de-datos");
  await page.getByRole("button", { name: "Crear grupo", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox", { name: /HCM/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  for (const route of ["productos", "clientes", "proveedores", "inventario", "almacenes", "compras", "ventas"]) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("button", { name: /^Migrar/ })).toHaveCount(0);
  }
});

test("owner sees all fourteen new business areas with intact accents", async ({ page }) => {
  await bootstrap(page, "owner");
  await page.goto("/#guia");
  await page.getByRole("button", { name: "Aplicaciones", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Aplicaciones de EnterpriseCloud" });
  for (const area of ENTERPRISE_AREAS) await expect(dialog.getByRole("button", { name: new RegExp(`${area.short} · ${area.label}`) })).toBeVisible();
  expect(await page.locator("body").innerText()).toContain("Evaluación ERP");
  expect(await page.locator("body").innerText()).not.toMatch(/Evaluaci\?n|\ufffd|\u00c3\u00b3/);
});

for (const role of Object.keys(SPECIALIZED_ROLE_MODULE) as Role[]) {
  test(`business panel limits ${role} to its assigned specialty`, async ({ page }) => {
    await bootstrap(page, role);
    await page.goto("/#guia");
    await page.getByRole("button", { name: "Aplicaciones", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Aplicaciones de EnterpriseCloud" });
    for (const area of ENTERPRISE_AREAS) {
      await expect(dialog.getByRole("button", { name: new RegExp(`${area.short} · ${area.label}`) })).toHaveCount(area.code === SPECIALIZED_ROLE_MODULE[role as keyof typeof SPECIALIZED_ROLE_MODULE] ? 1 : 0);
    }
  });
}

test("PM creates a document, transitions it and displays the persisted accented history", async ({ page }) => {
  const requests = await bootstrap(page, "maintenance");
  await page.goto("/#pm");
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  let dialog = page.getByRole("dialog", { name: "Equipos técnicos: Registro" });
  await dialog.getByLabel("Código / número").fill("EQ-001");
  await dialog.getByLabel("Nombre o descripción").fill("Evaluación de estación ñ");
  await dialog.getByLabel("Ubicación").fill("Área de producción");
  await dialog.getByLabel("Criticidad").selectOption("high");
  await dialog.getByRole("button", { name: "Guardar documento" }).click();
  await expect(page.getByRole("cell", { name: "Evaluación de estación ñ", exact: true })).toBeVisible();
  const command = requests.find((item) => item.method === "POST" && item.path === "/enterprise/equipment/records");
  expect(command?.idempotency).toBeTruthy();
  expect(JSON.parse(command?.body ?? "{}").data.location).toBe("Área de producción");
  await page.getByRole("button", { name: "Activo", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Equipos técnicos: Activo" });
  await dialog.getByLabel("Motivo / evidencia de la operación").fill("Revisión técnica y habilitación");
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();
  await expect(page.getByRole("cell", { name: "Activo", exact: true })).toBeVisible();
  const transition = requests.find((item) => item.path.endsWith("/transition"));
  expect(JSON.parse(transition?.body ?? "{}").version).toBe(1);
  expect(transition?.idempotency).toBeTruthy();
  await page.getByRole("button", { name: "Ver / historial" }).click();
  await expect(page.getByText("Revisión técnica y habilitación", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historial verificable" })).toBeVisible();
  await page.screenshot({ path: "test-results/pm-document-history.png", fullPage: true });
});

test("pending schema gives an actionable activation message and disables mutations", async ({ page }) => {
  const requests = await bootstrap(page, "owner", [], false);
  await page.goto("/#pm");
  await expect(page.getByText("Activación de tablas pendiente", { exact: true })).toBeVisible();
  await expect(page.getByText("0065_enterprise_modules.sql", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo registro" })).toHaveCount(0);
  expect(requests.some((item) => item.path === "/enterprise/equipment/records")).toBe(false);
});

test("enterprise screens keep readable controls and fit a mobile viewport", async ({ page }) => {
  await bootstrap(page, "maintenance");
  await page.addInitScript(() => localStorage.setItem("enterprisecloud.theme", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#pm");
  await expect(page.getByRole("heading", { name: "Mantenimiento", exact: true })).toBeVisible();
  const add = page.getByRole("button", { name: "Nuevo registro" });
  expect(await add.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  await add.click();
  await expect(page.getByRole("dialog").getByLabel("Ubicación")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/pm-mobile-dark.png", fullPage: true });
});
