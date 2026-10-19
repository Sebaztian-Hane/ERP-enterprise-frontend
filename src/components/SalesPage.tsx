import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FileText,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, apiFetch } from "../lib/api";

type Customer = { id: string; code: string; name: string };
type Product = { id: string; sku: string; name: string; sale_price: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
type Sale = {
  id: string;
  number: string;
  customer_id: string;
  warehouse_id: string;
  status: string;
  total: string;
  note: string | null;
};
type Line = { product_id: string; quantity: number; unit_price: number };
type ElectronicDocument = {
  id: string;
  document_type: "01" | "03";
  series: string;
  correlative: string;
  file_name: string;
  status: string;
  xml_url: string | null;
  cdr_url: string | null;
  last_error: string | null;
};
const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function SalesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [billingSale, setBillingSale] = useState<Sale | null>(null);
  const [billingDocument, setBillingDocument] = useState<ElectronicDocument | null>(null);
  const [billingType, setBillingType] = useState<"01" | "03">("03");
  const [billingBusy, setBillingBusy] = useState(false);
  const [voidReason, setVoidReason] = useState("Anulación solicitada desde EnterpriseCloud");
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [history, people, items, stores] = await Promise.all([
        apiFetch<Sale[]>("/sales", options),
        apiFetch<Customer[]>("/customers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/sales/warehouses", options),
      ]);
      setSales(history);
      setCustomers(people);
      setProducts(items);
      setWarehouses(stores.filter((store) => store.is_active));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los datos de ventas.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines],
  );
  const openNew = () => {
    setError(null);
    setCustomerId(customers[0]?.id ?? "");
    setWarehouseId(warehouses[0]?.id ?? "");
    setNumber(
      `V-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(sales.length + 1).padStart(3, "0")}`,
    );
    setNote("");
    setLines([]);
    setIsOpen(true);
  };
  const addLine = () => {
    const available = products.find(
      (product) => !lines.some((line) => line.product_id === product.id),
    );
    if (available)
      setLines((current) => [
        ...current,
        {
          product_id: available.id,
          quantity: 1,
          unit_price: Number(available.sale_price),
        },
      ]);
  };
  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerId || !warehouseId || lines.length === 0) {
      setError("Selecciona un cliente, un almacén y al menos un producto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<Sale>("/sales", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          number,
          customer_id: customerId,
          warehouse_id: warehouseId,
          lines,
          note: note || null,
        }),
      });
      setSales((current) => [created, ...current]);
      setIsOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar la venta.",
      );
    } finally {
      setSaving(false);
    }
  };
  const nameFor = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const openBilling = async (sale: Sale) => {
    setError(null);
    setBillingSale(sale);
    setBillingDocument(null);
    setVoidReason("Anulación solicitada desde EnterpriseCloud");
    try {
      const document = await apiFetch<ElectronicDocument | null>(`/sales/${sale.id}/electronic-document`, options);
      setBillingDocument(document);
      setBillingType(document?.document_type ?? "03");
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 404)) {
        setError(cause instanceof Error ? cause.message : "No se pudo consultar el comprobante.");
      }
    }
  };
  const issueDocument = async () => {
    if (!billingSale) return;
    setBillingBusy(true);
    setError(null);
    try {
      const document = await apiFetch<ElectronicDocument>(`/sales/${billingSale.id}/electronic-document`, {
        ...options, method: "POST", body: JSON.stringify({ document_type: billingType }),
      });
      setBillingDocument(document);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo emitir el comprobante.");
    } finally { setBillingBusy(false); }
  };
  const refreshDocument = async () => {
    if (!billingSale) return;
    setBillingBusy(true);
    try {
      const document = await apiFetch<ElectronicDocument>(`/sales/${billingSale.id}/electronic-document/refresh`, { ...options, method: "POST" });
      setBillingDocument(document);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el estado.");
    } finally { setBillingBusy(false); }
  };
  const voidDocument = async () => {
    if (!billingSale || !billingDocument || !voidReason.trim()) return;
    setBillingBusy(true);
    setError(null);
    try {
      const document = await apiFetch<ElectronicDocument>(`/sales/${billingSale.id}/electronic-document/void`, {
        ...options, method: "POST", body: JSON.stringify({ reason: voidReason.trim() }),
      });
      setBillingDocument(document);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo solicitar la anulación.");
    } finally { setBillingBusy(false); }
  };
  const billingStatus = (value: string) => ({ pending: "Pendiente", accepted: "Aceptado", rejected: "Rechazado", exception: "Con excepción", void_pending: "Anulación pendiente", voided: "Anulado", error: "Error" }[value] ?? value);
  return (
    <section className="module-page">
      <div className="module-heading">
        <div>
          <button className="back-link" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">OPERACIÓN COMERCIAL</p>
          <h1>Ventas</h1>
          <p className="subtitle">
            Registra operaciones y consulta las ventas procesadas de la empresa.
          </p>
        </div>
        <button className="primary-button" onClick={openNew}>
          <Plus size={18} /> Nueva venta
        </button>
      </div>
      <section className="customer-summary">
        <article>
          <span className="summary-icon">
            <ReceiptText size={19} />
          </span>
          <div>
            <small>VENTAS REGISTRADAS</small>
            <strong>{sales.length}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon green">
            <ShoppingCart size={19} />
          </span>
          <div>
            <small>VENTA ACUMULADA</small>
            <strong>
              {currency.format(
                sales.reduce((sum, sale) => sum + Number(sale.total), 0),
              )}
            </strong>
          </div>
        </article>
      </section>
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">HISTORIAL</p>
            <h2>Ventas recientes</h2>
          </div>
          <span className="table-count">{sales.length} registros</span>
        </div>
        {error && !isOpen && (
          <div className="module-error">
            {error}
            <button onClick={() => void load()}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div className="module-state">
            <LoaderCircle className="spin" size={22} /> Cargando ventas…
          </div>
        ) : sales.length === 0 ? (
          <div className="module-state">
            <ShoppingCart size={28} />
            <strong>Aún no hay ventas</strong>
            <span>
              Registra una venta cuando tengas clientes, productos y almacenes
              disponibles.
            </span>
            <button className="text-button" onClick={openNew}>
              Crear venta
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>CLIENTE</th>
                  <th>ESTADO</th>
                  <th>TOTAL</th>
                  <th>NOTA</th>
                  <th aria-label="Facturación electrónica" />
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>{sale.number}</strong>
                    </td>
                    <td>{nameFor(sale.customer_id)}</td>
                    <td>
                      <span className="status-pill active">
                        {sale.status === "posted" ? "Procesada" : sale.status}
                      </span>
                    </td>
                    <td>
                      <strong>{currency.format(Number(sale.total))}</strong>
                    </td>
                    <td>{sale.note || "—"}</td>
                    <td><button className="table-action-button" onClick={() => void openBilling(sale)}><FileText size={15} /> Comprobante</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      {isOpen && (
        <div className="modal-layer">
          <section
            className="sale-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nueva venta"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">OPERACIÓN COMERCIAL</p>
                <h2>Nueva venta</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="sale-form">
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
                    {warehouses.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} · {store.code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Cliente
                <select
                  required
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.code}
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
                    lines.length === products.length || products.length === 0
                  }
                >
                  <Plus size={15} /> Agregar línea
                </button>
              </div>
              <div className="sale-lines">
                {lines.length === 0 ? (
                  <p className="line-empty">
                    Agrega al menos un producto a la venta.
                  </p>
                ) : (
                  lines.map((line, index) => (
                    <div className="sale-line" key={line.product_id}>
                      <select
                        value={line.product_id}
                        onChange={(event) => {
                          const item = products.find(
                            (product) => product.id === event.target.value,
                          );
                          updateLine(index, {
                            product_id: event.target.value,
                            unit_price: Number(item?.sale_price ?? 0),
                          });
                        }}
                      >
                        <option value="">Producto</option>
                        {products
                          .filter(
                            (product) =>
                              product.id === line.product_id ||
                              !lines.some(
                                (other) => other.product_id === product.id,
                              ),
                          )
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
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
                            updateLine(index, {
                              quantity: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Precio
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(event) =>
                            updateLine(index, {
                              unit_price: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <strong>
                        {currency.format(line.quantity * line.unit_price)}
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
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <label>
                Nota interna
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              {error && <p className="login-error">{error}</p>}
              <div className="sale-total">
                <span>Total de la venta</span>
                <strong>{currency.format(total)}</strong>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={saving}>
                  {saving ? "Registrando…" : "Registrar venta"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {billingSale && (
        <div className="modal-layer">
          <section className="sale-modal billing-modal" role="dialog" aria-modal="true" aria-label="Facturación electrónica">
            <div className="modal-header"><div><p className="eyebrow">FACTURACIÓN ELECTRÓNICA · DESARROLLO</p><h2>Comprobante de venta</h2></div><button className="icon-button" onClick={() => setBillingSale(null)} aria-label="Cerrar"><X size={20} /></button></div>
            <div className="billing-summary"><span>{billingSale.number}</span><strong>{nameFor(billingSale.customer_id)}</strong><b>{currency.format(Number(billingSale.total))}</b></div>
            {billingDocument ? <div className="billing-result"><span className={`status-pill ${billingDocument.status === "accepted" ? "active" : "inactive"}`}>{billingStatus(billingDocument.status)}</span><strong>{billingDocument.document_type === "01" ? "Factura" : "Boleta"} {billingDocument.series}-{billingDocument.correlative}</strong><small>Documento de prueba APISUNAT · {billingDocument.file_name}</small>{billingDocument.last_error && <p className="login-error">{billingDocument.last_error}</p>}<div className="billing-links">{billingDocument.xml_url && <a href={billingDocument.xml_url} target="_blank" rel="noreferrer">XML</a>}{billingDocument.cdr_url && <a href={billingDocument.cdr_url} target="_blank" rel="noreferrer">CDR</a>}<button className="secondary-button" onClick={() => void refreshDocument()} disabled={billingBusy}><RefreshCw size={15} className={billingBusy ? "spin" : ""} /> Actualizar estado</button></div>{!['voided', 'void_pending'].includes(billingDocument.status) && <div className="billing-void"><label>Motivo de anulación<input value={voidReason} maxLength={250} onChange={(event) => setVoidReason(event.target.value)} /></label><button className="secondary-button danger-button" onClick={() => void voidDocument()} disabled={billingBusy || !voidReason.trim()}>Solicitar anulación</button></div>}</div> : <div className="billing-choice"><p>Elige el tipo de comprobante. Se emitirá únicamente en el ambiente de pruebas.</p><label>Tipo de comprobante<select value={billingType} onChange={(event) => setBillingType(event.target.value as "01" | "03")}><option value="03">Boleta de venta</option><option value="01">Factura</option></select></label><small>Factura requiere RUC de 11 dígitos; Boleta requiere DNI o RUC registrado en el cliente.</small><button className="primary-button" onClick={() => void issueDocument()} disabled={billingBusy}>{billingBusy ? "Emitiendo…" : "Emitir comprobante de prueba"}</button></div>}
          </section>
        </div>
      )}
    </section>
  );
}
