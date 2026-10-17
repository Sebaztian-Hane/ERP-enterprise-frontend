const baseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl) {
    throw new Error("Configura VITE_API_URL para conectar el backend.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) throw new Error(`Error de API: ${response.status}`);
  return response.json() as Promise<T>;
}
