import { useEffect, useState } from "react";
import { Bell, CircleAlert, CircleCheck, Info, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type SystemNotification = {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  module: string;
};

const destinationByModule: Record<string, string> = {
  Inventario: "#inventario",
  Finanzas: "#finanzas",
  Conciliación: "#conciliacion",
  Compras: "#ordenes-compra",
  Cotizaciones: "#cotizaciones",
  "Pedidos de venta": "#pedidos-venta",
};

function detail(error: unknown) {
  return error instanceof Error ? error.message : "No se pudieron cargar las alertas.";
}

export function NotificationsMenu() {
  const { session, tenantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!session || !tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      setNotifications(await apiFetch<SystemNotification[]>("/notifications", { accessToken: session.access_token, tenantId }));
    } catch (cause) {
      setError(detail(cause));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // Reloading when the active company or signed-in session changes keeps the bell badge accurate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, tenantId]);

  const iconFor = (severity: SystemNotification["severity"]) => {
    if (severity === "critical") return <CircleAlert size={18} />;
    if (severity === "warning") return <CircleAlert size={18} />;
    return <Info size={18} />;
  };

  return (
    <div className="notifications-menu">
      <button
        className="icon-button notification-trigger"
        type="button"
        aria-label={notifications.length ? `Abrir ${notifications.length} alertas del sistema` : "Abrir notificaciones del sistema"}
        aria-expanded={isOpen}
        aria-controls="system-notifications"
        title="Notificaciones del sistema"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={20} />
        {notifications.length > 0 && <i />}
      </button>
      {isOpen && (
        <section className="notifications-panel" id="system-notifications" aria-label="Notificaciones del sistema">
          <header className="notifications-header">
            <div>
              <p>OPERACIÓN ACTIVA</p>
              <h2>Notificaciones</h2>
            </div>
            <div>
              <button className="notifications-refresh" type="button" onClick={() => void load()} disabled={isLoading} aria-label="Actualizar alertas" title="Actualizar alertas">
                <RefreshCw size={16} className={isLoading ? "spin" : ""} />
              </button>
              <button className="notifications-close" type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar notificaciones">
                <X size={18} />
              </button>
            </div>
          </header>
          <p className="notifications-caption">Alertas relevantes de los módulos a los que tienes acceso.</p>
          <div className="notifications-list" aria-live="polite">
            {isLoading && !notifications.length ? (
              <div className="notifications-state"><LoaderCircle className="spin" size={20} /> Actualizando alertas…</div>
            ) : error ? (
              <div className="notifications-state notification-error"><CircleAlert size={20} /><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <button
                  className={`notification-row ${notification.severity}`}
                  key={notification.id}
                  type="button"
                  onClick={() => { window.location.hash = destinationByModule[notification.module] ?? "#inicio"; setIsOpen(false); }}
                >
                  <span className="notification-severity">{iconFor(notification.severity)}</span>
                  <span><strong>{notification.title}</strong><small>{notification.body}</small><em>{notification.module}</em></span>
                </button>
              ))
            ) : (
              <div className="notifications-state notifications-empty"><CircleCheck size={23} /><strong>Todo está en orden</strong><span>No hay alertas operativas para esta empresa.</span></div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
