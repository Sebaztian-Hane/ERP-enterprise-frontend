import { useEffect, useState } from "react";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type SystemNotification = {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  module: string;
  is_read: boolean;
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

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const openNotification = async (notification: SystemNotification) => {
    if (!notification.is_read && session && tenantId) {
      try {
        await apiFetch<SystemNotification>(`/notifications/${encodeURIComponent(notification.id)}/read`, {
          method: "POST", accessToken: session.access_token, tenantId,
        });
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      } catch (cause) {
        setError(detail(cause));
      }
    }
    window.location.hash = destinationByModule[notification.module] ?? "#inicio";
    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    if (!session || !tenantId || !unreadCount) return;
    setIsLoading(true); setError(null);
    try {
      const updated = await apiFetch<SystemNotification[]>("/notifications/read-all", {
        method: "POST", accessToken: session.access_token, tenantId,
      });
      setNotifications(updated);
    } catch (cause) {
      setError(detail(cause));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="notifications-menu">
      <button
        className="icon-button notification-trigger"
        type="button"
        aria-label={unreadCount ? `Abrir ${unreadCount} notificaciones sin leer` : "Abrir notificaciones del sistema"}
        aria-expanded={isOpen}
        aria-controls="system-notifications"
        title="Notificaciones del sistema"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={20} />
        {unreadCount > 0 && <i />}
      </button>
      {isOpen && (
        <section className="notifications-panel" id="system-notifications" aria-label="Notificaciones del sistema">
          <header className="notifications-header">
            <div>
              <p>OPERACIÓN ACTIVA</p>
              <h2>Notificaciones</h2>
            </div>
            <div>
              {unreadCount > 0 && <button className="notifications-read-all" type="button" onClick={() => void markAllAsRead()} disabled={isLoading}><CheckCheck size={15} /> Marcar leídas</button>}
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
                  className={`notification-row ${notification.severity} ${notification.is_read ? "is-read" : "is-unread"}`}
                  key={notification.id}
                  type="button"
                  onClick={() => void openNotification(notification)}
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
