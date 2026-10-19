import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Factory,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  ReceiptText,
  ShoppingBag,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Supplier = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  is_active: boolean;
};
type Product = { id: string; sku: string; name: string; sale_price: string };
type Warehouse = { id: string; name: string; code: string };
type Purchase = {
  id: string;
  number: string;
  supplier_id: string;
  warehouse_id: string;
  status: string;
  total: string;
  note: string | null;
  supplier_document_type: string | null;
  supplier_document_series: string | null;
  supplier_document_number: string | null;
  supplier_document_date: string | null;
  supplier_tax_amount: string | null;
};
type Line = { product_id: string; quantity: number; unit_cost: number };
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function PurchasesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<
    "purchase" | "supplier" | "supplier-edit" | null
  >(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierDocument, setSupplierDocument] = useState({ type: "01", series: "", number: "", date: "", tax: "" });
  const [supplier, setSupplier] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    tax_id: "",
  });
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, s, productsData, stores] = await Promise.all([
        apiFetch<Purchase[]>("/purchases", options),
        apiFetch<Supplier[]>("/suppliers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/purchases/warehouses", options),
      ]);
      setPurchases(p);
      setSuppliers(s);
      setProducts(productsData);
      setWarehouses(stores);
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
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0),
    [lines],
  );
  const supplierName = (id: string) =>
    suppliers.find((item) => item.id === id)?.name ?? "Proveedor";
  const openPurchase = () => {
    setError(null);
    setSupplierId(suppliers[0]?.id ?? "");
    setWarehouseId(warehouses[0]?.id ?? "");
    setNumber(
      `C-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(purchases.length + 1).padStart(3, "0")}`,
    );
    setNote("");
    setLines([]);
    setSupplierDocument({ type: "01", series: "", number: "", date: "", tax: "" });
    setMode("purchase");
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
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, ...patch } : line,
      ),
    );
  const savePurchase = async (event: FormEvent) => {
    event.preventDefault();
    if (!supplierId || !warehouseId || !lines.length) {
      setError("Selecciona proveedor, almacén y al menos un producto.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch<Purchase>("/purchases", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          number,
          supplier_id: supplierId,
          warehouse_id: warehouseId,
          lines,
          note: note || null,
          supplier_document_type: supplierDocument.number ? supplierDocument.type : null,
          supplier_document_series: supplierDocument.series || null,
          supplier_document_number: supplierDocument.number || null,
          supplier_document_date: supplierDocument.date || null,
          supplier_tax_amount: supplierDocument.tax || null,
        }),
      });
      setPurchases((current) => [created, ...current]);
      setMode(null);
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
  const saveSupplier = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await apiFetch<Supplier>(
        editingSupplierId ? "/suppliers/" + editingSupplierId : "/suppliers",
        {
          ...options,
          method: editingSupplierId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...supplier,
            email: supplier.email || null,
            phone: supplier.phone || null,
            tax_id: supplier.tax_id || null,
          }),
        },
      );
      setSuppliers((current) =>
        (editingSupplierId
          ? current.map((item) => (item.id === created.id ? created : item))
          : [...current, created]
        ).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSupplier({ code: "", name: "", email: "", phone: "", tax_id: "" });
      setEditingSupplierId(null);
      setMode(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible crear el proveedor.",
      );
    } finally {
      setSaving(false);
    }
  };
  const editSupplier = (item: Supplier) => {
    setError(null);
    setEditingSupplierId(item.id);
    setSupplier({
      code: item.code,
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      tax_id: item.tax_id ?? "",
    });
    setMode("supplier-edit");
  };
  const toggleSupplier = async (item: Supplier) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<Supplier>("/suppliers/" + item.id, {
        ...options,
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      setSuppliers((current) =>
        current.map((currentItem) =>
          currentItem.id === saved.id ? saved : currentItem,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el proveedor.",
      );
    } finally {
      setSaving(false);
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
          <h1>Compras</h1>
          <p className="subtitle">
            Gestiona proveedores y recibe mercancía en los almacenes de tu
            empresa.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setError(null);
              setMode("supplier");
            }}
          >
            <Factory size={16} /> Proveedor
          </button>
          <button className="primary-button" onClick={openPurchase}>
            <Plus size={18} /> Nueva compra
          </button>
        </div>
      </div>
      <section className="customer-summary">
        <article>
          <span className="summary-icon">
            <Factory size={19} />
          </span>
          <div>
            <small>PROVEEDORES ACTIVOS</small>
            <strong>{suppliers.filter((item) => item.is_active).length}</strong>
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
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">MAESTRO DE COMPRAS</p>
            <h2>Proveedores</h2>
          </div>
          <span className="table-count">{suppliers.length} registros</span>
        </div>
        <div className="table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>PROVEEDOR</th>
                <th>CONTACTO</th>
                <th>ESTADO</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.code}</small>
                  </td>
                  <td>{item.email || item.phone || "—"}</td>
                  <td>
                    <span
                      className={`status-pill ${item.is_active ? "active" : "inactive"}`}
                    >
                      {item.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button muted"
                        onClick={() => editSupplier(item)}
                        aria-label="Editar proveedor"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button muted"
                        onClick={() => void toggleSupplier(item)}
                        disabled={saving}
                        aria-label="Cambiar estado del proveedor"
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">RECEPCIONES</p>
            <h2>Compras registradas</h2>
          </div>
          <span className="table-count">{purchases.length} registros</span>
        </div>
        {error && !mode && (
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
              Registra proveedores y productos para comenzar a recibir
              mercancía.
            </span>
            <button className="text-button" onClick={openPurchase}>
              Crear compra
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
                  <th>NOTA</th>
                  <th>COMPROBANTE</th>
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
                      <span className="status-pill active">
                        {item.status === "received" ? "Recibida" : item.status}
                      </span>
                    </td>
                    <td>
                      <strong>{money.format(Number(item.total))}</strong>
                    </td>
                    <td>{item.note || "—"}</td>
                    <td>{item.supplier_document_number ? <><strong>{item.supplier_document_series}-{item.supplier_document_number}</strong><small>{item.supplier_document_type === "01" ? "Factura proveedor" : "Documento proveedor"}</small></> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      {mode && (
        <div className="modal-layer">
          <section className="sale-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {mode === "supplier" || mode === "supplier-edit"
                    ? "PROVEEDORES"
                    : "RECEPCIÓN DE MERCANCÍA"}
                </p>
                <h2>
                  {mode === "supplier"
                    ? "Nuevo proveedor"
                    : mode === "supplier-edit"
                      ? "Editar proveedor"
                      : "Nueva compra"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setMode(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            {mode === "supplier" || mode === "supplier-edit" ? (
              <form className="customer-form" onSubmit={saveSupplier}>
                <label>
                  Código
                  <input
                    required
                    value={supplier.code}
                    onChange={(e) =>
                      setSupplier((s) => ({ ...s, code: e.target.value }))
                    }
                    placeholder="PRV-001"
                  />
                </label>
                <label>
                  Nombre
                  <input
                    required
                    value={supplier.name}
                    onChange={(e) =>
                      setSupplier((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Proveedor comercial"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Correo
                    <input
                      type="email"
                      value={supplier.email}
                      onChange={(e) =>
                        setSupplier((s) => ({ ...s, email: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      value={supplier.phone}
                      onChange={(e) =>
                        setSupplier((s) => ({ ...s, phone: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  RFC / ID fiscal
                  <input
                    value={supplier.tax_id}
                    onChange={(e) =>
                      setSupplier((s) => ({ ...s, tax_id: e.target.value }))
                    }
                  />
                </label>
                <FormError error={error} />
                <Actions
                  saving={saving}
                  close={() => setMode(null)}
                  label="Guardar proveedor"
                />
              </form>
            ) : (
              <form className="sale-form" onSubmit={savePurchase}>
                <div className="form-grid">
                  <label>
                    Folio
                    <input
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </label>
                  <label>
                    Almacén
                    <select
                      required
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                    >
                      <option value="">Selecciona</option>
                      {warehouses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
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
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {suppliers
                      .filter((item) => item.is_active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
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
                  >
                    <Plus size={15} /> Agregar línea
                  </button>
                </div>
                <div className="sale-lines">
                  {lines.length ? (
                    lines.map((line, index) => (
                      <div className="sale-line" key={line.product_id}>
                        <select
                          value={line.product_id}
                          onChange={(e) => {
                            const p = products.find(
                              (item) => item.id === e.target.value,
                            );
                            updateLine(index, {
                              product_id: e.target.value,
                              unit_cost: Number(p?.sale_price ?? 0),
                            });
                          }}
                        >
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
                                {item.name}
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
                            onChange={(e) =>
                              updateLine(index, {
                                quantity: Number(e.target.value),
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
                            onChange={(e) =>
                              updateLine(index, {
                                unit_cost: Number(e.target.value),
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
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="line-empty">
                      Agrega un producto a la compra.
                    </p>
                  )}
                </div>
                <label>
                  Nota
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Opcional"
                  />
                </label>
                <div className="purchase-document-fields">
                  <div><p className="card-label">COMPROBANTE DEL PROVEEDOR</p><small>Registra la factura o boleta recibida. No se emite desde el ERP.</small></div>
                  <div className="form-grid">
                    <label>Tipo<select value={supplierDocument.type} onChange={(e) => setSupplierDocument((current) => ({ ...current, type: e.target.value }))}><option value="01">Factura</option><option value="03">Boleta</option><option value="07">Nota de crédito</option></select></label>
                    <label>Fecha de emisión<input type="date" value={supplierDocument.date} onChange={(e) => setSupplierDocument((current) => ({ ...current, date: e.target.value }))} /></label>
                  </div>
                  <div className="form-grid">
                    <label>Serie<input maxLength={8} value={supplierDocument.series} onChange={(e) => setSupplierDocument((current) => ({ ...current, series: e.target.value.toUpperCase() }))} placeholder="F001" /></label>
                    <label>Número<input maxLength={16} value={supplierDocument.number} onChange={(e) => setSupplierDocument((current) => ({ ...current, number: e.target.value }))} placeholder="00000001" /></label>
                  </div>
                  <label>IGV del comprobante<input type="number" min="0" step="0.01" value={supplierDocument.tax} onChange={(e) => setSupplierDocument((current) => ({ ...current, tax: e.target.value }))} placeholder="Opcional" /></label>
                </div>
                <FormError error={error} />
                <div className="sale-total">
                  <span>Total de la compra</span>
                  <strong>{money.format(total)}</strong>
                </div>
                <Actions
                  saving={saving}
                  close={() => setMode(null)}
                  label="Recibir compra"
                />
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
function FormError({ error }: { error: string | null }) {
  return error ? <p className="login-error">{error}</p> : null;
}
function Actions({
  saving,
  close,
  label,
}: {
  saving: boolean;
  close: () => void;
  label: string;
}) {
  return (
    <div className="modal-actions">
      <button type="button" className="secondary-button" onClick={close}>
        Cancelar
      </button>
      <button className="primary-button" disabled={saving}>
        {saving ? "Guardando…" : label}
      </button>
    </div>
  );
}
