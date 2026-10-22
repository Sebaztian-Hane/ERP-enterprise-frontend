import { FormEvent, useEffect, useState } from "react";
import { BadgePercent, Coins, LoaderCircle, Plus, Tags } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Currency = { id: string; code: string; name: string; symbol?: string | null; is_active: boolean };
type ExchangeRate = { id: string; currency_code: string; effective_date: string; rate_to_base: string; source: string };
type PriceList = { id: string; code: string; name: string; currency_code: string; valid_from: string; valid_to?: string | null; item_count: number };
type DiscountPolicy = { id: string; code: string; name: string; scope: string; max_discount_percent: string; requires_approval: boolean };
type Tab = "rates" | "prices" | "discounts";
const dateToday = () => new Date().toISOString().slice(0, 10);

export function CommercialPoliciesPanel() {
  const { session, tenantId } = useAuth();
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const [tab, setTab] = useState<Tab>("rates");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [lists, setLists] = useState<PriceList[]>([]);
  const [discounts, setDiscounts] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState({ currency_id: "", effective_date: dateToday(), rate_to_base: "", source: "manual" });
  const [list, setList] = useState({ code: "", name: "", currency_id: "", valid_from: dateToday(), valid_to: "" });
  const [discount, setDiscount] = useState({ code: "", name: "", scope: "sale", max_discount_percent: "", requires_approval: false });

  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const result = await Promise.all([
        apiFetch<Currency[]>("/operations/configuration/currencies", options),
        apiFetch<ExchangeRate[]>("/operations/configuration/exchange-rates", options),
        apiFetch<PriceList[]>("/operations/configuration/price-lists", options),
        apiFetch<DiscountPolicy[]>("/operations/configuration/discount-policies", options),
      ]);
      setCurrencies(result[0].filter((item) => item.is_active));
      setRates(result[1]); setLists(result[2]); setDiscounts(result[3]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración comercial.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitRate = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch("/operations/configuration/exchange-rates", { ...options, method: "POST", body: JSON.stringify({ ...rate, rate_to_base: Number(rate.rate_to_base) }) });
      setRate({ currency_id: "", effective_date: dateToday(), rate_to_base: "", source: "manual" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el tipo de cambio."); }
    finally { setSaving(false); }
  };
  const submitList = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch("/operations/configuration/price-lists", { ...options, method: "POST", body: JSON.stringify({ ...list, valid_to: list.valid_to || null }) });
      setList({ code: "", name: "", currency_id: "", valid_from: dateToday(), valid_to: "" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la lista."); }
    finally { setSaving(false); }
  };
  const submitDiscount = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch("/operations/configuration/discount-policies", { ...options, method: "POST", body: JSON.stringify({ ...discount, max_discount_percent: Number(discount.max_discount_percent) }) });
      setDiscount({ code: "", name: "", scope: "sale", max_discount_percent: "", requires_approval: false }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la política."); }
    finally { setSaving(false); }
  };
  const currencyChoices = (current: string, choose: (id: string) => void) => <fieldset className="entity-choice"><legend>Moneda</legend><div role="radiogroup" className="entity-choice-list currency-choice-list">{currencies.map((item) => <button type="button" key={item.id} role="radio" aria-checked={current === item.id} className={current === item.id ? "selected" : ""} onClick={() => choose(item.id)}><strong>{item.code} {item.symbol || ""}</strong><small>{item.name}</small></button>)}{currencies.length === 0 && <p>Registra primero una moneda activa.</p>}</div></fieldset>;

  return <section className="legal-entity-management">
    <div className="panel-header"><div><p className="card-label">CONFIGURACIÓN COMERCIAL VERSIONABLE</p><h2>Precios, descuentos y moneda</h2><p>Configura vigencias para operaciones nuevas sin alterar documentos emitidos.</p></div></div>
    <div className="customers-toolbar config-tabs" role="tablist" aria-label="Configuración comercial">
      <button type="button" className={tab === "rates" ? "primary-button" : "secondary-button"} onClick={() => setTab("rates")}><Coins size={16} /> Tipos de cambio</button>
      <button type="button" className={tab === "prices" ? "primary-button" : "secondary-button"} onClick={() => setTab("prices")}><Tags size={16} /> Listas de precios</button>
      <button type="button" className={tab === "discounts" ? "primary-button" : "secondary-button"} onClick={() => setTab("discounts")}><BadgePercent size={16} /> Descuentos</button>
    </div>
    {error && <div className="module-error">{error}<button type="button" onClick={() => void load()}>Reintentar</button></div>}
    {loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando configuración comercial…</div> : <div className="configuration-grid">
      {tab === "rates" && <><article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">NUEVA VIGENCIA</p><h2>Tipo de cambio</h2><p>Registra la relación contra la moneda base de la empresa.</p></div><Coins className="muted-icon" size={20} /></div><form className="customer-form config-form" onSubmit={submitRate}>{currencyChoices(rate.currency_id, (currency_id) => setRate((value) => ({ ...value, currency_id })))}<label>Fecha efectiva<input required type="date" value={rate.effective_date} onChange={(event) => setRate((value) => ({ ...value, effective_date: event.target.value }))} /></label><label>Tipo de cambio<input required type="number" min="0.000001" step="0.000001" value={rate.rate_to_base} onChange={(event) => setRate((value) => ({ ...value, rate_to_base: event.target.value }))} /></label><label>Fuente<input required value={rate.source} onChange={(event) => setRate((value) => ({ ...value, source: event.target.value }))} /></label><div className="form-actions"><button className="primary-button" disabled={saving || !rate.currency_id}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Registrar vigencia</>}</button></div></form></article><MasterTable title="Vigencias registradas" headers={["MONEDA", "FECHA", "CAMBIO", "FUENTE"]} rows={rates.map((item) => [item.currency_code, item.effective_date, item.rate_to_base, item.source])} /></>}
      {tab === "prices" && <><article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">NUEVA LISTA</p><h2>Lista de precios</h2><p>Define una vigencia y moneda antes de cargar sus tarifas.</p></div><Tags className="muted-icon" size={20} /></div><form className="customer-form config-form" onSubmit={submitList}><label>Código<input required value={list.code} onChange={(event) => setList((value) => ({ ...value, code: event.target.value }))} placeholder="MAYORISTA-2026" /></label><label>Nombre<input required value={list.name} onChange={(event) => setList((value) => ({ ...value, name: event.target.value }))} placeholder="Mayorista 2026" /></label>{currencyChoices(list.currency_id, (currency_id) => setList((value) => ({ ...value, currency_id })))}<label>Inicio<input required type="date" value={list.valid_from} onChange={(event) => setList((value) => ({ ...value, valid_from: event.target.value }))} /></label><label>Fin <small>(opcional)</small><input type="date" min={list.valid_from} value={list.valid_to} onChange={(event) => setList((value) => ({ ...value, valid_to: event.target.value }))} /></label><div className="form-actions"><button className="primary-button" disabled={saving || !list.currency_id}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Crear lista</>}</button></div></form></article><MasterTable title="Listas registradas" headers={["CÓDIGO", "NOMBRE", "MONEDA", "VIGENCIA", "ÍTEMS"]} rows={lists.map((item) => [item.code, item.name, item.currency_code, item.valid_from + (item.valid_to ? " — " + item.valid_to : ""), String(item.item_count)])} /></>}
      {tab === "discounts" && <><article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">NUEVA REGLA</p><h2>Política de descuento</h2><p>El control de aprobación se aplicará al integrar la política al flujo de venta.</p></div><BadgePercent className="muted-icon" size={20} /></div><form className="customer-form config-form" onSubmit={submitDiscount}><label>Código<input required value={discount.code} onChange={(event) => setDiscount((value) => ({ ...value, code: event.target.value }))} placeholder="DESC-MAX-10" /></label><label>Nombre<input required value={discount.name} onChange={(event) => setDiscount((value) => ({ ...value, name: event.target.value }))} /></label><fieldset className="entity-choice"><legend>Ámbito</legend><div role="radiogroup" className="entity-choice-list currency-choice-list">{[["sale", "Venta"], ["customer", "Cliente"], ["product", "Producto"], ["price_list", "Lista"]].map(([code, label]) => <button type="button" key={code} role="radio" aria-checked={discount.scope === code} className={discount.scope === code ? "selected" : ""} onClick={() => setDiscount((value) => ({ ...value, scope: code }))}><strong>{label}</strong></button>)}</div></fieldset><label>Descuento máximo (%)<input required type="number" min="0" max="100" step="0.01" value={discount.max_discount_percent} onChange={(event) => setDiscount((value) => ({ ...value, max_discount_percent: event.target.value }))} /></label><label className="check-field"><input type="checkbox" checked={discount.requires_approval} onChange={(event) => setDiscount((value) => ({ ...value, requires_approval: event.target.checked }))} /> Requiere aprobación</label><div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Crear política</>}</button></div></form></article><MasterTable title="Políticas registradas" headers={["CÓDIGO", "NOMBRE", "ÁMBITO", "LÍMITE", "CONTROL"]} rows={discounts.map((item) => [item.code, item.name, item.scope, item.max_discount_percent + "%", item.requires_approval ? "Aprobación" : "Directo"])} /></>}
    </div>}
  </section>;
}

function MasterTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">CONFIGURACIÓN VIGENTE</p><h2>{title}</h2></div><span className="table-count">{rows.length} registros</span></div>{rows.length === 0 ? <div className="module-state"><Tags size={26} /><strong>Sin registros todavía</strong><span>Agrega el primer valor para habilitarlo en próximas operaciones.</span></div> : <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === 0 ? <strong>{cell}</strong> : cell || "—"}</td>)}</tr>)}</tbody></table></div>}</article>;
}
