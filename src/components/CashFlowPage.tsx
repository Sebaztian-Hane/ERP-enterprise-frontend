import { SystemNotice } from "./SystemNotifications";
import { ChevronLeft, Landmark, LoaderCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "../lib/api";
import { agingBuckets, cashTotalsByCurrency, operationalMoney as money, type AgingItem, type CashFlowAccount } from "../lib/operationalMetrics";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";

export function CashFlowPage({ goBack }: { goBack: () => void }) {
  const { data, error, loading, refresh } = useWorkspaceQuery("cash-flow", async (options) => {
    const [accounts, aging] = await Promise.all([apiFetch<CashFlowAccount[]>("/operations/finance/cash-flow", options), apiFetch<AgingItem[]>("/operations/finance/aging", options)]);
    return { accounts, aging };
  });
  return <section className="module-page cash-flow-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Volver al módulo</button><p className="eyebrow">TESORERÍA Y VENCIMIENTOS</p><h1>Flujo de caja</h1><p className="subtitle">Consulta saldos, entradas y salidas del mes, y antigüedad de la cartera.</p></div><button className="secondary-button" disabled={loading} onClick={refresh}><RefreshCw size={16} /> Actualizar</button></div>
    <div className="process-strip"><span>Cuentas y movimientos</span><span>→</span><span>Saldo por moneda</span><span>→</span><span>Vencimientos</span><a href="#finanzas">Gestionar cobros y pagos</a></div>
    {error && <SystemNotice tone="error">{error}<button onClick={refresh}>Reintentar</button></SystemNotice>}
    {loading ? <div className="module-state"><LoaderCircle className="spin" /> Consultando tesorería…</div> : data && <>
      <section className="cash-currency-grid">{cashTotalsByCurrency(data.accounts).map((group) => <article className="panel cash-currency-card" key={group.currency}><small>{group.currency} · SALDO DISPONIBLE EN CUENTAS</small><strong>{money(group.balance, group.currency)}</strong><div><span>Entradas del mes <b>{money(group.inflow, group.currency)}</b></span><span>Salidas del mes <b>{money(group.outflow, group.currency)}</b></span></div></article>)}</section>
      <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">POSICIÓN DE TESORERÍA</p><h2>Cuentas por moneda</h2></div><Landmark size={20} /></div><div className="table-wrap"><table><thead><tr><th>CUENTA</th><th>MONEDA</th><th>ENTRADAS DEL MES</th><th>SALIDAS DEL MES</th><th>SALDO</th></tr></thead><tbody>{data.accounts.length ? data.accounts.map((account) => <tr key={account.id}><td><strong>{account.code}</strong><span className="table-secondary">{account.name}</span></td><td>{account.currency}</td><td>{money(account.month_inflow, account.currency)}</td><td>{money(account.month_outflow, account.currency)}</td><td><strong>{money(account.balance, account.currency)}</strong></td></tr>) : <tr><td colSpan={5}>Crea una cuenta de caja o banco en Finanzas para comenzar.</td></tr>}</tbody></table></div></article>
      <div className="data-flows">{(["receivable", "payable"] as const).map((kind) => <article key={kind} className="panel data-flow-card"><p className="card-label">ANTIGÜEDAD DE SALDOS OPERATIVOS · PEN</p><h2>{kind === "receivable" ? "Por cobrar" : "Por pagar"}</h2><div className="aging-buckets">{agingBuckets(data.aging, kind).map((bucket) => <div key={bucket.label}><span>{bucket.label}</span><strong>{money(bucket.amount)}</strong></div>)}</div><a className="text-button" href="#cuentas">Revisar documentos y vencimientos</a></article>)}</div>
      <p className="migration-help">Los saldos se mantienen separados por moneda. Los vencimientos muestran obligaciones abiertas o parciales; revisa documentos y conciliación antes de programar un pago.</p>
    </>}
  </section>;
}
