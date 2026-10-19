import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bot, CircleAlert, History, LoaderCircle, MessageSquarePlus, SendHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, apiFetch } from "../lib/api";
import { type RoleCode } from "../lib/roleAccess";

type Message = { id: string; role: "assistant" | "user"; content: string };
type ChatResponse = { answer?: string; output?: string; message?: string };
type Conversation = { id: string; title: string; preview?: string | null; created_at: string; updated_at: string };
type ConversationDetail = Conversation & { messages: Message[] };

const suggestionsByRole: Record<RoleCode, readonly string[]> = {
  owner: ["Resume las ventas recientes", "Explícame el inventario", "¿Qué reportes puedo consultar?"],
  admin: ["Resume las ventas recientes", "Explícame el inventario", "¿Qué reportes puedo consultar?"],
  sales: ["¿Qué puedo hacer en Ventas?", "¿Qué productos y precios están disponibles?", "Explícame cómo emitir un comprobante"],
  purchases: ["¿Qué puedo hacer en Compras?", "Muéstrame los proveedores disponibles", "Explícame una orden de compra"],
  inventory: ["Explícame el módulo de Inventario", "¿Cómo consulto el stock de un producto?", "¿Cómo funciona una transferencia entre almacenes?"],
  finance: ["Resume las cuentas por cobrar", "¿Qué reportes puedo consultar?", "Explícame la conciliación bancaria"],
  viewer: ["¿Qué puedo consultar en el ERP?", "Resume las ventas recientes", "¿Qué reportes puedo consultar?"],
};

function responseText(payload: ChatResponse) {
  const response = payload.answer?.trim() || payload.output?.trim() || payload.message?.trim();
  return !response || /field required|validation error|unprocessable entity|asistente no pudo procesar/i.test(response)
    ? "El asistente está temporalmente en mantenimiento. Inténtalo más tarde."
    : response;
}

function serviceMessage(cause: unknown) {
  if (cause instanceof ApiError && (cause.status === 422 || cause.status === 503 || (cause.status ?? 0) >= 500)) {
    return "El asistente está temporalmente en mantenimiento. Tu consulta quedó guardada en este chat.";
  }
  return cause instanceof Error ? cause.message : "No se pudo contactar al asistente. Tu consulta quedó guardada en este chat.";
}

function welcomeMessage(tenantName: string): Message {
  return { id: "welcome", role: "assistant", content: `Hola, soy el asistente de ${tenantName}. Puedo orientarte sobre los módulos y la información operativa disponible.` };
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(new Date(value));
}

