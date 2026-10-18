// Se puede sobrescribir en Vercel con VITE_API_URL por ambiente.
// El valor público permite que el despliegue estándar funcione sin configuración manual.
const baseUrl = (
  import.meta.env.VITE_API_URL ??
  "https://erp-enterprisecloud-api.onrender.com/api/v1"
).replace(/\/$/, "");

type ApiOptions = RequestInit & { accessToken?: string; tenantId?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(detail: unknown, status: number) {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }
        return null;
      })
      .filter(Boolean);
    if (messages.length) return messages.join(". ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String(detail.message);
  }
  if (status === 401)
    return "Tu sesión no es válida o expiró. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (status === 404) return "No se encontró el recurso solicitado.";
  return `No se pudo completar la operación (HTTP ${status}).`;
}

export async function apiFetch<T>(
  path: string,
  { accessToken, tenantId, ...init }: ApiOptions = {},
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    throw new ApiError(
      errorMessage(payload?.detail, response.status),
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
