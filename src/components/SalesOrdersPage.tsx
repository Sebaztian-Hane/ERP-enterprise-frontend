import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ClipboardCheck, LoaderCircle, PackageCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";

type Order = { id: string; number: string; customer_id: string; warehouse_id: string; status: string; total: string };
type Customer = { id: string; code: string; name: string };
type OrderLine = { product_id: string; product_name: string; quantity: string; tracking_mode: "none" | "lot" | "serial" };
type Delivery = { id: string };
const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const statusLabel: Record<string, string> = { draft: "Borrador", confirmed: "Confirmado", fulfilled: "Entregado", cancelled: "Cancelado" };

export function SalesOrdersPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId, roleCode } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };

  const load = async (targetPage = page) => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const [orderData, customerData] = await Promise.all([fetchPage<Order, "orders">("/sales-orders", "orders", targetPage, options), apiFetch<Customer[]>("/customers", options)]);
      setOrders(orderData.orders); setMeta(orderData.meta); setCustomers(customerData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(page); }, [session?.access_token, tenantId, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const canDispatch = roleCode === "owner" || roleCode === "admin" || roleCode === "inventory";

  const confirm = async (order: Order) => {
    setSaving(order.id); setError(null);
    try { await postIdempotent(`/sales-orders/${order.id}/status`, { ...options, body: JSON.stringify({ status: "confirmed" }) }); await load(page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo confirmar el pedido."); }
    finally { setSaving(null); }
  };
  const post = async (order: Order) => {
    const saleNumber = `V-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${order.number.slice(-3)}`;
    await postIdempotent(`/sales-orders/${order.id}/to-sale?number=${encodeURIComponent(saleNumber)}`, options);
  };
  const dispatchAndPost = async (order: Order) => {
    setSaving(order.id); setError(null);
    try {
      const lines = await apiFetch<OrderLine[]>(`/sales-orders/${order.id}/lines`, options);
      if (lines.some((line) => line.tracking_mode === "serial")) throw new Error("Este pedido contiene productos serializados. Prepara el despacho indicando las series antes de registrarlo como venta.");
      const stamp = `${Date.now()}`.slice(-6);
      const delivery = await postIdempotent<Delivery>("/sales-deliveries", { ...options, body: JSON.stringify({ number: `DES-${order.number}-${stamp}`.slice(0, 40), sales_order_id: order.id, recipient_name: customerName(order.customer_id), lines: lines.map((line) => ({ product_id: line.product_id, quantity: line.quantity })) }) });
      await postIdempotent(`/sales-deliveries/${delivery.id}/dispatch`, { ...options, body: JSON.stringify({ lines: [] }) });
      await postIdempotent(`/sales-deliveries/${delivery.id}/deliver`, { ...options, body: JSON.stringify({}) });
      await post(order);
      await load(page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar el despacho del pedido."); }
    finally { setSaving(null); }
  };
  const postDelivered = async (order: Order) => {
    setSaving(order.id); setError(null);
    try { await post(order); await load(page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la venta."); }
    finally { setSaving(null); }
  };

  return <section className="module-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">CICLO COMERCIAL</p><h1>Pedidos de venta</h1><p className="subtitle">Confirma, despacha y registra las ventas conservando la trazabilidad del pedido.</p></div></div>
    <section className="customer-summary"><article><span className="summary-icon"><ClipboardCheck size={19} /></span><div><small>PEDIDOS ACTIVOS</small><strong>{orders.filter((order) => order.status !== "cancelled").length}</strong></div></article><article><span className="summary-icon green"><ShoppingCart size={19} /></span><div><small>IMPORTE EN PEDIDOS</small><strong>{currency.format(orders.reduce((total, order) => total + Number(order.total), 0))}</strong></div></article></section>
    {error && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">CUMPLIMIENTO COMERCIAL</p><h2>Pedidos por procesar</h2></div></div>
      {loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando pedidos…</div> : orders.length === 0 ? <div className="module-state"><ClipboardCheck size={28} /><strong>No hay pedidos de venta</strong><span>Convierte una cotización aprobada para crear el primer pedido.</span><a href="#cotizaciones" className="text-button">Ir a cotizaciones</a></div> : <div className="table-wrap"><table className="sales-table"><thead><tr><th>FOLIO</th><th>CLIENTE</th><th>ESTADO</th><th>TOTAL</th><th>ACCIÓN</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.number}</strong></td><td>{customerName(order.customer_id)}</td><td><span className={`status-pill ${["confirmed", "fulfilled"].includes(order.status) ? "active" : "inactive"}`}>{statusLabel[order.status] ?? order.status}</span></td><td><strong>{currency.format(Number(order.total))}</strong></td><td>{order.status === "draft" ? <button className="text-button" disabled={saving === order.id} onClick={() => void confirm(order)}>{saving === order.id ? "Confirmando…" : "Confirmar"}</button> : order.status === "confirmed" && canDispatch ? <button className="text-button workflow-action" disabled={saving === order.id} onClick={() => void dispatchAndPost(order)}><PackageCheck size={14} /> {saving === order.id ? "Procesando…" : "Despachar y registrar"}</button> : order.status === "confirmed" ? <span className="table-secondary">Pendiente de despacho</span> : order.status === "fulfilled" ? <button className="text-button workflow-action" disabled={saving === order.id} onClick={() => void postDelivered(order)}><ArrowRight size={14} /> {saving === order.id ? "Registrando…" : "Registrar venta"}</button> : "—"}</td></tr>)}</tbody></table></div>}
      {!loading && orders.length > 0 && <TablePagination meta={meta} label="pedidos" onPageChange={setPage} />}
    </article>
  </section>;
}
