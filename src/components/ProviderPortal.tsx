import { useEffect, useMemo, useState } from "react";
import { Building2, CircleAlert, Power, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { LoginPage } from "./LoginPage";

type PlatformTenant = {
  id: string;
  name: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  active_members: number;
};

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

export function ProviderPortal() {
  const { session, signOut } = useAuth();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setTenants(await apiFetch<PlatformTenant[]>("/platform/tenants", { accessToken: session.access_token }));
    } catch (cause) {
      setTenants([]);
      setError(cause instanceof Error ? cause.message : "No se pudo validar el acceso de proveedor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [session?.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = useMemo(() => tenants.filter((tenant) => tenant.is_active).length, [tenants]);
  const memberCount = useMemo(() => tenants.reduce((sum, tenant) => sum + tenant.active_members, 0), [tenants]);
  const updateStatus = async (tenant: PlatformTenant) => {
    if (!session) return;
    setUpdating(tenant.id);
    setError(null);
    try {
      const updated = await apiFetch<PlatformTenant>(`/platform/tenants/${tenant.id}`, {
        accessToken: session.access_token,
        method: "PATCH",
        body: JSON.stringify({ is_active: !tenant.is_active }),
      });
      setTenants((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la empresa.");
    } finally {
      setUpdating(null);
    }
  };

  if (!session) return <LoginPage providerAccess />;
  const isUnauthorized = Boolean(error) && tenants.length === 0;
  return (
    <main className="provider-page">
      <header className="provider-topbar">
        <div className="provider-brand"><span className="brand-mark"><span /></span><span>enterprise<span>cloud</span></span></div>
        <span className="provider-badge"><ShieldCheck size={16} /> Proveedor autorizado</span>
        <button className="secondary-button" type="button" onClick={() => void signOut()}>Cerrar sesión</button>
      </header>
      <section className="provider-content">
        <header className="provider-heading">
          <div><p className="eyebrow">GESTIÓN GLOBAL</p><h1>Clientes EnterpriseCloud</h1><p>Supervisa las empresas registradas y controla su disponibilidad operativa.</p></div>
          <button className="secondary-button" type="button" disabled={loading} onClick={() => void load()}><RefreshCw className={loading ? "spin" : ""} size={16} /> Actualizar</button>
        </header>
        {isUnauthorized ? <section className="provider-access-denied"><CircleAlert size={30} /><h2>Acceso no autorizado</h2><p>{error}</p><small>La cuenta debe estar incluida en la configuración privada del proveedor antes de poder ver empresas.</small></section> : <>
          <section className="provider-metrics">
            <article><Building2 size={21} /><span><small>EMPRESAS</small><strong>{loading ? "—" : tenants.length}</strong></span></article>
            <article><ShieldCheck size={21} /><span><small>ACTIVAS</small><strong>{loading ? "—" : activeCount}</strong></span></article>
            <article><UsersRound size={21} /><span><small>USUARIOS ACTIVOS</small><strong>{loading ? "—" : memberCount}</strong></span></article>
          </section>
          {error && <div className="module-error provider-error">{error}<button type="button" onClick={() => void load()}>Reintentar</button></div>}
          <section className="panel provider-table-panel">
            <div className="panel-header"><div><p className="card-label">CARTERA DE CLIENTES</p><h2>Empresas registradas</h2></div><span>{tenants.length} cliente{tenants.length === 1 ? "" : "s"}</span></div>
            {loading ? <div className="module-state">Cargando empresas…</div> : tenants.length === 0 ? <div className="module-state"><Building2 size={27} /><strong>No hay empresas registradas</strong><span>Las nuevas organizaciones aparecerán aquí.</span></div> : <div className="table-wrap"><table className="provider-table"><thead><tr><th>EMPRESA</th><th>ZONA HORARIA</th><th>USUARIOS</th><th>ALTA</th><th>ESTADO</th><th aria-label="Acción" /></tr></thead><tbody>{tenants.map((tenant) => <tr key={tenant.id}><td><strong>{tenant.name}</strong><small>{tenant.id}</small></td><td>{tenant.timezone}</td><td>{tenant.active_members}</td><td>{dateFormat.format(new Date(tenant.created_at))}</td><td><span className={`status-pill ${tenant.is_active ? "active" : "inactive"}`}>{tenant.is_active ? "Activa" : "Suspendida"}</span></td><td><button className="table-action-button" type="button" disabled={updating !== null} onClick={() => void updateStatus(tenant)}>{updating === tenant.id ? <RefreshCw className="spin" size={15} /> : <Power size={15} />}{tenant.is_active ? "Suspender" : "Activar"}</button></td></tr>)}</tbody></table></div>}
          </section>
        </>}
      </section>
    </main>
  );
}
