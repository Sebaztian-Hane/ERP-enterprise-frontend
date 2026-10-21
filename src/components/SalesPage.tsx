import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FileText,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, apiFetch } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Customer = { id: string; code: string; name: string };
type CustomerLookup = { existing_customer_id: string | null; tax_id: string; name: string; address: string; document_type: "DNI" | "RUC" };
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

type PickerOption = { id: string; primary: string; secondary?: string };

function EntityPicker({ label, placeholder, value, options, onChange, required = false }: { label: string; placeholder: string; value: string; options: PickerOption[]; onChange: (id: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const matches = options.filter((option) => `${option.primary} ${option.secondary ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 8);
  const choose = (id: string) => { onChange(id); setQuery(""); setOpen(false); };
  return <label className="entity-picker"><span>{label}</span><div className="entity-picker-control"><Search size={16} /><input required={required} value={open ? query : (selected?.primary ?? "")} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder={placeholder} aria-autocomplete="list" aria-expanded={open} role="combobox" /><button type="button" className="entity-picker-clear" onClick={() => { onChange(""); setQuery(""); setOpen(true); }} aria-label={`Limpiar ${label}`}>×</button></div>{open && <div className="entity-picker-menu" role="listbox">{matches.length ? matches.map((option) => <button type="button" role="option" aria-selected={value === option.id} key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.id)}><strong>{option.primary}</strong>{option.secondary && <small>{option.secondary}</small>}</button>) : <p>Sin coincidencias. Ajusta la búsqueda.</p>}</div>}</label>;
}

export function SalesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "lookup">("existing");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLookupBusy, setCustomerLookupBusy] = useState(false);
  const [customerLookupHint, setCustomerLookupHint] = useState<string | null>(null);
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
  const load = async (targetPage = page) => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [history, people, items, stores] = await Promise.all([
        fetchPage<Sale, "sales">("/sales", "sales", targetPage, options),
        apiFetch<Customer[]>("/customers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/sales/warehouses", options),
      ]);
      setSales(history.sales); setMeta(history.meta);
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
  }, [session?.access_token, tenantId, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines],
  );
  const openNew = () => {
    setError(null);
    setCustomerId(customers[0]?.id ?? "");
    setCustomerMode(customers.length ? "existing" : "lookup");
    setCustomerTaxId(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerLookupHint(null);
    setWarehouseId(warehouses[0]?.id ?? "");
    setNumber(
      `V-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(meta.total + 1).padStart(3, "0")}`,
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
    if ((!customerId && customerMode === "existing") || (!customerTaxId || !customerName) && customerMode === "lookup" || !warehouseId || lines.length === 0) {
      setError("Completa el cliente, almacén y al menos un producto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch<Sale>("/sales", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          number,
          ...(customerMode === "existing" ? { customer_id: customerId } : { customer: { tax_id: customerTaxId, name: customerName, email: customerEmail || null, phone: customerPhone || null } }),
          warehouse_id: warehouseId,
          lines,
          note: note || null,
        }),
      });
      setPage(1);
      await load(1);
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
  const lookupCustomer = async () => {
    const taxId = customerTaxId.trim();
    if (![8, 11].includes(taxId.length) || !/^\d+$/.test(taxId)) { setCustomerLookupHint("Ingresa un DNI de 8 dígitos o RUC de 11 dígitos."); return; }
    setCustomerLookupBusy(true); setCustomerLookupHint(null); setError(null);
    try {
      const result = await apiFetch<CustomerLookup>(`/sales/customer-lookup/${taxId}`, options);
      setCustomerName(result.name);
      if (result.existing_customer_id) { setCustomerId(result.existing_customer_id); setCustomerMode("existing"); setCustomerLookupHint("Cliente existente encontrado: se reutilizará en esta venta."); }
      else setCustomerLookupHint(`${result.document_type} consultado. Verifica los datos antes de registrar la venta.`);
    } catch (cause) { setCustomerLookupHint(cause instanceof Error ? cause.message : "No se pudo consultar el documento."); }
    finally { setCustomerLookupBusy(false); }
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
            <strong>{meta.total}</strong>
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
      <DataMigrationPanel module="sales" onImported={() => { setPage(1); return load(1); }} />
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">HISTORIAL</p>
            <h2>Ventas recientes</h2>
          </div>
          <span className="table-count">{meta.total} registros</span>
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
          <><div className="table-wrap">
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
          </div><TablePagination meta={meta} label="ventas" onPageChange={setPage} /></>
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
                <EntityPicker label="Almacén" placeholder="Busca un almacén" required value={warehouseId} onChange={setWarehouseId} options={warehouses.map((store) => ({ id: store.id, primary: store.name, secondary: store.code }))} />
              </div>
              <section className="sale-customer-card">
                <div className="sale-customer-heading"><div><span>Cliente</span><small>Usa un cliente registrado o consulta DNI/RUC.</small></div><div className="segmented-control"><button type="button" className={customerMode === "existing" ? "is-active" : ""} onClick={() => setCustomerMode("existing")}>Existente</button><button type="button" className={customerMode === "lookup" ? "is-active" : ""} onClick={() => setCustomerMode("lookup")}>Nuevo DNI/RUC</button></div></div>
                {customerMode === "existing" ? <EntityPicker label="Cliente registrado" placeholder="Busca por nombre, código o documento" required value={customerId} onChange={setCustomerId} options={customers.map((customer) => ({ id: customer.id, primary: customer.name, secondary: customer.code }))} /> : <div className="customer-lookup-fields"><label>Documento DNI o RUC<input inputMode="numeric" maxLength={11} value={customerTaxId} onChange={(event) => setCustomerTaxId(event.target.value.replace(/\D/g, ""))} placeholder="Ingresa DNI o RUC" /></label><button type="button" className="secondary-button" onClick={() => void lookupCustomer()} disabled={customerLookupBusy}>{customerLookupBusy ? "Consultando…" : "Consultar"}</button><label className="wide">Nombre o razón social<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Se completa al consultar" /></label><label>Correo (opcional)<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label><label>Teléfono (opcional)<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>{customerLookupHint && <p className="customer-lookup-hint">{customerLookupHint}</p>}</div>}
              </section>
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
                      <EntityPicker label="Producto" placeholder="Busca por nombre o SKU" value={line.product_id} onChange={(productId) => { const item = products.find((product) => product.id === productId); updateLine(index, { product_id: productId, unit_price: Number(item?.sale_price ?? 0) }); }} options={products.filter((product) => product.id === line.product_id || !lines.some((other) => other.product_id === product.id)).map((product) => ({ id: product.id, primary: product.name, secondary: product.sku }))} />
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
