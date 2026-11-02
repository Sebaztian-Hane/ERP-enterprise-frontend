import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

type Tone = "error" | "success" | "info" | "warning";
type Notice = { id: string; text: string; content: ReactNode; tone: Tone; at: number; visible: boolean };
type Service = { publish: (id: string, text: string, content: ReactNode, tone: Tone) => void; openHistory: () => void; count: number };
const Context = createContext<Service | null>(null);
export const useSystemNotifications = () => useContext(Context);

function plain(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? plain(child.props.children) : typeof child === "string" || typeof child === "number" ? String(child) : "").join(" ").trim();
}

/** Render an operation result as a system notification, never as a page banner. */
export function SystemNotice({ children, tone = "error" }: { children: ReactNode; tone?: Tone }) {
  const service = useSystemNotifications();
  const id = useId();
  const text = plain(children);
  const latest = useRef(children);
  latest.current = children;
  const publish = service?.publish;
  useEffect(() => { if (text) publish?.(`${id}:${text}`, text, latest.current, tone); }, [id, text, tone, publish]);
  return null;
}

export function SystemNotificationsProvider({ children }: { children: ReactNode }) {
  const { tenantId, session } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [history, setHistory] = useState(false);
  const scope = `${session?.user.id ?? ""}:${tenantId ?? ""}`;
  const previousScope = useRef(scope);
  useEffect(() => {
    if (previousScope.current !== scope) { setNotices([]); setHistory(false); previousScope.current = scope; }
  }, [scope]);
  const dismiss = useCallback((id: string) => setNotices(current => current.map(item => item.id === id ? { ...item, visible: false } : item)), []);
  const publish = useCallback((id: string, text: string, content: ReactNode, tone: Tone) => {
    setNotices(current => current.some(item => item.id === id || (item.text === text && item.tone === tone && Date.now() - item.at < 1500)) ? current : [...current.slice(-99), { id, text, content, tone, at: Date.now(), visible: true }]);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNotices(current => current.some(item => item.visible && item.tone !== "error" && Date.now() - item.at > 8000) ? current.map(item => item.tone !== "error" && Date.now() - item.at > 8000 ? { ...item, visible: false } : item) : current), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const active = notices.filter(item => item.visible).slice(-3);
  const icon = (tone: Tone) => tone === "success" ? <CheckCircle2 size={21} /> : tone === "error" || tone === "warning" ? <CircleAlert size={21} /> : <Info size={21} />;
  return <Context.Provider value={{ publish, openHistory: () => setHistory(true), count: notices.length }}>{children}{createPortal(<>
    <section className="system-toasts" aria-label="Alertas del sistema">{active.map(item => <article key={item.id} className={`system-toast ${item.tone}`} role={item.tone === "error" ? "alert" : "status"}>{icon(item.tone)}<div><strong>{item.tone === "error" ? "No se completó la operación" : item.tone === "success" ? "Operación completada" : item.tone === "warning" ? "Revisa esta operación" : "Información"}</strong><div className="system-toast-content">{item.content}</div></div><button type="button" aria-label="Cerrar alerta" onClick={() => dismiss(item.id)}><X size={18} /></button></article>)}{active.length > 0 && <button type="button" className="system-alert-history" onClick={() => setHistory(true)}><Bell size={15} /> Ver registro de alertas ({notices.length})</button>}</section>
    {history && <div className="modal-layer system-alert-layer"><section className="customer-modal system-alert-dialog" role="dialog" aria-modal="true" aria-label="Registro de alertas del sistema"><header className="modal-header"><h2>Registro de alertas del sistema</h2><button className="icon-button" type="button" aria-label="Cerrar registro de alertas" onClick={() => setHistory(false)}><X /></button></header><p>Resultados de esta sesión y empresa. Los errores detallados de una migración se conservan en su Registro de validación.</p><div className="system-alert-list">{notices.slice().reverse().map(item => <article className={`system-alert-entry ${item.tone}`} key={item.id}>{icon(item.tone)}<div><time>{new Date(item.at).toLocaleTimeString("es-PE")}</time><p>{item.text}</p></div></article>)}{!notices.length && <p>Aún no hay alertas en esta sesión.</p>}</div><footer className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setNotices([]); setHistory(false); }}>Limpiar registro</button><button type="button" className="primary-button" onClick={() => setHistory(false)}>Cerrar</button></footer></section></div>}
  </>, document.body)}</Context.Provider>;
}
