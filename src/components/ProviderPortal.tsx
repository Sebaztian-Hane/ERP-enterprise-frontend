import { useEffect, useMemo, useState } from "react";
import { Building2, CircleAlert, Power, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { LoginPage } from "./LoginPage";

type BusinessProfile = "retail" | "wholesale" | "hybrid";

type PlatformTenant = {
  id: string;
  name: string;
  timezone: string;
  business_profile: BusinessProfile;
  is_active: boolean;
  created_at: string;
  active_members: number;
};
type Access = { business_profile: BusinessProfile; modules: Array<{ code: string; label: string; is_enabled: boolean; is_available: boolean }>; members: Array<{ id: string; user_id: string; role_code: string; is_active: boolean; overrides: Record<string, boolean> }> };
type APISunatCredentialStatus = { legal_entity_id: string; issuer_ruc: string; invoice_series: string; receipt_series: string; is_configured: boolean; source: string };

const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const BUSINESS_PROFILES: Array<{ value: BusinessProfile; label: string; description: string }> = [
  { value: "retail", label: "Minorista", description: "Venta ágil, caja y POS" },
  { value: "wholesale", label: "Mayorista", description: "Cotizaciones, pedidos y crédito" },
  { value: "hybrid", label: "Híbrida", description: "Ambos canales comerciales" },
];
const profileLabel = (profile: BusinessProfile) => BUSINESS_PROFILES.find((item) => item.value === profile)?.label ?? profile;

export function ProviderPortal() {
  const { session, signOut } = useAuth();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [access, setAccess] = useState<Access | null>(null);
  const [cpeCredentials, setCpeCredentials] = useState<APISunatCredentialStatus[]>([]);
  const [newTenantOpen, setNewTenantOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", timezone: "America/Mexico_City", business_profile: "hybrid" as BusinessProfile, owner_email: "", temporary_password: "", issuer_ruc: "", fiscal_address: "", apisunat_persona_id: "", apisunat_persona_token: "", apisunat_invoice_series: "F001", apisunat_receipt_series: "B001" });
  const [credentialForm, setCredentialForm] = useState({ legal_entity_id: "", persona_id: "", persona_token: "", invoice_series: "F001", receipt_series: "B001" });

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
  useEffect(() => { if (!selectedTenant && tenants[0]) setSelectedTenant(tenants[0].id); }, [tenants, selectedTenant]);
  useEffect(() => { if (!session || !selectedTenant) return; void apiFetch<Access>(`/platform/tenants/${selectedTenant}/module-access`, { accessToken: session.access_token }).then(setAccess).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar los módulos.")); }, [session?.access_token, selectedTenant]);
  useEffect(() => { if (!session || !selectedTenant) return; void apiFetch<APISunatCredentialStatus[]>(`/platform/tenants/${selectedTenant}/apisunat`, { accessToken: session.access_token }).then((items) => { setCpeCredentials(items); const current = items[0]; setCredentialForm((form) => ({ ...form, legal_entity_id: current?.legal_entity_id ?? "", invoice_series: current?.invoice_series ?? "F001", receipt_series: current?.receipt_series ?? "B001" })); }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración fiscal.")); }, [session?.access_token, selectedTenant]);

  const activeCount = useMemo(() => tenants.filter((tenant) => tenant.is_active).length, [tenants]);
  const memberCount = useMemo(() => tenants.reduce((sum, tenant) => sum + tenant.active_members, 0), [tenants]);
  const updateTenant = async (tenant: PlatformTenant, change: Partial<Pick<PlatformTenant, "is_active" | "business_profile">>) => {
    if (!session) return;
    setUpdating(tenant.id);
    setError(null);
    try {
      const updated = await apiFetch<PlatformTenant>(`/platform/tenants/${tenant.id}`, {
        accessToken: session.access_token,
        method: "PATCH",
        body: JSON.stringify({ is_active: tenant.is_active, ...change }),
      });
      setTenants((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (updated.id === selectedTenant) {
        setAccess(await apiFetch<Access>(`/platform/tenants/${updated.id}/module-access`, { accessToken: session.access_token }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la empresa.");
    } finally {
      setUpdating(null);
    }
  };
  const updateStatus = async (tenant: PlatformTenant) => updateTenant(tenant, { is_active: !tenant.is_active });
  const toggle = async (path: string, module_code: string, is_enabled: boolean) => { if (!session) return; setUpdating(`${path}:${module_code}`); try { await apiFetch(path, { accessToken: session.access_token, method: "PATCH", body: JSON.stringify({ module_code, is_enabled }) }); if (selectedTenant) setAccess(await apiFetch<Access>(`/platform/tenants/${selectedTenant}/module-access`, { accessToken: session.access_token })); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el acceso."); } finally { setUpdating(null); } };
  const createTenant = async (event: React.FormEvent) => { event.preventDefault(); if (!session) return; setUpdating("create"); try { const created = await apiFetch<PlatformTenant>("/platform/tenants", { accessToken: session.access_token, method: "POST", body: JSON.stringify(newTenant) }); setTenants((current) => [created, ...current]); setSelectedTenant(created.id); setNewTenantOpen(false); setNewTenant({ name: "", timezone: "America/Mexico_City", business_profile: "hybrid", owner_email: "", temporary_password: "", issuer_ruc: "", fiscal_address: "", apisunat_persona_id: "", apisunat_persona_token: "", apisunat_invoice_series: "F001", apisunat_receipt_series: "B001" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la empresa."); } finally { setUpdating(null); } };
  const saveCpeCredentials = async (event: React.FormEvent) => { event.preventDefault(); if (!session || !selectedTenant) return; setUpdating("cpe"); setError(null); try { const saved = await apiFetch<APISunatCredentialStatus>(`/platform/tenants/${selectedTenant}/apisunat`, { accessToken: session.access_token, method: "PUT", body: JSON.stringify(credentialForm) }); setCpeCredentials((current) => current.map((item) => item.legal_entity_id === saved.legal_entity_id ? saved : item)); setCredentialForm((form) => ({ ...form, persona_token: "" })); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la credencial fiscal."); } finally { setUpdating(null); } };

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
          <span className="provider-heading-actions"><button className="secondary-button" type="button" onClick={() => setNewTenantOpen(true)}>Nueva empresa</button><button className="secondary-button" type="button" disabled={loading} onClick={() => void load()}><RefreshCw className={loading ? "spin" : ""} size={16} /> Actualizar</button></span>
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
            {loading ? <div className="module-state">Cargando empresas…</div> : tenants.length === 0 ? <div className="module-state"><Building2 size={27} /><strong>No hay empresas registradas</strong><span>Las nuevas organizaciones aparecerán aquí.</span></div> : <div className="table-wrap"><table className="provider-table"><thead><tr><th>EMPRESA</th><th>PERFIL</th><th>ZONA HORARIA</th><th>USUARIOS</th><th>ALTA</th><th>ESTADO</th><th aria-label="Acción" /></tr></thead><tbody>{tenants.map((tenant) => <tr key={tenant.id}><td><strong>{tenant.name}</strong><small>{tenant.id}</small></td><td>{profileLabel(tenant.business_profile)}</td><td>{tenant.timezone}</td><td>{tenant.active_members}</td><td>{dateFormat.format(new Date(tenant.created_at))}</td><td><span className={`status-pill ${tenant.is_active ? "active" : "inactive"}`}>{tenant.is_active ? "Activa" : "Suspendida"}</span></td><td><button className="table-action-button" type="button" disabled={updating !== null} onClick={() => void updateStatus(tenant)}>{updating === tenant.id ? <RefreshCw className="spin" size={15} /> : <Power size={15} />}{tenant.is_active ? "Suspender" : "Activar"}</button></td></tr>)}</tbody></table></div>}
          </section>
          <section className="panel provider-access-panel"><div className="panel-header"><div><p className="card-label">ADMINISTRACIÓN DE MÓDULOS</p><h2>Acceso por empresa y usuario</h2></div><select value={selectedTenant} onChange={(event) => setSelectedTenant(event.target.value)}>{tenants.map((tenant) => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select></div>{access && <><fieldset className="business-profile-picker"><legend>Perfil comercial</legend><p>Define el flujo principal de esta empresa. Los módulos no aplicables quedan bloqueados también en la API.</p><div role="radiogroup" aria-label="Perfil comercial">{BUSINESS_PROFILES.map((profile) => <label key={profile.value} className={access.business_profile === profile.value ? "selected" : ""}><input type="radio" name="business-profile" value={profile.value} checked={access.business_profile === profile.value} disabled={updating !== null} onChange={() => { const tenant = tenants.find((item) => item.id === selectedTenant); if (tenant) void updateTenant(tenant, { business_profile: profile.value }); }} /><strong>{profile.label}</strong><small>{profile.description}</small></label>)}</div></fieldset><div className="module-switches">{access.modules.map((module) => <label key={module.code} className={module.is_available ? "" : "unavailable"}><span><strong>{module.label}</strong><small>{module.is_available ? module.code : "No aplica al perfil"}</small></span><input type="checkbox" checked={module.is_enabled} disabled={updating !== null || !module.is_available} onChange={(event) => void toggle(`/platform/tenants/${selectedTenant}/modules`, module.code, event.target.checked)} /></label>)}</div><div className="member-module-list">{access.members.map((member) => <article key={member.id}><header><strong>{member.role_code}</strong><small>{member.user_id}</small></header><div>{access.modules.map((module) => <label key={module.code} className={module.is_available ? "" : "unavailable"}><input type="checkbox" disabled={!module.is_enabled || !module.is_available || updating !== null} checked={member.overrides[module.code] ?? module.is_enabled} onChange={(event) => void toggle(`/platform/tenants/${selectedTenant}/members/${member.id}/modules`, module.code, event.target.checked)} /> {module.label}</label>)}</div></article>)}</div></>}</section>
          <section className="panel provider-access-panel"><div className="panel-header"><div><p className="card-label">FACTURACIÓN ELECTRÓNICA</p><h2>Credenciales APISUNAT por entidad legal</h2></div></div><p className="panel-copy">Cada RUC se vincula con su propia empresa registrada en APISUNAT. El token se cifra en el servidor y nunca se vuelve a mostrar.</p>{cpeCredentials.map((item) => <div className="credential-status" key={item.legal_entity_id}><strong>RUC {item.issuer_ruc}</strong><span className={`status-pill ${item.is_configured ? "active" : "inactive"}`}>{item.is_configured ? "Configurada" : "Pendiente"}</span><small>Series: {item.invoice_series} / {item.receipt_series}</small></div>)}<form className="customer-form credential-form" onSubmit={saveCpeCredentials}><label>Entidad legal<select required value={credentialForm.legal_entity_id} onChange={(event) => { const item = cpeCredentials.find((credential) => credential.legal_entity_id === event.target.value); setCredentialForm({ ...credentialForm, legal_entity_id: event.target.value, invoice_series: item?.invoice_series ?? "F001", receipt_series: item?.receipt_series ?? "B001" }); }}>{cpeCredentials.map((item) => <option key={item.legal_entity_id} value={item.legal_entity_id}>RUC {item.issuer_ruc}</option>)}</select></label><label>Persona ID APISUNAT<input required value={credentialForm.persona_id} onChange={(event) => setCredentialForm({ ...credentialForm, persona_id: event.target.value })} autoComplete="off" /></label><label>Token APISUNAT<input required minLength={12} type="password" value={credentialForm.persona_token} onChange={(event) => setCredentialForm({ ...credentialForm, persona_token: event.target.value })} autoComplete="new-password" /></label><label>Serie factura<input required value={credentialForm.invoice_series} onChange={(event) => setCredentialForm({ ...credentialForm, invoice_series: event.target.value.toUpperCase() })} /></label><label>Serie boleta<input required value={credentialForm.receipt_series} onChange={(event) => setCredentialForm({ ...credentialForm, receipt_series: event.target.value.toUpperCase() })} /></label><button className="primary-button" disabled={!credentialForm.legal_entity_id || updating === "cpe"}>{updating === "cpe" ? "Guardando…" : "Guardar credencial cifrada"}</button></form></section>
          {newTenantOpen && <div className="modal-layer"><section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="new-tenant-title"><div className="modal-header"><div><p className="eyebrow">PROVEEDOR</p><h2 id="new-tenant-title">Nueva empresa</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setNewTenantOpen(false)}>×</button></div><form className="customer-form" onSubmit={createTenant}><label>Razón social<input required value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} /></label><fieldset className="business-profile-picker"><legend>Perfil comercial</legend><p>Se puede cambiar después sin afectar sus datos.</p><div role="radiogroup" aria-label="Perfil comercial de la empresa">{BUSINESS_PROFILES.map((profile) => <label key={profile.value} className={newTenant.business_profile === profile.value ? "selected" : ""}><input type="radio" name="new-business-profile" value={profile.value} checked={newTenant.business_profile === profile.value} onChange={() => setNewTenant({ ...newTenant, business_profile: profile.value })} /><strong>{profile.label}</strong><small>{profile.description}</small></label>)}</div></fieldset><label>RUC emisor (11 dígitos)<input required inputMode="numeric" pattern="\d{11}" value={newTenant.issuer_ruc} onChange={(e) => setNewTenant({ ...newTenant, issuer_ruc: e.target.value.replace(/\D/g, "").slice(0, 11) })} /></label><label>Dirección fiscal<textarea required value={newTenant.fiscal_address} onChange={(e) => setNewTenant({ ...newTenant, fiscal_address: e.target.value })} /></label><label>Persona ID APISUNAT<input required value={newTenant.apisunat_persona_id} onChange={(e) => setNewTenant({ ...newTenant, apisunat_persona_id: e.target.value })} autoComplete="off" /></label><label>Token APISUNAT<input required minLength={12} type="password" value={newTenant.apisunat_persona_token} onChange={(e) => setNewTenant({ ...newTenant, apisunat_persona_token: e.target.value })} autoComplete="new-password" /></label><label>Serie factura<input required value={newTenant.apisunat_invoice_series} onChange={(e) => setNewTenant({ ...newTenant, apisunat_invoice_series: e.target.value.toUpperCase() })} /></label><label>Serie boleta<input required value={newTenant.apisunat_receipt_series} onChange={(e) => setNewTenant({ ...newTenant, apisunat_receipt_series: e.target.value.toUpperCase() })} /></label><label>Zona horaria<input required value={newTenant.timezone} onChange={(e) => setNewTenant({ ...newTenant, timezone: e.target.value })} /></label><label>Correo del propietario<input required type="email" value={newTenant.owner_email} onChange={(e) => setNewTenant({ ...newTenant, owner_email: e.target.value })} /></label><label>Contraseña temporal<input required minLength={12} type="password" value={newTenant.temporary_password} onChange={(e) => setNewTenant({ ...newTenant, temporary_password: e.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setNewTenantOpen(false)}>Cancelar</button><button className="primary-button" disabled={updating === "create"}>{updating === "create" ? "Creando…" : "Crear empresa"}</button></div></form></section></div>}
        </>}
      </section>
    </main>
  );
}
