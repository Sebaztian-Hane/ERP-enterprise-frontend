// Se puede sobrescribir en Vercel con VITE_API_URL por ambiente.
// El valor público permite que el despliegue estándar funcione sin configuración manual.
const baseUrl = (
  import.meta.env.VITE_API_URL ?? "https://erp-enterprisecloud-api.onrender.com/api/v1"
).replace(/\/$/, "");

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) throw new Error(`Error de API: ${response.status}`);
  return response.json() as Promise<T>;
}