export function AssistantChat({ isOpen, onClose, tenantName, roleCode }: { isOpen: boolean; onClose: () => void; tenantName: string; roleCode: RoleCode | null }) {
  const { session, tenantId } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => [welcomeMessage(tenantName)]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = async () => {
    if (!session || !tenantId) return;
    try {
      const items = await apiFetch<Conversation[]>("/rag/conversations", { accessToken: session.access_token, tenantId });
      setConversations(items);
      setHistoryError("");
    } catch {
      setHistoryError("No se pudo cargar el historial de chats.");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadConversations();
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen, session?.access_token, tenantId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && isOpen) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([welcomeMessage(tenantName)]);
    setDraft("");
    setShowHistory(false);
    setHistoryError("");
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const openConversation = async (conversationId: string) => {
    if (!session || !tenantId || isSending) return;
    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const conversation = await apiFetch<ConversationDetail>(`/rag/conversations/${conversationId}`, { accessToken: session.access_token, tenantId });
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages.length ? conversation.messages : [welcomeMessage(tenantName)]);
      setShowHistory(false);
    } catch {
      setHistoryError("No se pudo abrir este chat. Inténtalo nuevamente.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const deleteConversation = async (conversation: Conversation) => {
    if (!session || !tenantId || !window.confirm(`¿Eliminar el chat “${conversation.title}”?`)) return;
    try {
      await apiFetch<void>(`/rag/conversations/${conversation.id}`, { method: "DELETE", accessToken: session.access_token, tenantId });
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (activeConversationId === conversation.id) startNewChat();
    } catch {
      setHistoryError("No se pudo eliminar el chat. Inténtalo nuevamente.");
    }
  };

  const ensureConversation = async (firstMessage: string) => {
    if (activeConversationId) return activeConversationId;
    if (!session || !tenantId) return null;
    const conversation = await apiFetch<Conversation>("/rag/conversations", {
      method: "POST", accessToken: session.access_token, tenantId, body: JSON.stringify({ title: firstMessage }),
    });
    setActiveConversationId(conversation.id);
    setConversations((current) => [conversation, ...current].slice(0, 5));
    return conversation.id;
  };

  const send = async (message: string) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isSending || !session || !tenantId) return;
    setDraft("");
    setIsSending(true);
    setHistoryError("");
    try {
      const conversationId = await ensureConversation(cleanMessage);
      if (!conversationId) return;
      setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: cleanMessage }]);
      const payload = await apiFetch<ChatResponse>("/rag/chat", {
        method: "POST", accessToken: session.access_token, tenantId, body: JSON.stringify({ message: cleanMessage, conversation_id: conversationId }),
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: responseText(payload) }]);
      void loadConversations();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) setHistoryError("Ya tienes 5 chats. Elimina uno desde Historial para iniciar otro.");
      else {
        setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "assistant", content: serviceMessage(cause) }]);
        void loadConversations();
      }
    } finally {
      setIsSending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void send(draft); };

  return <>
    {isOpen && <button className="assistant-backdrop" type="button" aria-label="Cerrar asistente" onClick={onClose} />}
    <aside id="erp-assistant" className={`assistant-drawer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen} aria-label="Asistente EnterpriseCloud">
      <header className="assistant-header">
        <span className="assistant-orb"><Bot size={21} /></span>
        <div className="assistant-heading"><p>ASISTENTE ENTERPRISECLOUD</p><h2>{showHistory ? "Historial de chats" : "¿En qué puedo ayudarte?"}</h2></div>
        <div className="assistant-header-actions">
          <button className="assistant-icon-button" type="button" onClick={startNewChat} aria-label="Nuevo chat" title="Nuevo chat"><MessageSquarePlus size={18} /></button>
          <button className={`assistant-icon-button ${showHistory ? "is-active" : ""}`} type="button" onClick={() => setShowHistory((current) => !current)} aria-label="Ver historial de chats" title="Historial de chats"><History size={18} /></button>
          <button className="assistant-close" type="button" onClick={onClose} aria-label="Cerrar asistente"><X size={20} /></button>
        </div>
      </header>
      {showHistory ? <section className="assistant-history" aria-label="Historial de conversaciones">
        <div className="assistant-history-intro"><div><p>CONVERSACIONES</p><strong>{conversations.length} de 5 chats disponibles</strong></div><button type="button" onClick={startNewChat}><MessageSquarePlus size={16} /> Nuevo chat</button></div>
        {historyError && <p className="assistant-history-error">{historyError}</p>}
        {isLoadingHistory ? <div className="assistant-history-loading"><LoaderCircle className="spin" size={19} /> Cargando chat…</div> : conversations.length ? <div className="assistant-conversation-list">
          {conversations.map((conversation) => <div className={`assistant-conversation ${conversation.id === activeConversationId ? "is-active" : ""}`} key={conversation.id}>
            <button className="assistant-conversation-open" type="button" onClick={() => void openConversation(conversation.id)}><span><strong>{conversation.title}</strong><small>{conversation.preview || "Sin mensajes todavía"}</small><em>{displayDate(conversation.updated_at)}</em></span></button>
            <button className="assistant-delete-conversation" type="button" onClick={() => void deleteConversation(conversation)} aria-label={`Eliminar ${conversation.title}`} title="Eliminar chat"><Trash2 size={16} /></button>
          </div>)}
        </div> : <div className="assistant-history-empty"><History size={26} /><strong>Aún no tienes chats guardados</strong><p>Inicia uno nuevo y podrás retomarlo desde aquí.</p></div>}
      </section> : <>
        <div className="assistant-scope"><Sparkles size={15} /> Consultas operativas según los módulos autorizados para tu rol.</div>
        {historyError && <div className="assistant-inline-error"><CircleAlert size={15} /> {historyError}</div>}
        <div className="assistant-messages" aria-live="polite" aria-relevant="additions">
          {messages.map((message) => <div className={`assistant-message ${message.role}`} key={message.id}>{message.role === "assistant" && <Bot size={16} aria-hidden="true" />}<p>{message.content}</p></div>)}
          {isSending && <div className="assistant-message assistant is-thinking"><LoaderCircle size={17} className="spin" /><p>Analizando tu consulta…</p></div>}
        </div>
        {messages.length === 1 && !isSending && roleCode && <div className="assistant-suggestions" aria-label="Consultas sugeridas">{suggestionsByRole[roleCode].map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>}
        <form className="assistant-composer" onSubmit={submit}><label className="sr-only" htmlFor="assistant-message">Escribe tu consulta</label><input ref={inputRef} id="assistant-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe una consulta…" maxLength={2000} disabled={isSending} /><button type="submit" disabled={!draft.trim() || isSending} aria-label="Enviar consulta" title="Enviar consulta">{isSending ? <LoaderCircle size={18} className="spin" /> : <SendHorizontal size={18} />}</button></form>
        <p className="assistant-footnote"><CircleAlert size={13} /> No reemplaza las validaciones contables ni ejecuta cambios.</p>
      </>}
    </aside>
  </>;
}
