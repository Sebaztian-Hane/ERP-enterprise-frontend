type ActivityPoint = {
  date: string;
  sales_total: string;
  purchases_total: string;
  receipts_total: string;
  payments_total: string;
};

const moneyCompact = new Intl.NumberFormat("es-PE", {
  style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1,
});

function points(values: number[], maximum: number, width = 640, height = 220, pad = 18) {
  return values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - (value / maximum) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function datesFor(points: ActivityPoint[]) {
  const every = Math.max(1, Math.ceil(points.length / 5));
  return points.filter((_, index) => index % every === 0 || index === points.length - 1).map((point) =>
    new Date(`${point.date}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
  );
}

export function SalesTrendChart({ activity }: { activity: ActivityPoint[] }) {
  const sales = activity.map((point) => Math.max(0, Number(point.sales_total)));
  const purchases = activity.map((point) => Math.max(0, Number(point.purchases_total)));
  const max = Math.max(...sales, ...purchases, 1);
  const labels = datesFor(activity);
  return <article className="panel report-chart-card">
    <div className="panel-header"><div><p className="card-label">RENDIMIENTO COMERCIAL</p><h2>Ventas y compras por día</h2></div><div className="chart-legend"><span><i className="sales" />Ventas</span><span><i className="purchases" />Compras</span></div></div>
    {activity.length ? <><svg className="line-chart" viewBox="0 0 640 220" role="img" aria-label="Tendencia diaria de ventas y compras"><defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#198db5" stopOpacity=".28"/><stop offset="1" stopColor="#198db5" stopOpacity="0"/></linearGradient></defs>{[.25,.5,.75].map((line) => <line key={line} x1="18" x2="622" y1={202 - 184 * line} y2={202 - 184 * line} className="chart-gridline" />)}<polygon points={`18,202 ${points(sales, max)} 622,202`} fill="url(#sales-area)" /><polyline points={points(sales, max)} className="chart-line sales" /><polyline points={points(purchases, max)} className="chart-line purchases" /></svg><div className="chart-axis"><span>0</span><span>{moneyCompact.format(max)}</span></div><div className="chart-dates">{labels.map((label) => <span key={label}>{label}</span>)}</div></> : <div className="module-state compact">No hay movimientos en este periodo.</div>}
  </article>;
}

export function CashFlowChart({ activity }: { activity: ActivityPoint[] }) {
  const incoming = activity.reduce((total, point) => total + Math.max(0, Number(point.receipts_total)), 0);
  const outgoing = activity.reduce((total, point) => total + Math.max(0, Number(point.payments_total)), 0);
  const maximum = Math.max(incoming, outgoing, 1);
  return <article className="panel report-chart-card cash-flow-card"><div className="panel-header"><div><p className="card-label">TESORERÍA</p><h2>Flujo de caja del periodo</h2></div></div><div className="cash-bars"><div><span className="cash-bar-track"><i className="income" style={{ width: `${(incoming / maximum) * 100}%` }} /></span><strong>{moneyCompact.format(incoming)}</strong><small>Cobros recibidos</small></div><div><span className="cash-bar-track"><i className="expense" style={{ width: `${(outgoing / maximum) * 100}%` }} /></span><strong>{moneyCompact.format(outgoing)}</strong><small>Pagos realizados</small></div></div><p className="cash-net">Flujo neto <strong className={incoming - outgoing >= 0 ? "positive" : "negative"}>{moneyCompact.format(incoming - outgoing)}</strong></p></article>;
}

export function ExposureChart({ receivableTotal, payableTotal }: { receivableTotal: number; payableTotal: number }) {
  const total = receivableTotal + payableTotal;
  const receivablePercent = total ? Math.round((receivableTotal / total) * 100) : 0;
  const background = total ? `conic-gradient(#198db5 0 ${receivablePercent}%, #dc9b2c ${receivablePercent}% 100%)` : "#dbe6ea";
  return <article className="panel report-chart-card exposure-card"><div><p className="card-label">EXPOSICIÓN FINANCIERA</p><h2>Saldos pendientes</h2><p className="subtitle">Prioriza la cobranza y programa obligaciones.</p></div><div className="donut-wrap"><div className={`donut${total ? "" : " is-empty"}`} style={{ background }}><span>{moneyCompact.format(total)}</span></div><div className="donut-legend"><span><i className="sales" />Por cobrar <strong>{moneyCompact.format(receivableTotal)}</strong></span><span><i className="warning" />Por pagar <strong>{moneyCompact.format(payableTotal)}</strong></span></div></div></article>;
}
