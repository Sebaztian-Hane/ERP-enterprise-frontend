// Se puede sobrescribir en Vercel con VITE_API_URL por ambiente.
// El valor público permite que el despliegue estándar funcione sin configuración manual.
const baseUrl = (
  import.meta.env.VITE_API_URL ?? "https://erp-enterprisecloud-api.onrender.com/api/v1"
).replace(/\/$/, "");

type ApiOptions = RequestInit & { accessToken?: string; tenantId?: string };

export async function apiFetch<T>(path: string, { accessToken, tenantId, ...init }: ApiOptions = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((item) => typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)).join(". ") : `Error de API: ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
