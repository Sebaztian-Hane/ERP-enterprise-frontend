import { useEffect, useState } from "react";
import { ChevronLeft, ClipboardList, LoaderCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Movement = { id: string; product_id: string; warehouse_id: string; movement_type: string; quantity: string; reference: string | null; note: string | null };
type Product = { id: string; sku: string; name: string };
type Warehouse = { id: string; code: string; name: string };

export function InventoryHistoryPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]), [products, setProducts] = useState<Product[]>([]), [warehouses, setWarehouses] = useState<Warehouse[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const load = async () => { if (!session || !tenantId) return; setLoading(true); setError(null); try { const [history, catalog, stores] = await Promise.all([apiFetch<Movement[]>("/inventory/movements", options), apiFetch<Product[]>("/products", options), apiFetch<Warehouse[]>("/inventory/warehouses", options)]); setMovements(history); setProducts(catalog); setWarehouses(stores); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el kardex."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const product = (id: string) => products.find((item) => item.id === id); const warehouse = (id: string) => warehouses.find((item) => item.id === id);
  return <section className="module-page"><div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Inventario</button><p className="eyebrow">TRAZABILIDAD DE INVENTARIO</p><h1>Kardex</h1><p className="subtitle">Historial de entradas, salidas, ajustes y transferencias de la empresa activa.</p></div></div>{error && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}<article className="panel customers-panel"><div className="panel-header"><div><p className="card-label">MOVIMIENTOS</p><h2>Historial operativo</h2></div><span className="table-count">{movements.length} registros</span></div>{loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando kardex…</div> : movements.length === 0 ? <div className="module-state"><ClipboardList size={28} /><strong>Aún no hay movimientos</strong><span>Los ajustes, transferencias, ventas y compras aparecerán aquí.</span></div> : <div className="table-wrap"><table className="inventory-table"><thead><tr><th>MOVIMIENTO</th><th>PRODUCTO</th><th>ALMACÉN</th><th>CANTIDAD</th><th>REFERENCIA</th><th>NOTA</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id}><td><span className="status-pill active">{item.movement_type.replaceAll("_", " ")}</span></td><td><strong>{product(item.product_id)?.name ?? "Producto"}</strong><small>{product(item.product_id)?.sku}</small></td><td>{warehouse(item.warehouse_id)?.name ?? "Almacén"}</td><td><strong className={Number(item.quantity) < 0 ? "stock-zero" : ""}>{Number(item.quantity).toLocaleString("es-MX")}</strong></td><td>{item.reference || "—"}</td><td>{item.note || "—"}</td></tr>)}</tbody></table></div>}</article></section>;
}
