import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  LoaderCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Order = {
  id: string;
  number: string;
  supplier_id: string;
  warehouse_id: string;
  status: string;
  total: string;
};
type Supplier = { id: string; code: string; name: string };
type Product = { id: string; sku: string; name: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
type Line = { product_id: string; quantity: number; unit_value: number };
const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function PurchaseOrdersPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]),
    [suppliers, setSuppliers] = useState<Supplier[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [open, setOpen] = useState(false);
  const [number, setNumber] = useState(""),
    [supplierId, setSupplierId] = useState(""),
    [warehouseId, setWarehouseId] = useState(""),
    [lines, setLines] = useState<Line[]>([]);
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [o, s, p, w] = await Promise.all([
        apiFetch<Order[]>("/purchase-orders", options),
        apiFetch<Supplier[]>("/suppliers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/inventory/warehouses", options),
      ]);
      setOrders(o);
      setSuppliers(s);
      setProducts(p);
      const active = w.filter((item) => item.is_active);
      setWarehouses(active);
      setWarehouseId((current) => current || active[0]?.id || "");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar las órdenes de compra.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_value, 0),
    [lines],
  );
  const supplierName = (id: string) =>
    suppliers.find((item) => item.id === id)?.name ?? "Proveedor";
  const openNew = () => {
    setError(null);
    setNumber(
      `OC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(orders.length + 1).padStart(3, "0")}`,
    );
    setSupplierId(suppliers[0]?.id ?? "");
    setLines([]);
    setOpen(true);
  };
  const addLine = () => {
    const product = products.find(
      (item) => !lines.some((line) => line.product_id === item.id),
    );
    if (product)
      setLines((current) => [
        ...current,
        { product_id: product.id, quantity: 1, unit_value: 0 },
      ]);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!supplierId || !warehouseId || !lines.length) {
      setError("Selecciona proveedor, almacén y al menos un producto.");
      return;
    }
    setSaving("new");
    setError(null);
    try {
      const order = await apiFetch<Order>("/purchase-orders", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          number,
          counterparty_id: supplierId,
          warehouse_id: warehouseId,
          total,
        }),
      });
      await Promise.all(
        lines.map((line) =>
          apiFetch(`/purchase-orders/${order.id}/lines`, {
            ...options,
            method: "POST",
            body: JSON.stringify(line),
          }),
        ),
      );
      setOpen(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo guardar la orden.",
      );
    } finally {
      setSaving(null);
    }
  };
  const approve = async (order: Order) => {
    setSaving(order.id);
    setError(null);
    try {
      await apiFetch(`/purchase-orders/${order.id}/status`, {
        ...options,
        method: "POST",
        body: JSON.stringify({ status: "approved" }),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo aprobar la orden.",
      );
    } finally {
      setSaving(null);
    }
  };
  const receive = async (order: Order) => {
    setSaving(order.id);
    setError(null);
    try {
      const purchaseNumber = `CP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${order.number.slice(-3)}`;
      await apiFetch(
        `/purchase-orders/${order.id}/to-purchase?number=${encodeURIComponent(purchaseNumber)}`,
        { ...options, method: "POST" },
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo convertir la orden.",
      );
    } finally {
      setSaving(null);
    }
  };
  return (
    <section className="module-page">
      <div className="module-heading">
        <div>
          <button className="back-link" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">ABASTECIMIENTO</p>
          <h1>Órdenes de compra</h1>
          <p className="subtitle">
            Solicita, aprueba y recibe compras con impacto controlado en
            inventario.
          </p>
        </div>
        <button className="primary-button" onClick={openNew}>
          <Plus size={18} /> Nueva orden
        </button>
      </div>
      <section className="customer-summary">
        <article>
          <span className="summary-icon">
            <ClipboardList size={19} />
          </span>
          <div>
            <small>ÓRDENES CREADAS</small>
            <strong>{orders.length}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon green">
            <ClipboardCheck size={19} />
          </span>
          <div>
            <small>APROBADAS</small>
            <strong>
              {orders.filter((order) => order.status === "approved").length}
            </strong>
          </div>
        </article>
      </section>
      {error && !open && (
        <div className="module-error">
          {error}
          <button onClick={() => void load()}>Reintentar</button>
        </div>
      )}
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">ABASTECIMIENTO</p>
            <h2>Seguimiento de órdenes</h2>
          </div>
        </div>
        {loading ? (
          <div className="module-state">
            <LoaderCircle className="spin" size={22} /> Cargando órdenes…
          </div>
        ) : orders.length === 0 ? (
          <div className="module-state">
            <ClipboardList size={28} />
            <strong>Aún no hay órdenes de compra</strong>
            <span>Crea una orden para iniciar el flujo de abastecimiento.</span>
            <button className="text-button" onClick={openNew}>
              Crear orden
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>PROVEEDOR</th>
                  <th>ESTADO</th>
                  <th>TOTAL</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.number}</strong>
                    </td>
                    <td>{supplierName(order.supplier_id)}</td>
                    <td>
                      <span
                        className={`status-pill ${order.status === "approved" ? "active" : "inactive"}`}
                      >
                        {order.status === "draft"
                          ? "Borrador"
                          : order.status === "approved"
                            ? "Aprobada"
                            : "Cancelada"}
                      </span>
                    </td>
                    <td>
                      <strong>{currency.format(Number(order.total))}</strong>
                    </td>
                    <td>
                      {order.status === "draft" ? (
                        <button
                          className="text-button"
                          disabled={saving === order.id}
                          onClick={() => void approve(order)}
                        >
                          <Send size={14} /> Aprobar
                        </button>
                      ) : order.status === "approved" ? (
                        <button
                          className="text-button workflow-action"
                          disabled={saving === order.id}
                          onClick={() => void receive(order)}
                        >
                          <ArrowRight size={14} />{" "}
                          {saving === order.id
                            ? "Recibiendo…"
                            : "Recibir compra"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      {open && (
        <div className="modal-layer">
          <section
            className="sale-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nueva orden de compra"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">ABASTECIMIENTO</p>
                <h2>Nueva orden de compra</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <form className="sale-form" onSubmit={save}>
              <div className="form-grid">
                <label>
                  Folio
                  <input
                    required
                    maxLength={40}
                    value={number}
                    onChange={(event) => setNumber(event.target.value)}
                  />
                </label>
                <label>
                  Almacén
                  <select
                    required
                    value={warehouseId}
                    onChange={(event) => setWarehouseId(event.target.value)}
                  >
                    <option value="">Selecciona un almacén</option>
                    {warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Proveedor
                <select
                  required
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                >
                  <option value="">Selecciona un proveedor</option>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.code}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sale-lines-header">
                <span>Productos</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addLine}
                  disabled={
                    lines.length === products.length || !products.length
                  }
                >
                  <Plus size={15} /> Agregar línea
                </button>
              </div>
              <div className="sale-lines">
                {lines.length === 0 ? (
                  <p className="line-empty">
                    Agrega al menos un producto a la orden.
                  </p>
                ) : (
                  lines.map((line, index) => (
                    <div className="sale-line" key={line.product_id}>
                      <select
                        value={line.product_id}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((item, i) =>
                              i === index
                                ? { ...item, product_id: event.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">Producto</option>
                        {products
                          .filter(
                            (item) =>
                              item.id === line.product_id ||
                              !lines.some(
                                (other) => other.product_id === item.id,
                              ),
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.sku}
                            </option>
                          ))}
                      </select>
                      <label>
                        Cant.
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      quantity: Number(event.target.value),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Costo
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_value}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      unit_value: Number(event.target.value),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <strong>
                        {currency.format(line.quantity * line.unit_value)}
                      </strong>
                      <button
                        type="button"
                        className="icon-button remove-line"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                        aria-label="Eliminar línea"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              {error && <p className="login-error">{error}</p>}
              <div className="sale-total">
                <span>Total de la orden</span>
                <strong>{currency.format(total)}</strong>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={saving === "new"}>
                  {saving === "new" ? "Guardando…" : "Guardar orden"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
