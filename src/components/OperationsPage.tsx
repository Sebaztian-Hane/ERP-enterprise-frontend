import { FormEvent, useEffect, useState } from "react";
import { BadgeCheck, BookOpenCheck, ChevronLeft, Fingerprint, LoaderCircle, Plus, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { exportPublicJwk, getOrCreateSigningKey, signChallenge } from "../lib/internalSignature";
import { HandwrittenSignaturePad } from "./HandwrittenSignaturePad";

type Approval = { id: string; module: string; action: string; status: string; amount: string | null };
type Policy = { id: string; module: string; action: string; min_amount: string; required_role: string; require_executor_separation: boolean; is_active: boolean };
type Journal = { id: string; number: string; entry_date: string; description: string; debit: string; credit: string };
type Balance = { code: string; name: string; account_type: string; balance: string };
type Tab = "approvals" | "accounting";
type PolicyKind = "physical_count" | "purchase_order";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const policyLabels: Record<PolicyKind, { title: string; detail: string }> = {
  physical_count: { title: "Autorización para inventario físico", detail: "La regla se evalúa al enviar un conteo físico; no depende de un importe." },
  purchase_order: { title: "Autorización para órdenes de compra", detail: "Las órdenes que alcancen el umbral se asignarán al rol indicado; las demás las revisa el propietario o administrador." },
};

export function OperationsPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId, roleCode } = useAuth();
  const [tab, setTab] = useState<Tab>("approvals");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [journal, setJournal] = useState<Journal[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyKind, setPolicyKind] = useState<PolicyKind>("physical_count");
  const [form, setForm] = useState({ required_role: "admin", min_amount: "0", require_executor_separation: true });
  const [signatureModal, setSignatureModal] = useState<{ id: string; decision: "approve" | "reject" } | null>(null);
  const [signing, setSigning] = useState(false);
  const [handwrittenSignature, setHandwrittenSignature] = useState("");
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const canConfigure = roleCode === "owner" || roleCode === "admin";

  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      if (tab === "approvals") {
        const [requests, rules] = await Promise.all([apiFetch<Approval[]>("/operations/approvals", options), apiFetch<Policy[]>("/operations/approvals/policies", options)]);
        setApprovals(requests); setPolicies(rules);
      } else {
        const [entries, trial] = await Promise.all([apiFetch<Journal[]>("/operations/accounting/journal", options), apiFetch<Balance[]>("/operations/accounting/trial-balance", options)]);
        setJournal(entries); setBalance(trial);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el control operativo."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, tenantId, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (id: string, decision: "approve" | "reject") => {
    if (!session || !tenantId) return;
    if (!handwrittenSignature) { setError("Traza la firma manuscrita antes de confirmar la decisión."); return; }
    setSigning(true); setError(null);
    try {
      const challenge = await apiFetch<{ challenge_id: string; message: string; expires_at: string }>(`/operations/approvals/${id}/signature-challenge?decision=${decision === "approve" ? "approved" : "rejected"}`, { ...options, method: "POST" });
      const scope = `${tenantId}:${session.user.id}`;
      const pair = await getOrCreateSigningKey(scope);
      const public_jwk = await exportPublicJwk(pair);
      const key = await apiFetch<{ id: string }>("/operations/approvals/signing-keys", { ...options, method: "POST", body: JSON.stringify({ label: "Navegador actual", public_jwk }) });
      const signature = await signChallenge(pair, challenge.message);
      await apiFetch(`/operations/approvals/${id}/${decision}`, { ...options, method: "POST", body: JSON.stringify({ decision_note: "Revisión firmada desde EnterpriseCloud", challenge_id: challenge.challenge_id, signing_key_id: key.id, signature, handwritten_signature_svg: handwrittenSignature }) });
      setSignatureModal(null);
      setHandwrittenSignature("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la firma."); }
    finally { setSigning(false); }
  };
  const createPolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const minAmount = Number(form.min_amount);
    if (policyKind === "purchase_order" && (!Number.isFinite(minAmount) || minAmount < 0)) { setError("Ingresa un importe mínimo válido para las órdenes de compra."); return; }
    setSaving(true); setError(null);
    try {
      await apiFetch("/operations/approvals/policies", { ...options, method: "POST", body: JSON.stringify({
        module: policyKind === "physical_count" ? "inventory" : "purchases", action: policyKind,
        min_amount: policyKind === "physical_count" ? 0 : minAmount, required_role: form.required_role,
        require_executor_separation: form.require_executor_separation, is_active: true,
      }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la política."); }
    finally { setSaving(false); }
  };
  const policyScope = (item: Policy) => item.module === "inventory" && item.action === "physical_count" ? "Todo conteo enviado" : item.module === "purchases" && item.action === "purchase_order" ? `Desde ${money.format(Number(item.min_amount))}` : money.format(Number(item.min_amount));

  return <section className="module-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">GOBIERNO OPERATIVO</p><h1>Control operativo</h1><p className="subtitle">Aprobaciones trazables y consulta contable de la empresa.</p></div></div>
    <div className="customers-toolbar" role="tablist"><button className={tab === "approvals" ? "primary-button" : "secondary-button"} onClick={() => setTab("approvals")}><BadgeCheck size={16} /> Aprobaciones</button><button className={tab === "accounting" ? "primary-button" : "secondary-button"} onClick={() => setTab("accounting")}><BookOpenCheck size={16} /> Contabilidad</button><a className="secondary-button" href="#configuracion">Configuración y maestros</a></div>
    {error && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    {loading ? <div className="module-state"><LoaderCircle className="spin" size={24} /> Cargando…</div> : tab === "approvals" ? <>
      <section className="metric-grid"><article className="metric-card"><p>Pendientes</p><strong>{approvals.filter((item) => item.status === "pending").length}</strong><span className="trend neutral">Solicitudes por resolver</span></article><article className="metric-card"><p>Políticas activas</p><strong>{policies.filter((item) => item.is_active).length}</strong><span className="trend neutral">Reglas vigentes</span></article></section>
      {canConfigure && <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">NUEVA REGLA</p><h2>{policyLabels[policyKind].title}</h2><p>{policyLabels[policyKind].detail}</p></div><Plus size={20} className="muted-icon" /></div><form className="customer-form form-grid" onSubmit={createPolicy}><label>Tipo de autorización<select value={policyKind} onChange={(event) => setPolicyKind(event.target.value as PolicyKind)}><option value="physical_count">Conteo físico de inventario</option><option value="purchase_order">Orden de compra por importe</option></select></label><label>Rol aprobador<select value={form.required_role} onChange={(event) => setForm((value) => ({ ...value, required_role: event.target.value }))}><option value="admin">Administrador</option><option value="owner">Propietario</option><option value="finance">Finanzas</option></select></label>{policyKind === "purchase_order" && <label>Importe mínimo (S/)<input type="number" min="0" step="0.01" value={form.min_amount} onChange={(event) => setForm((value) => ({ ...value, min_amount: event.target.value }))} required /></label>}<label className="check-field"><input type="checkbox" checked={form.require_executor_separation} onChange={(event) => setForm((value) => ({ ...value, require_executor_separation: event.target.checked }))} /> Exigir ejecutor distinto del solicitante y aprobador</label><div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Crear política</>}</button></div></form></article>}
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">POLÍTICAS VIGENTES</p><h2>Reglas de autorización</h2></div></div><div className="table-wrap"><table><thead><tr><th>MÓDULO</th><th>ACCIÓN</th><th>ALCANCE</th><th>APROBADOR</th><th>SEGREGACIÓN</th><th>ESTADO</th></tr></thead><tbody>{policies.length ? policies.map((item) => <tr key={item.id}><td>{item.module}</td><td>{item.action}</td><td>{policyScope(item)}</td><td>{item.required_role}</td><td>{item.require_executor_separation ? "Solicitante, aprobador y ejecutor separados" : "Permitida"}</td><td><span className={`status-pill ${item.is_active ? "active" : "inactive"}`}>{item.is_active ? "Activa" : "Inactiva"}</span></td></tr>) : <tr><td colSpan={6}>No hay políticas configuradas.</td></tr>}</tbody></table></div></article>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">FLUJO DE AUTORIZACIÓN</p><h2>Solicitudes recientes</h2></div></div><div className="table-wrap"><table><thead><tr><th>MÓDULO</th><th>ACCIÓN</th><th>IMPORTE</th><th>ESTADO</th><th>DECISIÓN</th></tr></thead><tbody>{approvals.length ? approvals.map((item) => <tr key={item.id}><td>{item.module}</td><td>{item.action}</td><td>{item.amount ? money.format(Number(item.amount)) : "—"}</td><td><span className={`status-pill ${item.status === "approved" ? "active" : item.status === "pending" ? "pending" : "inactive"}`}>{item.status}</span></td><td>{item.status === "pending" && canConfigure ? <span className="row-actions"><button className="text-button" onClick={() => { setHandwrittenSignature(""); setSignatureModal({ id: item.id, decision: "approve" }); }}>Firmar y aprobar</button><button className="text-button" onClick={() => { setHandwrittenSignature(""); setSignatureModal({ id: item.id, decision: "reject" }); }}>Firmar y rechazar</button></span> : "—"}</td></tr>) : <tr><td colSpan={5}>No hay solicitudes pendientes.</td></tr>}</tbody></table></div></article>
    </> : <>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">LIBRO DIARIO</p><h2>Asientos automáticos</h2></div><span className="table-count">{journal.length} registros</span></div><div className="table-wrap"><table><thead><tr><th>FECHA</th><th>NÚMERO</th><th>DESCRIPCIÓN</th><th>DÉBITO</th><th>CRÉDITO</th></tr></thead><tbody>{journal.length ? journal.map((item) => <tr key={item.id}><td>{item.entry_date}</td><td><strong>{item.number}</strong></td><td>{item.description}</td><td>{money.format(Number(item.debit))}</td><td>{money.format(Number(item.credit))}</td></tr>) : <tr><td colSpan={5}>Los nuevos cobros, pagos, ventas y compras generarán asientos aquí.</td></tr>}</tbody></table></div></article>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">BALANCE DE COMPROBACIÓN</p><h2>Plan de cuentas</h2></div></div><div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>CUENTA</th><th>TIPO</th><th>SALDO</th></tr></thead><tbody>{balance.map((item) => <tr key={item.code}><td><strong>{item.code}</strong></td><td>{item.name}</td><td>{item.account_type}</td><td>{money.format(Number(item.balance))}</td></tr>)}</tbody></table></div></article>
    </>}
    {signatureModal && <div className="modal-layer"><section className="customer-modal" role="dialog" aria-modal="true" aria-label="Confirmar firma digital interna"><div className="modal-header"><div><p className="eyebrow">FIRMA DIGITAL INTERNA</p><h2>{signatureModal.decision === "approve" ? "Firmar y aprobar" : "Firmar y rechazar"}</h2></div><button className="icon-button" type="button" onClick={() => !signing && setSignatureModal(null)} aria-label="Cerrar"><X size={20} /></button></div><div className="signature-confirmation"><Fingerprint size={28} /><p>Firmarás esta decisión con una clave criptográfica local de este navegador. La clave privada no se envía al servidor.</p><small>La firma manuscrita será evidencia visual y la firma criptográfica interna validará la decisión. El certificado legal permanece pendiente.</small></div><HandwrittenSignaturePad disabled={signing} onChange={setHandwrittenSignature} /><div className="modal-actions"><button type="button" className="secondary-button" disabled={signing} onClick={() => setSignatureModal(null)}>Cancelar</button><button type="button" className="primary-button" disabled={signing || !handwrittenSignature} onClick={() => void decide(signatureModal.id, signatureModal.decision)}>{signing ? <><LoaderCircle size={16} className="spin" /> Firmando…</> : <><Fingerprint size={16} /> Confirmar firma</>}</button></div></section></div>}
  </section>;
}
