import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, LoaderCircle, Plus, Settings2 } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { LegalEntityManagement } from "./LegalEntityManagement";
import { CommercialPoliciesPanel } from "./CommercialPoliciesPanel";

type Master = { id: string; code: string; name: string; is_active: boolean; rate?: string; days_due?: number; symbol?: string };
type Catalog = "taxes" | "currencies" | "units" | "payment-terms" | "cost-centers";
type CatalogDefinition = { label: string; detail: string; optionalLabel?: string; optionalField?: "rate" | "days_due" | "symbol"; placeholder?: string };
const catalogs: Record<Catalog, CatalogDefinition> = {
  taxes: { label: "Impuestos", detail: "Tasas aplicables a la operación", optionalLabel: "Tasa (%)", optionalField: "rate", placeholder: "18" },
  currencies: { label: "Monedas", detail: "Monedas de transacción", optionalLabel: "Símbolo", optionalField: "symbol", placeholder: "S/" },
  units: { label: "Unidades", detail: "Unidades de medida de productos" },
  "payment-terms": { label: "Condiciones de pago", detail: "Vencimientos comerciales", optionalLabel: "Días de vencimiento", optionalField: "days_due", placeholder: "30" },
  "cost-centers": { label: "Centros de costo", detail: "Dimensiones de control contable" },
};

export function ConfigurationPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [catalog, setCatalog] = useState<Catalog>("taxes");
  const [records, setRecords] = useState<Master[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", value: "" });
  const config = catalogs[catalog]; const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const load = async () => { if (!session || !tenantId) return; setLoading(true); setError(null); try { setRecords(await apiFetch<Master[]>(`/operations/configuration/${catalog}`, options)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar este catálogo."); } finally { setLoading(false); } };
  useEffect(() => { setForm({ code: "", name: "", value: "" }); void load(); }, [catalog, session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(null); try { const body: Record<string, unknown> = { code: form.code, name: form.name }; if (config.optionalField) body[config.optionalField] = config.optionalField === "days_due" || config.optionalField === "rate" ? Number(form.value) : form.value; await apiFetch(`/operations/configuration/${catalog}`, { ...options, method: "POST", body: JSON.stringify(body) }); setForm({ code: "", name: "", value: "" }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el registro."); } finally { setSaving(false); } };
  const active = useMemo(() => records.filter((record) => record.is_active).length, [records]);
  return <section className="module-page configuration-page"><div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">MAESTROS Y POLÍTICAS</p><h1>Configuración</h1><p className="subtitle">Define datos reutilizables de la empresa sin alterar documentos históricos.</p></div></div>
    <section className="customer-summary inventory-summary"><article><span className="summary-icon"><Settings2 size={19} /></span><div><small>CATÁLOGO ACTIVO</small><strong>{config.label}</strong></div></article><article><span className="summary-icon green"><Settings2 size={19} /></span><div><small>REGISTROS ACTIVOS</small><strong>{active}</strong></div></article></section>
    <div className="customers-toolbar config-tabs" role="tablist" aria-label="Catálogos maestros">{(Object.keys(catalogs) as Catalog[]).map((key) => <button key={key} className={catalog === key ? "primary-button" : "secondary-button"} onClick={() => setCatalog(key)}>{catalogs[key].label}</button>)}</div>
    <LegalEntityManagement />
    <CommercialPoliciesPanel />
    {error && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    <div className="configuration-grid"><article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">NUEVO REGISTRO</p><h2>{config.label}</h2><p>{config.detail}</p></div><Plus size={20} className="muted-icon" /></div><form className="customer-form config-form" onSubmit={save}><label>Código<input required value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} placeholder="Código único" /></label><label>Nombre<input required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder={`Nombre de ${config.label.toLowerCase()}`} /></label>{config.optionalField && <label>{config.optionalLabel}<input required type={config.optionalField === "symbol" ? "text" : "number"} min={config.optionalField === "days_due" ? 0 : undefined} step={config.optionalField === "rate" ? "0.01" : undefined} value={form.value} onChange={(event) => setForm((value) => ({ ...value, value: event.target.value }))} placeholder={config.placeholder} /></label>}<div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <> <Plus size={16} /> Agregar registro</>}</button></div></form></article>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">CATÁLOGO VIGENTE</p><h2>{config.label}</h2></div><span className="table-count">{records.length} registros</span></div>{loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando catálogo…</div> : records.length === 0 ? <div className="module-state"><Settings2 size={27} /><strong>Sin registros todavía</strong><span>Crea el primer valor para que pueda usarse en operaciones futuras.</span></div> : <div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>NOMBRE</th>{config.optionalField && <th>{config.optionalLabel?.toUpperCase()}</th>}<th>ESTADO</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.code}</strong></td><td>{record.name}</td>{config.optionalField && <td>{record.rate ?? record.days_due ?? record.symbol ?? "—"}</td>}<td><span className={`status-pill ${record.is_active ? "active" : "inactive"}`}>{record.is_active ? "Activo" : "Inactivo"}</span></td></tr>)}</tbody></table></div>}</article></div>
  </section>;
}
