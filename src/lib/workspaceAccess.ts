import { ApiError, apiFetch, type ApiOptions } from "./api";
import type { RoleCode, WorkspaceAccess } from "./roleAccess";

export async function fetchWorkspaceAccess(options: ApiOptions): Promise<{ role_code: RoleCode; access: WorkspaceAccess | null }> {
  try {
    const access = await apiFetch<WorkspaceAccess>("/auth/access", options);
    return { role_code: access.role_code, access };
  } catch (cause) {
    // Only an older API (404) may fall back. An authorization failure must
    // never be mistaken for an unsupported capability.
    if (!(cause instanceof ApiError) || cause.status !== 404) throw cause;
    const actor = await apiFetch<{ role_code: RoleCode }>("/auth/me", options);
    return { role_code: actor.role_code, access: null };
  }
}
