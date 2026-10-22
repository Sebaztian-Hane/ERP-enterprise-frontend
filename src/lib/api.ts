// Se puede sobrescribir en Vercel con VITE_API_URL por ambiente.
// El valor público permite que el despliegue estándar funcione sin configuración manual.
const baseUrl = (
  import.meta.env.VITE_API_URL ??
  "https://erp-enterprisecloud-api.onrender.com/api/v1"
).replace(/\/$/, "");

export type ApiOptions = RequestInit & { accessToken?: string; tenantId?: string };

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

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // All supported browsers provide crypto.randomUUID. This fallback preserves a
  // safe-enough unique key for an older embedded browser without sending a
  // predictable counter to a financial endpoint.
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("-");
}

/**
 * Submit a command once and retry only when the browser received no HTTP
 * response. The same key is retained so the API can replay the original result
 * rather than applying a duplicate sale or payment.
 */
export async function postIdempotent<T>(
  path: string,
  options: ApiOptions,
): Promise<T> {
  const idempotencyKey = createIdempotencyKey();
  const request: ApiOptions = {
    ...options,
    method: "POST",
    headers: {
      ...options.headers,
      "Idempotency-Key": idempotencyKey,
    },
  };
  try {
    return await apiFetch<T>(path, request);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === undefined) {
      return apiFetch<T>(path, request);
    }
    throw cause;
  }
}
