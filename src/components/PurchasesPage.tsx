import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  LoaderCircle,
  Plus,
  ReceiptText,
  ShoppingBag,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";
import { DataMigrationPanel } from "./DataMigrationPanel";
import { EntityPicker } from "./EntityPicker";

type Supplier = { id: string; name: string; is_active: boolean };
type Product = { id: string; name: string; sale_price: string; tracking_mode: "none" | "lot" | "serial" };
type Warehouse = { id: string; name: string };
type PaymentTerm = { id: string; code: string; name: string; days_due: number };
type CostCenter = { id: string; code: string; name: string };
type Purchase = {
  id: string;
  number: string;
  supplier_id: string;
  status: string;
  total: string;
  note: string | null;
  supplier_document_type: string | null;
  supplier_document_series: string | null;
  supplier_document_number: string | null;
};
type Line = { product_id: string; quantity: number; unit_cost: number; lot_number?: string; expiration_date?: string; serial_text?: string };
type PurchaseDraft = {
  supplierId: string; warehouseId: string; paymentTermId: string; costCenterId: string; note: string;
  lines: Line[]; document: { type: string; series: string; number: string; date: string; tax: string };
};
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function PurchasesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentTermId, setPaymentTermId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [document, setDocument] = useState({
    type: "01",
    series: "",
    number: "",
    date: "",
    tax: "",
  });
  const [returningPurchase, setReturningPurchase] = useState<Purchase | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returningBusy, setReturningBusy] = useState(false);
  const draftKey = tenantId && session?.user.id ? `enterprisecloud.draft.purchase.${tenantId}.${session.user.id}` : null;
  const clearDraft = () => { if (draftKey) localStorage.removeItem(draftKey); };
  const restoreDraft = (): PurchaseDraft | null => {
    if (!draftKey) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(draftKey) ?? "null") as Partial<PurchaseDraft> | null;
      if (!parsed || !Array.isArray(parsed.lines) || !parsed.document) return null;
      return {
        supplierId: parsed.supplierId ?? "", warehouseId: parsed.warehouseId ?? "", paymentTermId: parsed.paymentTermId ?? "", costCenterId: parsed.costCenterId ?? "", note: parsed.note ?? "",
        lines: parsed.lines.filter((line): line is Line => Boolean(line && typeof line.product_id === "string" && Number.isFinite(Number(line.quantity)) && Number.isFinite(Number(line.unit_cost)))),
        document: { type: parsed.document.type ?? "01", series: parsed.document.series ?? "", number: parsed.document.number ?? "", date: parsed.document.date ?? "", tax: parsed.document.tax ?? "" },
      };
    } catch { return null; }
  };
  const load = async (targetPage = page) => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, s, items, stores, terms, centers] = await Promise.all([
        fetchPage<Purchase, "purchases">("/purchases", "purchases", targetPage, options),
        apiFetch<Supplier[]>("/suppliers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/purchases/warehouses", options),
        apiFetch<PaymentTerm[]>("/purchases/payment-terms", options),
        apiFetch<CostCenter[]>("/purchases/cost-centers", options),
      ]);
      setPurchases(p.purchases); setMeta(p.meta);
      setSuppliers(s);
      setProducts(items);
      setWarehouses(stores);
      setPaymentTerms(terms);
      setCostCenters(centers);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar las compras.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen || !draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify({ supplierId, warehouseId, paymentTermId, costCenterId, note, lines, document } satisfies PurchaseDraft));
  }, [isOpen, draftKey, supplierId, warehouseId, paymentTermId, costCenterId, note, lines, document]);
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0),
    [lines],
  );
  const supplierName = (id: string) =>
    suppliers.find((item) => item.id === id)?.name ?? "Proveedor";
  const openPurchase = () => {
    if (!suppliers.some((item) => item.is_active)) {
      setError(
        "Primero registra y activa un proveedor desde el módulo Proveedores.",
      );
      return;
    }
    setError(null);
    const saved = restoreDraft();
    if (saved) {
      setSupplierId(saved.supplierId); setWarehouseId(saved.warehouseId); setPaymentTermId(saved.paymentTermId); setCostCenterId(saved.costCenterId); setNote(saved.note); setLines(saved.lines); setDocument(saved.document);
      setIsOpen(true); return;
    }
    setSupplierId(suppliers.find((item) => item.is_active)?.id ?? "");
    setWarehouseId(warehouses[0]?.id ?? "");
    setPaymentTermId("");
    setCostCenterId(costCenters.find((center) => center.code === "GENERAL")?.id ?? costCenters[0]?.id ?? "");
    setNote("");
    setLines([]);
    setDocument({ type: "01", series: "", number: "", date: "", tax: "" });
    setIsOpen(true);
  };
  const addLine = () => {
    const available = products.find(
      (item) => !lines.some((line) => line.product_id === item.id),
    );
    if (available)
      setLines((current) => [
        ...current,
        {
          product_id: available.id,
          quantity: 1,
          unit_cost: Number(available.sale_price),
        },
      ]);
  };
  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line, itemIndex) =>
        itemIndex === index ? { ...line, ...patch } : line,
      ),
    );
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierId || !warehouseId || !lines.length) {
      setError("Selecciona proveedor, almacén y al menos un producto.");
      return;
    }
    setSaving(true);
    try {
      await postIdempotent<Purchase>("/purchases", {
        ...options,
        body: JSON.stringify({
          supplier_id: supplierId,
          warehouse_id: warehouseId,
          lines: lines.map(({ serial_text, ...line }) => ({ ...line, lot_number: line.lot_number || null, expiration_date: line.expiration_date || null, serial_numbers: serial_text ? serial_text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean) : null })),
          note: note || null,
          supplier_document_type: document.number ? document.type : null,
          supplier_document_series: document.series || null,
          supplier_document_number: document.number || null,
          supplier_document_date: document.date || null,
          supplier_tax_amount: document.tax || null,
          payment_term_id: paymentTermId || null,
          cost_center_id: costCenterId || null,
        }),
      });
      setPage(1);
      await load(1);
      clearDraft();
      setIsOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar la compra.",
      );
    } finally {
      setSaving(false);
    }
  };
  const returnPurchase = async () => {
    if (!returningPurchase || returnReason.trim().length < 3) return;
    setReturningBusy(true); setError(null);
    try {
      await postIdempotent(`/purchases/${returningPurchase.id}/return`, { ...options, body: JSON.stringify({ reason: returnReason.trim() }) });
      setReturningPurchase(null); setReturnReason(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la devolución."); }
    finally { setReturningBusy(false); }
  };
  return (
    <section className="module-page">
      <div className="module-heading">
        <div>
          <button className="back-link" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">ABASTECIMIENTO</p>
          <h1>Compras</h1>
          <p className="subtitle">
            Registra recepciones, actualiza existencias y conserva el
            comprobante recibido.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={() => {
              window.location.hash = "proveedores";
            }}
          >
            Gestionar proveedores
          </button>
          <button className="primary-button" onClick={openPurchase}>
            <Plus size={18} /> Nueva compra
          </button>
        </div>
      </div>
      <section className="customer-summary">
        <article>
          <span className="summary-icon">
            <ReceiptText size={19} />
          </span>
          <div>
            <small>COMPRAS REGISTRADAS</small>
            <strong>{meta.total}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon green">
            <ShoppingBag size={19} />
          </span>
          <div>
            <small>COMPRAS ACUMULADAS</small>
            <strong>
              {money.format(
                purchases.reduce((sum, item) => sum + Number(item.total), 0),
              )}
            </strong>
          </div>
        </article>
      </section>
      <DataMigrationPanel module="purchases" onImported={() => { setPage(1); return load(1); }} />
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">RECEPCIONES</p>
            <h2>Compras registradas</h2>
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
            <LoaderCircle className="spin" size={22} /> Cargando compras…
          </div>
        ) : purchases.length === 0 ? (
          <div className="module-state">
            <ReceiptText size={28} />
            <strong>Aún no hay compras</strong>
            <span>
              Primero registra proveedores y luego recibe tus adquisiciones.
            </span>
            <button className="text-button" onClick={openPurchase}>
              Crear compra
            </button>
          </div>
        ) : (
          <><div className="table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>PROVEEDOR</th>
                  <th>ESTADO</th>
                  <th>TOTAL</th>
                  <th>NOTA</th>
                  <th>COMPROBANTE</th>
                  <th aria-label="Devolución" />
                </tr>
              </thead>
              <tbody>
                {purchases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.number}</strong>
                    </td>
                    <td>{supplierName(item.supplier_id)}</td>
                    <td>
                      <span className={`status-pill ${item.status === "returned" || item.status === "cancelled" ? "inactive" : "active"}`}>
                        {item.status === "received" ? "Recibida" : item.status === "returned" ? "Devuelta" : item.status}
                      </span>
                    </td>
                    <td>
                      <strong>{money.format(Number(item.total))}</strong>
                    </td>
                    <td>{item.note || "—"}</td>
                    <td>
                      {item.supplier_document_number ? (
                        <>
                          <strong>
                            {item.supplier_document_series}-
                            {item.supplier_document_number}
                          </strong>
                          <small>
                            {item.supplier_document_type === "01"
                              ? "Factura proveedor"
                              : "Documento proveedor"}
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{item.status === "received" ? <button className="text-button danger-button" onClick={() => { setReturnReason(""); setReturningPurchase(item); }}>Devolver</button> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div><TablePagination meta={meta} label="compras" onPageChange={setPage} /></>
        )}
      </article>
      {isOpen && (
        <div className="modal-layer">
          <section className="sale-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="eyebrow">RECEPCIÓN DE MERCANCÍA</p>
                <h2>Nueva compra</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <form className="sale-form" onSubmit={save}>
              <div className="form-grid">
                <EntityPicker label="Almacén" placeholder="Busca un almacén" required value={warehouseId} onChange={setWarehouseId} options={warehouses.map((item) => ({ id: item.id, primary: item.name }))} />
                <p className="field-help sale-folio-help">El folio se asignará automáticamente según la entidad, sucursal y tipo de documento.</p>
              </div>
              <EntityPicker label="Proveedor" placeholder="Busca un proveedor" required value={supplierId} onChange={setSupplierId} options={suppliers.filter((item) => item.is_active).map((item) => ({ id: item.id, primary: item.name }))} />
              <EntityPicker
                label="Condición de pago (opcional)"
                placeholder="Vencimiento al contado"
                value={paymentTermId}
                onChange={setPaymentTermId}
                options={paymentTerms.map((term) => ({
                  id: term.id,
                  primary: term.name,
                  secondary: term.code + " · " + term.days_due + " día(s)",
                }))}
              />
              <EntityPicker
                label="Centro de costo"
                placeholder="Operación general"
                required
                value={costCenterId}
                onChange={setCostCenterId}
                options={costCenters.map((center) => ({
                  id: center.id,
                  primary: center.name,
                  secondary: center.code,
                }))}
              />
              {paymentTermId && <p className="field-help">El vencimiento se calculará desde la fecha de emisión del comprobante; si no la indicas, se usará la fecha de recepción.</p>}
              <div className="sale-lines-header">
                <span>Productos</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={addLine}
                >
                  <Plus size={15} /> Agregar línea
                </button>
              </div>
              <div className="sale-lines">
                {lines.length ? (
                  lines.map((line, index) => (
                    <div className="sale-line-wrap" key={line.product_id}><div className="sale-line">
                      <EntityPicker label="Producto" placeholder="Busca un producto" value={line.product_id} onChange={(productId) => { const product = products.find((item) => item.id === productId); updateLine(index, { product_id: productId, unit_cost: Number(product?.sale_price ?? 0), lot_number: "", expiration_date: "", serial_text: "" }); }} options={products.filter((item) => item.id === line.product_id || !lines.some((other) => other.product_id === item.id)).map((item) => ({ id: item.id, primary: item.name }))} />
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
                        Costo
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(event) =>
                            updateLine(index, {
                              unit_cost: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <strong>
                        {money.format(line.quantity * line.unit_cost)}
                      </strong>
                      <button
                        type="button"
                        className="icon-button remove-line"
                        onClick={() =>
                          setLines((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <X size={17} />
                      </button>
                    </div>{(() => { const tracking = products.find((item) => item.id === line.product_id)?.tracking_mode ?? "none"; return tracking === "lot" ? <div className="tracking-line-fields"><input required placeholder="Número de lote" value={line.lot_number ?? ""} onChange={(event) => updateLine(index, { lot_number: event.target.value })} /><input type="date" value={line.expiration_date ?? ""} onChange={(event) => updateLine(index, { expiration_date: event.target.value })} /></div> : tracking === "serial" ? <div className="tracking-line-fields"><input required placeholder="Series, una por línea o coma" value={line.serial_text ?? ""} onChange={(event) => updateLine(index, { serial_text: event.target.value })} /></div> : null; })()}</div>
                  ))
                ) : (
                  <p className="line-empty">Agrega un producto a la compra.</p>
                )}
              </div>
              <label>
                Nota
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <div className="purchase-document-fields">
                <div>
                  <p className="card-label">COMPROBANTE DEL PROVEEDOR</p>
                  <small>
                    Registra la factura o boleta recibida. No se emite desde el
                    ERP.
                  </small>
                </div>
                <div className="form-grid">
                  <label>
                    Tipo
                    <select
                      value={document.type}
                      onChange={(event) =>
                        setDocument((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                    >
                      <option value="01">Factura</option>
                      <option value="03">Boleta</option>
                      <option value="07">Nota de crédito</option>
                    </select>
                  </label>
                  <label>
                    Fecha de emisión
                    <input
                      type="date"
                      value={document.date}
                      onChange={(event) =>
                        setDocument((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Serie
                    <input
                      maxLength={8}
                      value={document.series}
                      onChange={(event) =>
                        setDocument((current) => ({
                          ...current,
                          series: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="F001"
                    />
                  </label>
                  <label>
                    Número
                    <input
                      maxLength={16}
                      value={document.number}
                      onChange={(event) =>
                        setDocument((current) => ({
                          ...current,
                          number: event.target.value,
                        }))
                      }
                      placeholder="00000001"
                    />
                  </label>
                </div>
                <label>
                  IGV del comprobante
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={document.tax}
                    onChange={(event) =>
                      setDocument((current) => ({
                        ...current,
                        tax: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </label>
              </div>
              {error && <p className="login-error">{error}</p>}
              <div className="sale-total">
                <span>Total de la compra</span>
                <strong>{money.format(total)}</strong>
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
                  {saving ? "Guardando…" : "Recibir compra"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {returningPurchase && <div className="modal-layer"><section className="customer-modal" role="dialog" aria-modal="true" aria-label="Devolver compra"><div className="modal-header"><div><p className="eyebrow">DEVOLUCIÓN A PROVEEDOR</p><h2>Devolver compra {returningPurchase.number}</h2></div><button className="icon-button" onClick={() => setReturningPurchase(null)} aria-label="Cerrar"><X size={20} /></button></div><div className="customer-form"><p className="field-help">Se revertirá completamente la recepción, la cuenta por pagar y el asiento. No se permite si existen pagos aplicados o si el stock ya fue consumido.</p><label>Motivo<input autoFocus minLength={3} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Describe el motivo de la devolución" /></label>{error && <p className="login-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setReturningPurchase(null)}>Cancelar</button><button type="button" className="danger-button" disabled={returningBusy || returnReason.trim().length < 3} onClick={() => void returnPurchase()}>{returningBusy ? "Registrando…" : "Confirmar devolución"}</button></div></div></section></div>}
    </section>
  );
}
