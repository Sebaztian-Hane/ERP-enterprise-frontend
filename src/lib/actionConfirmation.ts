export type ConfirmationPrompt = { action: string; challenge?: string; expires_in?: number; message: string; tenantId?: string; signal?: AbortSignal };
type Handler = (prompt: ConfirmationPrompt) => Promise<string>;
let handler: Handler | null = null;

export function registerActionConfirmation(next: Handler) {
  handler = next;
  return () => { if (handler === next) handler = null; };
}

export function confirmSensitiveAction(prompt: ConfirmationPrompt): Promise<string> {
  if (!handler) return Promise.reject(new Error("No se pudo abrir la verificación. Actualiza la página e inténtalo de nuevo."));
  return handler(prompt);
}
