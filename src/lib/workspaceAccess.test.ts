import { afterEach, expect, it, vi } from "vitest";
import { fetchWorkspaceAccess } from "./workspaceAccess";

afterEach(() => vi.unstubAllGlobals());
it("falls back to the established role endpoint only for an older API", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 404 })).mockResolvedValueOnce(new Response('{"role_code":"viewer"}'));
  vi.stubGlobal("fetch", fetch);
  await expect(fetchWorkspaceAccess({ tenantId: "a" })).resolves.toEqual({ role_code: "viewer", access: null });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("never falls back after an authorization rejection", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  await expect(fetchWorkspaceAccess({ tenantId: "a" })).rejects.toMatchObject({ status: 403 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
