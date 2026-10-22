import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { Building2, Check, GitBranch, LoaderCircle, Power, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type LegalEntity = {
  id: string;
  code: string;
  legal_name: string;
  trade_name: string | null;
  tax_id: string;
  fiscal_address: string;
  tax_regime: string | null;
  is_default: boolean;
  is_active: boolean;
};

type Branch = {
  id: string;
  legal_entity_id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
};

/** Tax issuer and establishment master data. Branch selection intentionally
 * uses accessible buttons rather than a native select: the list remains
 * readable and does not hide critical legal context in a browser dropdown. */
export function LegalEntityManagement() {
  const { session, tenantId, roleCode } = useAuth();
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [entityForm, setEntityForm] = useState({ code: "", legal_name: "", trade_name: "", tax_id: "", fiscal_address: "", tax_regime: "" });
  const [branchForm, setBranchForm] = useState({ code: "", name: "", address: "" });
  const canWrite = ["owner", "admin"].includes(roleCode ?? "");
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };

  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const [entityRows, branchRows] = await Promise.all([
        apiFetch<LegalEntity[]>("/legal-entities", options),
        apiFetch<Branch[]>("/legal-entities/branches", options),
      ]);
      setEntities(entityRows); setBranches(branchRows);
      setSelectedEntityId((current) => current || entityRows.find((item) => item.is_active)?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar la estructura legal.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const entityById = useMemo(() => new Map(entities.map((item) => [item.id, item])), [entities]);
  const saveEntity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch("/legal-entities", { ...options, method: "POST", body: JSON.stringify({
        ...entityForm,
        trade_name: entityForm.trade_name.trim() || null,
        tax_regime: entityForm.tax_regime.trim() || null,
      }) });
      setEntityForm({ code: "", legal_name: "", trade_name: "", tax_id: "", fiscal_address: "", tax_regime: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la entidad legal."); }
    finally { setSaving(false); }
  };
  const saveBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEntityId) { setError("Selecciona una entidad legal activa antes de crear una sucursal."); return; }
    setSaving(true); setError(null);
    try {
      await apiFetch("/legal-entities/branches", { ...options, method: "POST", body: JSON.stringify({
        ...branchForm, legal_entity_id: selectedEntityId, address: branchForm.address.trim() || null,
      }) });
      setBranchForm({ code: "", name: "", address: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la sucursal."); }
    finally { setSaving(false); }
  };
  const patchEntity = async (entity: LegalEntity, body: Record<string, unknown>) => {
    setSaving(true); setError(null);
    try { await apiFetch(`/legal-entities/${entity.id}`, { ...options, method: "PATCH", body: JSON.stringify(body) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar la entidad legal."); }
    finally { setSaving(false); }
  };
  const patchBranch = async (branch: Branch) => {
    setSaving(true); setError(null);
    try { await apiFetch(`/legal-entities/branches/${branch.id}`, { ...options, method: "PATCH", body: JSON.stringify({ is_active: !branch.is_active }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar la sucursal."); }
    finally { setSaving(false); }
  };

  return <section className="legal-entity-management" aria-labelledby="legal-structure-title">
    <div className="panel-header"><div><p className="card-label">ESTRUCTURA FISCAL Y OPERATIVA</p><h2 id="legal-structure-title">Entidades legales y sucursales</h2><p>Define los emisores tributarios y establecimientos que podrán asociarse a almacenes y documentos.</p></div></div>
    {error && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    <div className="configuration-grid legal-structure-grid">
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">EMISOR TRIBUTARIO</p><h2>Nueva entidad legal</h2></div><Building2 className="muted-icon" size={20} /></div>
        <form className="customer-form config-form" onSubmit={saveEntity}>
          <label>Código<input required disabled={!canWrite || saving} value={entityForm.code} onChange={(event) => setEntityForm((value) => ({ ...value, code: event.target.value }))} placeholder="EC-PE" /></label>
          <label>Razón social<input required disabled={!canWrite || saving} value={entityForm.legal_name} onChange={(event) => setEntityForm((value) => ({ ...value, legal_name: event.target.value }))} placeholder="Empresa S.A.C." /></label>
          <label>RUC<input required inputMode="numeric" pattern="[0-9]{11}" disabled={!canWrite || saving} value={entityForm.tax_id} onChange={(event) => setEntityForm((value) => ({ ...value, tax_id: event.target.value.replace(/\D/g, "").slice(0, 11) }))} placeholder="20123456789" /></label>
          <label>Dirección fiscal<input required disabled={!canWrite || saving} value={entityForm.fiscal_address} onChange={(event) => setEntityForm((value) => ({ ...value, fiscal_address: event.target.value }))} placeholder="Av. principal 123, Lima" /></label>
          <label>Nombre comercial <small>(opcional)</small><input disabled={!canWrite || saving} value={entityForm.trade_name} onChange={(event) => setEntityForm((value) => ({ ...value, trade_name: event.target.value }))} /></label>
          <label>Régimen tributario <small>(opcional)</small><input disabled={!canWrite || saving} value={entityForm.tax_regime} onChange={(event) => setEntityForm((value) => ({ ...value, tax_regime: event.target.value }))} /></label>
          {canWrite && <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Agregar entidad</>}</button></div>}
        </form>
      </article>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">ESTABLECIMIENTO</p><h2>Nueva sucursal</h2></div><GitBranch className="muted-icon" size={20} /></div>
        <form className="customer-form config-form" onSubmit={saveBranch}>
          <fieldset className="entity-choice" disabled={!canWrite || saving}><legend>Entidad legal</legend><div role="radiogroup" aria-label="Entidad legal para la sucursal" className="entity-choice-list">{entities.filter((item) => item.is_active).length ? entities.filter((item) => item.is_active).map((entity) => <button type="button" role="radio" aria-checked={selectedEntityId === entity.id} className={selectedEntityId === entity.id ? "selected" : ""} key={entity.id} onClick={() => setSelectedEntityId(entity.id)}><strong>{entity.trade_name || entity.legal_name}</strong><small>{entity.tax_id} · {entity.code}</small></button>) : <p>Registra primero una entidad legal activa.</p>}</div></fieldset>
          <label>Código<input required disabled={!canWrite || saving || !selectedEntityId} value={branchForm.code} onChange={(event) => setBranchForm((value) => ({ ...value, code: event.target.value }))} placeholder="SUC-001" /></label>
          <label>Nombre de sucursal<input required disabled={!canWrite || saving || !selectedEntityId} value={branchForm.name} onChange={(event) => setBranchForm((value) => ({ ...value, name: event.target.value }))} placeholder="Sucursal principal" /></label>
          <label>Dirección <small>(opcional)</small><input disabled={!canWrite || saving || !selectedEntityId} value={branchForm.address} onChange={(event) => setBranchForm((value) => ({ ...value, address: event.target.value }))} /></label>
          {canWrite && <div className="form-actions"><button className="primary-button" disabled={saving || !selectedEntityId}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Agregar sucursal</>}</button></div>}
        </form>
      </article>
    </div>
    <article className="panel customers-panel legal-register"><div className="panel-header"><div><p className="card-label">REGISTRO VIGENTE</p><h2>Entidades y establecimientos</h2></div><span className="table-count">{entities.length} entidades · {branches.length} sucursales</span></div>
      {loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando estructura…</div> : <div className="table-wrap"><table><thead><tr><th>ENTIDAD / SUCURSAL</th><th>RUC / CÓDIGO</th><th>DIRECCIÓN</th><th>ESTADO</th><th aria-label="Acciones" /></tr></thead><tbody>{entities.map((entity) => <Fragment key={entity.id}>
        <tr key={entity.id}><td><strong>{entity.trade_name || entity.legal_name}</strong><small className="table-secondary">{entity.legal_name}{entity.is_default ? " · Emisor predeterminado" : ""}</small></td><td>{entity.tax_id}<small className="table-secondary">{entity.code}</small></td><td>{entity.fiscal_address}</td><td><span className={`status-pill ${entity.is_active ? "active" : "inactive"}`}>{entity.is_active ? "Activa" : "Inactiva"}</span></td><td className="row-actions">{canWrite && <>{!entity.is_default && entity.is_active && <button className="text-button" disabled={saving} onClick={() => void patchEntity(entity, { is_default: true })}><Check size={14} /> Predeterminada</button>} {!entity.is_default && <button className="icon-button muted" disabled={saving} aria-label={`${entity.is_active ? "Desactivar" : "Activar"} ${entity.legal_name}`} onClick={() => void patchEntity(entity, { is_active: !entity.is_active })}><Power size={15} /></button>}</>}</td></tr>
        {branches.filter((branch) => branch.legal_entity_id === entity.id).map((branch) => <tr className="branch-row" key={branch.id}><td><span className="branch-name"><GitBranch size={14} /> <strong>{branch.name}</strong></span></td><td>{branch.code}</td><td>{branch.address || "—"}</td><td><span className={`status-pill ${branch.is_active ? "active" : "inactive"}`}>{branch.is_active ? "Activa" : "Inactiva"}</span></td><td>{canWrite && <button className="icon-button muted" disabled={saving} aria-label={`${branch.is_active ? "Desactivar" : "Activar"} ${branch.name}`} onClick={() => void patchBranch(branch)}><Power size={15} /></button>}</td></tr>)}</Fragment>)}{!entities.length && <tr><td colSpan={5}><div className="module-state"><Building2 size={26} /><strong>No hay entidades legales registradas</strong><span>Registra un emisor tributario antes de configurar sucursales y almacenes.</span></div></td></tr>}</tbody></table></div>}
    </article>
  </section>;
}
