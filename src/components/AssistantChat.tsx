import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  CircleAlert,
  LoaderCircle,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, apiFetch } from "../lib/api";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ChatResponse = {
  answer?: string;
  output?: string;
  message?: string;
};

const suggestions = [
  "¿Qué puedo hacer en Ventas?",
  "Explícame el módulo de Inventario",
  "¿Qué reportes puedo consultar?",
];

function responseText(payload: ChatResponse) {
  const response = payload.answer?.trim() || payload.output?.trim() || payload.message?.trim();
  // A workflow that is being configured can return a raw validation string with HTTP 200.
  // Keep those implementation details out of the ERP interface.
  if (!response || /field required|validation error|unprocessable entity/i.test(response)) {
    return "El asistente está temporalmente en mantenimiento. Inténtalo más tarde.";
  }
  return response;
}

function serviceMessage(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 503) {
    return "El asistente está temporalmente en mantenimiento. Inténtalo más tarde.";
  }
  if (cause instanceof Error) return cause.message;
  return "No se pudo contactar al asistente. Inténtalo nuevamente.";
}

export function AssistantChat({
  isOpen,
  onClose,
  tenantName,
}: {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
}) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hola, soy el asistente de ${tenantName}. Puedo orientarte sobre los módulos y la información operativa disponible.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationId = useRef(
    `erp-web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  const send = async (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isSending || !session) return;

    setDraft("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: cleanMessage },
    ]);

    try {
      const payload = await apiFetch<ChatResponse>("/rag/chat", {
        method: "POST",
        accessToken: session.access_token,
        body: JSON.stringify({
          message: cleanMessage,
          conversation_id: conversationId.current,
        }),
      });
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", content: responseText(payload) },
      ]);
    } catch (cause) {
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: "assistant", content: serviceMessage(cause) },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <>
      {isOpen && <button className="assistant-backdrop" type="button" aria-label="Cerrar asistente" onClick={onClose} />}
      <aside
        id="erp-assistant"
        className={`assistant-drawer ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="Asistente EnterpriseCloud"
      >
        <header className="assistant-header">
          <span className="assistant-orb"><Bot size={21} /></span>
          <div>
            <p>ASISTENTE ENTERPRISECLOUD</p>
            <h2>¿En qué puedo ayudarte?</h2>
          </div>
          <button className="assistant-close" type="button" onClick={onClose} aria-label="Cerrar asistente">
            <X size={20} />
          </button>
        </header>

        <div className="assistant-scope">
          <Sparkles size={15} /> Consultas operativas y ayuda sobre los módulos del ERP.
        </div>

        <div className="assistant-messages" aria-live="polite" aria-relevant="additions">
          {messages.map((message) => (
            <div className={`assistant-message ${message.role}`} key={message.id}>
              {message.role === "assistant" && <Bot size={16} aria-hidden="true" />}
              <p>{message.content}</p>
            </div>
          ))}
          {isSending && (
            <div className="assistant-message assistant is-thinking">
              <LoaderCircle size={17} className="spin" /> <p>Analizando tu consulta…</p>
            </div>
          )}
        </div>

        {messages.length === 1 && !isSending && (
          <div className="assistant-suggestions" aria-label="Consultas sugeridas">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void send(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form className="assistant-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="assistant-message">Escribe tu consulta</label>
          <input
            ref={inputRef}
            id="assistant-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe una consulta…"
            maxLength={2000}
            disabled={isSending}
          />
          <button type="submit" disabled={!draft.trim() || isSending} aria-label="Enviar consulta" title="Enviar consulta">
            {isSending ? <LoaderCircle size={18} className="spin" /> : <SendHorizontal size={18} />}
          </button>
        </form>
        <p className="assistant-footnote"><CircleAlert size={13} /> No reemplaza las validaciones contables ni ejecuta cambios.</p>
      </aside>
    </>
  );
}
