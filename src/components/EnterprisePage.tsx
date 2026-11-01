import { type FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, FileText, History, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";
import { AREA_LINKS, ENTERPRISE_AREAS, optionLabels, stateLabels, type BusinessRecord, type BusinessResource, type EnterpriseCatalog } from "../lib/enterprise";
import { type PageMeta, TablePagination } from "../lib/pagination";
import { canAccessModule, isProfileModuleAvailable } from "../lib/roleAccess";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";
import { EnterpriseFields } from "./EnterpriseFields";

type Page = { records: BusinessRecord[]; meta: PageMeta };
const emptyPage: Page = { records: [], meta: { page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false } };
const clean = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined));

export function EnterprisePage({ view, resourceCode, goBack }: { view: string; resourceCode?: string; goBack: () => void }) {
  const { session, tenantId, roleCode, access, tenants } = useAuth();
  const area = ENTERPRISE_AREAS.find((item) => item.href === view);
  const catalogQuery = useWorkspaceQuery("enterprise-catalog", (options) => apiFetch<EnterpriseCatalog>("/enterprise/catalog", options));
  const resources = catalogQuery.data?.resources.filter((item) => item.module === area?.code && (!resourceCode || item.code === resourceCode)) ?? [];
  const [selected, setSelected] = useState("");
  const resource = resources.find((item) => item.code === selected) ?? resources[0];
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ kind: "create" | "view" | "edit" | "transition"; record?: BusinessRecord; state?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [query]);
  const listing = useWorkspaceQuery(`enterprise-list:${resource?.code}:${page}:${search}:${catalogQuery.data?.ready}`, (options) => resource && catalogQuery.data?.ready ? apiFetch<Page>(`/enterprise/${resource.code}/records?page=${page}&q=${encodeURIComponent(search)}`, options) : Promise.resolve(emptyPage));
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const profile = tenants.find((item) => item.id === tenantId)?.business_profile;
  const links = resourceCode ? [] : (AREA_LINKS[area?.code ?? ""] ?? []).filter((item) => canAccessModule(roleCode, item.href, access) && isProfileModuleAvailable(profile, item.href));
  const open = async (item: BusinessRecord, kind: "view" | "edit" | "transition", state?: string) => {
    setBusy(true); setError(null);
    try { const record = await apiFetch<BusinessRecord>(`/enterprise/records/${item.id}`, options); setModal({ kind, record, state }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir el documento."); }
    finally { setBusy(false); }
  };
  const saved = () => { setModal(null); setNotice("Operación registrada. Consulta el historial del documento para verificarla."); listing.refresh(); };
  return <section className="module-page enterprise-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Volver al módulo</button><p className="eyebrow">{area?.short} · GESTIÓN EMPRESARIAL</p><h1>{resourceCode ? resource?.label ?? "Transacción" : area?.label ?? "Gestión empresarial"}</h1><p className="subtitle">Documentos con origen, estados, responsable e historial por empresa.</p></div><div className="heading-actions"><button className="secondary-button" disabled={busy} onClick={() => { catalogQuery.refresh(); listing.refresh(); }}><RefreshCw size={16} /> Actualizar</button>{resource?.access.write && catalogQuery.data?.ready && <button className="primary-button" disabled={busy} onClick={() => setModal({ kind: "create" })}><Plus size={16} /> Nuevo registro</button>}</div></div>
    {links.length > 0 && <nav className="enterprise-links" aria-label="Procesos relacionados">{links.map((link) => <a className="secondary-button" href={link.href} key={link.href}>{link.label}</a>)}</nav>}
    {catalogQuery.loading && !catalogQuery.data ? <div className="module-state"><LoaderCircle className="spin" /> Consultando procesos…</div> : catalogQuery.error ? <div className="module-error" role="alert">{catalogQuery.error}<button onClick={catalogQuery.refresh}>Reintentar</button></div> : <>
      {!catalogQuery.data?.ready && <article className="enterprise-activation panel"><AlertTriangle size={22} /><div><strong>Activación de tablas pendiente</strong><p>El proceso está implementado. Para registrar documentos, ejecuta <code>0065_enterprise_modules.sql</code> del backend en Supabase y pulsa Actualizar. Los módulos existentes continúan operativos.</p></div></article>}
      {!resourceCode && <div className="data-object-tabs" role="group" aria-label="Transacciones del módulo">{resources.map((item) => <button key={item.code} className={resource?.code === item.code ? "selected" : ""} aria-pressed={resource?.code === item.code} onClick={() => { setSelected(item.code); setPage(1); setQuery(""); setNotice(null); }}>{item.label}</button>)}</div>}
      {resource ? <>
        <article className="panel data-flow-intro"><div><small>ORIGEN</small><strong>{resource.origin}</strong></div><span aria-hidden="true">→</span><div><small>RESULTADO</small><strong>{resource.outcome}</strong></div><span className="status-pill active">{resource.access.write ? "Gestión" : "Consulta"}</span></article>
        <p className="migration-help enterprise-scope">{resource.limitation}</p>
        {(error || listing.error) && <div className="module-error" role="alert">{error ?? listing.error}<button onClick={listing.refresh}>Actualizar consulta</button></div>}
        {notice && <p className="module-notice" role="status">{notice}</p>}
        <article className="panel customers-panel enterprise-register"><div className="customers-toolbar"><label className="search customer-search"><Search size={17} /><input aria-label="Buscar documentos" placeholder="Buscar por código o descripción" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{listing.data?.meta.total ?? 0} documentos · {resource.label}</span></div>{listing.loading && !listing.data ? <div className="module-state"><LoaderCircle className="spin" /> Cargando…</div> : <div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>ESTADO</th>{resource.fields.filter((item) => ["number", "integer", "date", "select"].includes(item.kind)).slice(0, 3).map((field) => <th key={field.key}>{field.label}</th>)}<th>OPERACIONES</th></tr></thead><tbody>{listing.data?.records.length ? listing.data.records.map((item) => <tr key={item.id}><td><strong>{item.number}</strong><small className="table-secondary">Versión {item.version}</small></td><td>{item.title}</td><td><span className={`status-pill ${["active", "approved", "completed", "closed", "delivered", "selected", "won"].includes(item.status) ? "active" : ["cancelled", "rejected", "lost"].includes(item.status) ? "inactive" : "pending"}`}>{stateLabels[item.status] ?? item.status}</span></td>{resource.fields.filter((field) => ["number", "integer", "date", "select"].includes(field.kind)).slice(0, 3).map((field) => <td key={field.key}>{optionLabels[String(item.data[field.key])] ?? String(item.data[field.key] ?? "—")}</td>)}<td><div className="enterprise-row-actions"><button className="text-button" disabled={busy} onClick={() => void open(item, "view")}><History size={14} /> Ver / historial</button>{resource.access.write && resource.editable.includes(item.status) && <button className="text-button" disabled={busy} onClick={() => void open(item, "edit")}>Editar</button>}{resource.access.write && (resource.transitions[item.status] ?? []).filter((state) => !resource.approvals.includes(state) || resource.access.approve).map((state) => <button key={state} className="text-button" disabled={busy} onClick={() => void open(item, "transition", state)}>{stateLabels[state] ?? state}</button>)}</div></td></tr>) : <tr><td colSpan={7}><div className="enterprise-empty"><FileText size={25} /><strong>{catalogQuery.data?.ready ? "Todavía no hay documentos" : "Registro listo para habilitar"}</strong><span>{catalogQuery.data?.ready ? "Registra el primer documento para iniciar su recorrido." : "La carga se habilita al ejecutar la migración indicada."}</span></div></td></tr>}</tbody></table></div>}{listing.data && <TablePagination meta={listing.data.meta} onPageChange={setPage} label="documentos" />}</article>
      </> : <div className="module-state">No hay transacciones habilitadas para tu acceso.</div>}
    </>}
    {modal && resource && <EnterpriseDocument key={`${modal.kind}:${modal.record?.id}:${modal.state}`} resource={resource} modal={modal} onClose={() => setModal(null)} onSaved={saved} />}
  </section>;
}

function EnterpriseDocument({ resource, modal, onClose, onSaved }: { resource: BusinessResource; modal: { kind: "create" | "view" | "edit" | "transition"; record?: BusinessRecord; state?: string }; onClose: () => void; onSaved: () => void }) {
  const { session, tenantId } = useAuth();
  const [number, setNumber] = useState(modal.record?.number ?? "");
  const [title, setTitle] = useState(modal.record?.title ?? "");
  const [values, setValues] = useState<Record<string, unknown>>(modal.kind === "transition" ? Object.fromEntries((resource.completion[modal.state ?? ""] ?? []).map((key) => [key, modal.record?.data[key] ?? ""])) : modal.record?.data ?? {});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readonly = modal.kind === "view";
  const closingFields = resource.fields.filter((field) => (resource.completion[modal.state ?? ""] ?? []).includes(field.key)).map((field) => ({ ...field, required: true }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || readonly) return;
    setBusy(true); setError(null);
    const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
    try {
      if (modal.kind === "transition") await postIdempotent(`/enterprise/records/${modal.record!.id}/transition`, { ...options, body: JSON.stringify({ version: modal.record!.version, to_state: modal.state, note, completion: clean(values) }) });
      else await postIdempotent(modal.kind === "create" ? `/enterprise/${resource.code}/records` : `/enterprise/records/${modal.record!.id}/edit`, { ...options, body: JSON.stringify({ number, title, data: clean(values), ...(modal.record ? { version: modal.record.version } : {}) }) });
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el documento."); }
    finally { setBusy(false); }
  };
  return <div className="modal-layer"><section className="customer-modal enterprise-modal" role="dialog" aria-modal="true" aria-label={`${resource.label}: ${modal.kind === "transition" ? stateLabels[modal.state!] : readonly ? "Consulta" : "Registro"}`}><div className="modal-header"><div><p className="eyebrow">{resource.label}</p><h2>{modal.kind === "transition" ? `${stateLabels[modal.state!]} · ${number}` : readonly ? `${number} · ${stateLabels[modal.record!.status]}` : modal.kind === "create" ? "Nuevo documento" : "Editar borrador"}</h2></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div><form className="customer-form" onSubmit={submit}>
    {modal.kind === "transition" ? <>
      <p>Origen: <strong>{stateLabels[modal.record!.status]}</strong> → Resultado: <strong>{stateLabels[modal.state!]}</strong>.</p>
      {resource.approvals.includes(modal.state!) && <p className="enterprise-approval-note">Requiere verificación en dos pasos y una persona distinta del creador. La decisión queda en el historial.</p>}
      <EnterpriseFields resource={resource.code} fields={closingFields} values={values} onChange={setValues} disabled={busy} />
      <label>Motivo / evidencia de la operación<textarea required minLength={3} maxLength={2000} value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} /></label>
    </> : <>
      <div className="form-grid"><label>Código / número<input required maxLength={40} value={number} disabled={readonly || busy} onChange={(event) => setNumber(event.target.value)} /></label><label>Nombre o descripción<input required minLength={2} maxLength={160} value={title} disabled={readonly || busy} onChange={(event) => setTitle(event.target.value)} /></label></div>
      <EnterpriseFields resource={resource.code} fields={resource.fields} values={values} onChange={setValues} disabled={readonly || busy} />
    </>}
    {error && <p className="login-error" role="alert">{error}</p>}
    {readonly && modal.record?.derived.requirements && <article className="enterprise-derived"><h3>Necesidades calculadas al liberar</h3><p>Versión de estructura y cantidades conservadas para esta orden.</p><table><thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>{modal.record.derived.requirements.map((line) => <tr key={line.product_id}><td>{line.sku} · {line.name}</td><td>{line.quantity}</td><td>{line.unit}</td></tr>)}</tbody></table></article>}
    {readonly && <section className="enterprise-history"><h3>Historial verificable</h3>{modal.record?.history?.map((event) => <article key={event.version}><strong>Versión {event.version} · {event.from_state ? stateLabels[event.from_state] : "Alta"} → {stateLabels[event.to_state]}</strong><time>{new Date(event.created_at).toLocaleString("es-PE")}</time><p>{event.note}</p><small>SHA-256: {event.content_hash}</small></article>)}</section>}
    <div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>{readonly ? "Cerrar consulta" : "Cancelar"}</button>{!readonly && <button className="primary-button" disabled={busy}>{busy ? "Registrando…" : modal.kind === "transition" ? "Confirmar operación" : "Guardar documento"}</button>}</div>
  </form></section></div>;
}
