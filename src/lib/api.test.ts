import { afterEach, describe, expect, it, vi } from "vitest";
import { apiDownload, apiFetch, postIdempotent } from "./api";
import { registerActionConfirmation } from "./actionConfirmation";

afterEach(() => vi.unstubAllGlobals());

describe("shared API transport", () => {
  it("preserves auth and tenant scope when downloading a private workbook", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("private-workbook"));
    vi.stubGlobal("fetch", fetch);
    const result = await apiDownload("/imports/products/export", { accessToken: "test-token", tenantId: "company-a" });
    expect(await result.text()).toBe("private-workbook");
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: "Bearer test-token", "X-Tenant-ID": "company-a" });
  });

  it("surfaces authorization failures without creating a download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Sin permiso" }), { status: 403 })));
    await expect(apiDownload("/imports/products/export")).rejects.toMatchObject({ status: 403, message: "Sin permiso" });
  });

  it("retries a lost import response using the same idempotency key and multipart body", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("network lost")).mockResolvedValueOnce(new Response('{"imported":1}'));
    vi.stubGlobal("fetch", fetch);
    const body = new FormData();
    body.append("file", new Blob(["sku,name\nA,B"]), "materials.csv");
    body.append("preview_digest", "a".repeat(64));
    await expect(postIdempotent("/imports/products/commit", { body })).resolves.toEqual({ imported: 1 });
    const first = fetch.mock.calls[0][1];
    const retry = fetch.mock.calls[1][1];
    expect(first.headers["Idempotency-Key"]).toBeTruthy();
    expect(first.headers["Idempotency-Key"]).toBe(retry.headers["Idempotency-Key"]);
    expect(first.headers["Content-Type"]).toBeUndefined();
    expect(retry.body).toBe(body);
  });

  it("never retries validation errors and preserves empty API responses", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"detail":{"message":"Archivo inválido"}}', { status: 422 })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await expect(postIdempotent("/imports/products/commit", { body: new FormData() })).rejects.toMatchObject({ status: 422 });
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(apiFetch("/empty")).resolves.toBeUndefined();
  });

  it("keeps the same command, company and idempotency key after MFA, without caching its proof", async () => {
    const required = () => new Response(JSON.stringify({ detail: { code: "ACTION_CONFIRMATION_REQUIRED", action: "Confirmar carga", message: "Código requerido", challenge: "bound-proof" } }), { status: 403 });
    const fetch = vi.fn().mockResolvedValueOnce(required()).mockResolvedValueOnce(new Response('{"ok":true}')).mockResolvedValueOnce(required()).mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    const confirm = vi.fn().mockResolvedValue("fresh-token");
    const unregister = registerActionConfirmation(confirm);
    try {
      const body = new FormData(); body.append("file", new Blob(["code,name\nA,Name"]), "Datos.csv");
      await postIdempotent("/imports/products/commit", { accessToken: "old-token", tenantId: "company-a", body });
      const original = fetch.mock.calls[0][1], verified = fetch.mock.calls[1][1];
      expect(verified.body).toBe(original.body);
      expect(verified.headers).toMatchObject({ Authorization: "Bearer fresh-token", "X-Tenant-ID": "company-a", "Idempotency-Key": original.headers["Idempotency-Key"], "X-Action-Confirmation": "bound-proof" });
      await postIdempotent("/imports/products/commit", { accessToken: "fresh-token", tenantId: "company-a", body });
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[2][1].headers["X-Action-Confirmation"]).toBeUndefined();
    } finally { unregister(); }
  });

  it("does not retry a cancelled security confirmation", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: { code: "ACTION_CONFIRMATION_REQUIRED", action: "Confirmar carga", message: "Código requerido", challenge: "bound-proof" } }), { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    const unregister = registerActionConfirmation(async () => { throw new Error("Operación cancelada"); });
    try {
      await expect(postIdempotent("/imports/products/commit", { body: new FormData() })).rejects.toThrow("Operación cancelada");
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { unregister(); }
  });
});
