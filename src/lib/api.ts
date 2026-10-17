// Se puede sobrescribir en Vercel con VITE_API_URL por ambiente.
// El valor público permite que el despliegue estándar funcione sin configuración manual.
const baseUrl = (
  import.meta.env.VITE_API_URL ?? "https://erp-enterprisecloud-api.onrender.com/api/v1"
).replace(/\/$/, "");

type ApiOptions = RequestInit & { accessToken?: string; tenantId?: string };

export async function apiFetch<T>(path: string, { accessToken, tenantId, ...init }: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Error de API: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
