import { SystemNotice } from "./SystemNotifications";
import { type FormEvent, useState } from "react";
import { ChevronLeft, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";
import { operationalMoney as money } from "../lib/operationalMetrics";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";

type Product = { id: string; sku: string; name: string; unit_code: string };
type Warehouse = { id: string; code: string; name: string };
type Availability = { id: string; product_id: string; warehouse_id: string; on_hand: string; reserved_quantity: string; available_quantity: string };
type Valuation = { product_id: string; sku: string; name: string; average_cost: string; quantity: string; inventory_value: string };
type Reservation = { id: string; product_id: string; warehouse_id: string; quantity: string; reference: string; reference_type: string; status: string };

export function InventoryPlanningPage({ goBack, mode }: { goBack: () => void; mode: "availability" | "valuation" }) {
  const { session, tenantId, roleCode, access } = useAuth();
  const [query, setQuery] = useState("");
  const [reservation, setReservation] = useState<Availability | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const writable = access ? access.permissions.includes("*") || access.permissions.includes("inventory:write") : ["owner", "admin", "inventory"].includes(roleCode ?? "");
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const { data, error, loading, refresh } = useWorkspaceQuery(`inventory-planning:${mode}`, async (apiOptions) => {
    if (mode === "valuation") return { valuation: await apiFetch<Valuation[]>("/operations/inventory/valuation", apiOptions), availability: [], products: [], warehouses: [], reservations: [] };
    const [availability, products, warehouses, reservations] = await Promise.all([
      apiFetch<Availability[]>("/operations/inventory/availability", apiOptions),
      apiFetch<Product[]>("/products", apiOptions), apiFetch<Warehouse[]>("/inventory/warehouses", apiOptions),
      apiFetch<Reservation[]>("/operations/inventory/reservations", apiOptions),
    ]);
    return { valuation: [], availability, products, warehouses, reservations };
  });
  const products = new Map((data?.products ?? []).map((item) => [item.id, item]));
  const warehouses = new Map((data?.warehouses ?? []).map((item) => [item.id, item]));
  const matches = (text: string) => text.toLocaleLowerCase("es-PE").includes(query.trim().toLocaleLowerCase("es-PE"));
  const shown = (data?.availability ?? []).filter((item) => matches(`${products.get(item.product_id)?.sku} ${products.get(item.product_id)?.name} ${warehouses.get(item.warehouse_id)?.code} ${warehouses.get(item.warehouse_id)?.name}`));
  const valuation = (data?.valuation ?? []).filter((item) => matches(`${item.sku} ${item.name}`));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!reservation || !writable || busy) return;
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0 || Number(quantity) > Number(reservation.available_quantity)) { setWriteError("Ingresa una cantidad entera mayor que cero y dentro del disponible."); return; }
    setBusy(true); setWriteError(null); setNotice(null);
    try {
      await postIdempotent("/operations/inventory/reservations", { ...options, body: JSON.stringify({ product_id: reservation.product_id, warehouse_id: reservation.warehouse_id, quantity, reference: reference.trim(), reference_type: "manual" }) });
      setReservation(null); setNotice("Reserva registrada. La disponibilidad se está actualizando."); refresh();
    } catch (cause) { setWriteError(cause instanceof Error ? cause.message : "No se pudo reservar."); }
    finally { setBusy(false); }
  };
  const release = async (item: Reservation) => {
    if (!writable || busy || item.reference_type !== "manual") return;
    setBusy(true); setWriteError(null); setNotice(null);
    try {
      await postIdempotent(`/operations/inventory/reservations/${item.id}/release`, options);
      setNotice("Reserva manual liberada."); refresh();
    } catch (cause) { setWriteError(cause instanceof Error ? cause.message : "No se pudo liberar la reserva."); }
    finally { setBusy(false); }
  };
  return <section className="module-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Volver al módulo</button><p className="eyebrow">PLANIFICACIÓN DE INVENTARIO</p><h1>{mode === "valuation" ? "Valoración de referencia" : "Disponibilidad y reservas"}</h1><p className="subtitle">{mode === "valuation" ? "Revisa cantidades y su valor al costo promedio registrado en el maestro." : "Consulta existencia física, compromisos y saldo disponible por material y almacén."}</p></div><button className="secondary-button" disabled={loading || busy} onClick={refresh}><RefreshCw size={16} /> Actualizar</button></div>
    <div className="process-strip"><span>Material y almacén</span><span>→</span><span>{mode === "valuation" ? "Existencias × costo promedio" : "Existencias − reservas"}</span><span>→</span><span>{mode === "valuation" ? "Revisión del valor" : "Disponibilidad"}</span><a href="#kardex">Revisar kardex</a></div>
    {(error || (writeError && !reservation)) && <SystemNotice tone="error">{error ?? writeError}<button onClick={refresh}>Reintentar consulta</button></SystemNotice>}
    {notice && <SystemNotice tone="info">{notice}</SystemNotice>}
    <article className="panel customers-panel">
      <div className="customers-toolbar"><label className="search customer-search"><Search size={17} /><input aria-label="Buscar material o almacén" placeholder="Buscar material o almacén" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{mode === "valuation" ? valuation.length : shown.length} posiciones</span></div>
      {loading ? <div className="module-state"><LoaderCircle className="spin" /> Consultando inventario…</div> : <div className="table-wrap"><table><thead>{mode === "valuation" ? <tr><th>MATERIAL</th><th>CANTIDAD</th><th>COSTO PROMEDIO · PEN</th><th>VALOR DE REFERENCIA · PEN</th></tr> : <tr><th>MATERIAL</th><th>ALMACÉN</th><th>EXISTENCIA</th><th>RESERVADO</th><th>DISPONIBLE</th><th>UNIDAD</th>{writable && <th>ACCIÓN</th>}</tr>}</thead><tbody>
        {mode === "valuation" ? valuation.length ? valuation.map((item) => <tr key={item.product_id}><td><strong>{item.sku}</strong><span className="table-secondary">{item.name}</span></td><td>{item.quantity}</td><td>{money(item.average_cost)}</td><td><strong>{money(item.inventory_value)}</strong></td></tr>) : <tr><td colSpan={4}>No hay materiales para mostrar.</td></tr> : shown.length ? shown.map((item) => <tr key={item.id}><td><strong>{products.get(item.product_id)?.sku ?? item.product_id}</strong><span className="table-secondary">{products.get(item.product_id)?.name}</span></td><td>{warehouses.get(item.warehouse_id)?.name ?? item.warehouse_id}</td><td>{item.on_hand}</td><td>{item.reserved_quantity}</td><td><span className={`status-pill ${Number(item.available_quantity) > 0 ? "active" : "pending"}`}>{item.available_quantity}</span></td><td>{products.get(item.product_id)?.unit_code}</td>{writable && <td><button className="text-button" disabled={busy || Number(item.available_quantity) <= 0} onClick={() => { setReservation(item); setQuantity("1"); setReference(""); setWriteError(null); }}><Plus size={14} /> Reservar</button></td>}</tr>) : <tr><td colSpan={writable ? 7 : 6}>No hay posiciones de stock que coincidan con la búsqueda.</td></tr>}
      </tbody></table></div>}
    </article>
    {mode === "availability" && data && <article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">COMPROMISOS DE STOCK</p><h2>Reservas activas</h2></div></div><div className="table-wrap"><table><thead><tr><th>REFERENCIA</th><th>MATERIAL</th><th>ALMACÉN</th><th>CANTIDAD</th><th>ORIGEN</th>{writable && <th>ACCIÓN</th>}</tr></thead><tbody>{data.reservations.filter((item) => item.status === "active").map((item) => <tr key={item.id}><td><strong>{item.reference}</strong></td><td>{products.get(item.product_id)?.sku ?? item.product_id}</td><td>{warehouses.get(item.warehouse_id)?.name ?? item.warehouse_id}</td><td>{item.quantity}</td><td>{item.reference_type === "manual" ? "Manual" : "Documento origen"}</td>{writable && <td>{item.reference_type === "manual" ? <button className="text-button" disabled={busy} onClick={() => void release(item)}>Liberar reserva manual</button> : "Gestionar desde el documento origen"}</td>}</tr>)}{!data.reservations.some((item) => item.status === "active") && <tr><td colSpan={writable ? 6 : 5}>No hay reservas activas.</td></tr>}</tbody></table></div></article>}
    <p className="migration-help">{mode === "valuation" ? "Esta consulta es una referencia operativa; no reemplaza la validación del costeo ni la conciliación contable." : "Reservar reduce el disponible; no modifica la existencia física. Las reservas ligadas a pedidos se gestionan desde su documento origen."}</p>
    {reservation && <div className="modal-layer"><section className="customer-modal" role="dialog" aria-modal="true" aria-label="Reservar disponibilidad"><div className="modal-header"><div><p className="eyebrow">RESERVA MANUAL</p><h2>{products.get(reservation.product_id)?.sku ?? "Material seleccionado"}</h2></div><button className="icon-button" disabled={busy} onClick={() => setReservation(null)} aria-label="Cerrar"><X size={20} /></button></div><form className="customer-form" onSubmit={save}><p>Disponible: {reservation.available_quantity} · {warehouses.get(reservation.warehouse_id)?.name}</p><label>Cantidad<input type="number" min="1" step="1" max={reservation.available_quantity} value={quantity} required disabled={busy} onChange={(event) => setQuantity(event.target.value)} /></label><label>Referencia de la necesidad<input value={reference} maxLength={100} required disabled={busy} onChange={(event) => setReference(event.target.value)} /></label>{writeError && <SystemNotice tone="error">{writeError}</SystemNotice>}<div className="modal-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setReservation(null)}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Reservando…" : "Confirmar reserva"}</button></div></form></section></div>}
  </section>;
}
