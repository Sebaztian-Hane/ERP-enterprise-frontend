import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronLeft,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Pencil,
  Plus,
  Power,
  SlidersHorizontal,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
};
type Product = { id: string; sku: string; name: string; unit: string };
type Stock = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: string;
};
type Availability = {
  product_id: string;
  warehouse_id: string;
  on_hand: string;
  reserved_quantity: string;
  available_quantity: string;
};
type Valuation = { product_id: string; quantity: string; inventory_value: string };
type Mode = "warehouse" | "warehouse-edit" | "adjustment" | "transfer" | null;

export function InventoryPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [valuation, setValuation] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(
    null,
  );
  const [destinationId, setDestinationId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [warehouseForm, setWarehouseForm] = useState({
    code: "",
    name: "",
    address: "",
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
      const [stores, catalog, quantities, available, valued] = await Promise.all([
        apiFetch<Warehouse[]>("/inventory/warehouses", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Stock[]>("/inventory/stock", options),
        apiFetch<Availability[]>("/operations/inventory/availability", options),
        apiFetch<Valuation[]>("/operations/inventory/valuation", options),
      ]);
      setWarehouses(stores);
      setProducts(catalog);
      setStock(quantities);
      setAvailability(available);
      setValuation(valued);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar inventario.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const productName = (id: string) =>
    products.find((item) => item.id === id)?.name ?? "Producto";
  const productSku = (id: string) =>
    products.find((item) => item.id === id)?.sku ?? "—";
  const warehouseName = (id: string) =>
    warehouses.find((item) => item.id === id)?.name ?? "Almacén";
  const totalUnits = useMemo(
    () => stock.reduce((sum, item) => sum + Number(item.quantity), 0),
    [stock],
  );
  const totalReserved = useMemo(
    () => availability.reduce((sum, item) => sum + Number(item.reserved_quantity), 0),
    [availability],
  );
  const totalValue = useMemo(
    () => valuation.reduce((sum, item) => sum + Number(item.inventory_value), 0),
    [valuation],
  );
  const availabilityFor = (item: Stock) =>
    availability.find(
      (value) => value.product_id === item.product_id && value.warehouse_id === item.warehouse_id,
    );
  const open = (next: Mode) => {
    setError(null);
    setEditingWarehouseId(null);
    setProductId(products[0]?.id ?? "");
    setWarehouseId(warehouses[0]?.id ?? "");
    setDestinationId(warehouses[1]?.id ?? "");
    setQuantity(next === "adjustment" ? "0" : "1");
    setReference("");
    setNote("");
    if (next === "warehouse")
      setWarehouseForm({ code: "", name: "", address: "" });
    setMode(next);
  };
  const editWarehouse = (item: Warehouse) => {
    setError(null);
    setEditingWarehouseId(item.id);
    setWarehouseForm({
      code: item.code,
      name: item.name,
      address: item.address ?? "",
    });
    setMode("warehouse-edit");
  };
  const toggleWarehouse = async (item: Warehouse) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<Warehouse>(
        "/inventory/warehouses/" + item.id,
        {
          ...options,
          method: "PATCH",
          body: JSON.stringify({ is_active: !item.is_active }),
        },
      );
      setWarehouses((current) =>
        current.map((currentItem) =>
          currentItem.id === saved.id ? saved : currentItem,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el almacén.",
      );
    } finally {
      setSaving(false);
    }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "warehouse" || mode === "warehouse-edit")
        await apiFetch<Warehouse>(
          mode === "warehouse-edit" && editingWarehouseId
            ? "/inventory/warehouses/" + editingWarehouseId
            : "/inventory/warehouses",
          {
            ...options,
            method: mode === "warehouse-edit" ? "PATCH" : "POST",
            body: JSON.stringify({
              ...warehouseForm,
              address: warehouseForm.address || null,
            }),
          },
        );
      if (mode === "adjustment")
        await apiFetch("/inventory/adjustments", {
          ...options,
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            warehouse_id: warehouseId,
            quantity: Number(quantity),
            reference: reference || null,
            note: note || null,
          }),
        });
      if (mode === "transfer")
        await apiFetch("/inventory/transfers", {
          ...options,
          method: "POST",
          body: JSON.stringify({
            number: reference,
            product_id: productId,
            source_warehouse_id: warehouseId,
            destination_warehouse_id: destinationId,
            quantity: Number(quantity),
            note: note || null,
          }),
        });
      setMode(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar el movimiento.",
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
          <p className="eyebrow">CONTROL OPERATIVO</p>
          <h1>Inventario</h1>
          <p className="subtitle">
            Consulta existencias por almacén y registra movimientos controlados.
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => open("transfer")}>
            <ArrowLeftRight size={16} /> Transferir
          </button>
          <button className="primary-button" onClick={() => open("adjustment")}>
            <SlidersHorizontal size={17} /> Ajustar stock
          </button>
        </div>
      </div>
      <section className="customer-summary inventory-summary">
        <article>
          <span className="summary-icon">
            <WarehouseIcon size={19} />
          </span>
          <div>
            <small>ALMACENES ACTIVOS</small>
            <strong>
              {warehouses.filter((item) => item.is_active).length}
            </strong>
          </div>
        </article>
        <article>
          <span className="summary-icon green">
            <PackageSearch size={19} />
          </span>
          <div>
            <small>UNIDADES RESERVADAS</small>
            <strong>{totalReserved.toLocaleString("es-MX")}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon">
            <SlidersHorizontal size={19} />
          </span>
          <div>
            <small>VALOR DEL INVENTARIO</small>
            <strong>S/ {totalValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong>
          </div>
        </article>
        <article>
          <span className="summary-icon green">
            <PackageSearch size={19} />
          </span>
          <div>
            <small>UNIDADES EN EXISTENCIA</small>
            <strong>{totalUnits.toLocaleString("es-MX")}</strong>
          </div>
        </article>
      </section>
      <DataMigrationPanel module="inventory" onImported={load} />
      <article className="panel customers-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">EXISTENCIAS</p>
            <h2>Stock por almacén</h2>
          </div>
          <button className="text-button" onClick={() => open("warehouse")}>
            + Agregar almacén
          </button>
        </div>
        {error && !mode && (
          <div className="module-error">
            {error}
            <button onClick={() => void load()}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div className="module-state">
            <LoaderCircle className="spin" size={22} /> Cargando existencias…
          </div>
        ) : stock.length === 0 ? (
          <div className="module-state">
            <PackageSearch size={28} />
            <strong>Aún no hay existencias</strong>
            <span>
              Crea un almacén y registra un ajuste positivo para iniciar.
            </span>
            <button className="text-button" onClick={() => open("warehouse")}>
              Crear almacén
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>SKU</th>
                  <th>ALMACÉN</th>
                  <th>EXISTENCIA</th>
                  <th>RESERVADO</th>
                  <th>DISPONIBLE</th>
                  <th>UNIDAD</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{productName(item.product_id)}</strong>
                    </td>
                    <td>{productSku(item.product_id)}</td>
                    <td>{warehouseName(item.warehouse_id)}</td>
                    <td>
                      <strong
                        className={
                          Number(item.quantity) <= 0 ? "stock-zero" : ""
                        }
                      >
                        {Number(item.quantity).toLocaleString("es-MX")}
                      </strong>
                    </td>
                    <td>{Number(availabilityFor(item)?.reserved_quantity ?? 0).toLocaleString("es-MX")}</td>
                    <td>
                      <strong>{Number(availabilityFor(item)?.available_quantity ?? item.quantity).toLocaleString("es-MX")}</strong>
                    </td>
                    <td>
                      {products.find(
                        (product) => product.id === item.product_id,
                      )?.unit ?? "unit"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      <article className="panel warehouse-list">
        <div className="panel-header">
          <div>
            <p className="card-label">UBICACIONES</p>
            <h2>Almacenes</h2>
          </div>
          <button className="icon-button muted" aria-label="Almacenes">
            <MapPin size={19} />
          </button>
        </div>
        {warehouses.length === 0 ? (
          <p className="warehouse-empty">No hay almacenes registrados.</p>
        ) : (
          <div className="warehouse-cards">
            {warehouses.map((item) => (
              <div key={item.id}>
                <span className="warehouse-symbol">
                  <WarehouseIcon size={17} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.code}
                    {item.address ? ` · ${item.address}` : ""}
                  </small>
                </span>
                <span
                  className={`status-pill ${item.is_active ? "active" : "inactive"}`}
                >
                  {item.is_active ? "Activo" : "Inactivo"}
                </span>
                <span className="row-actions">
                  <button
                    className="icon-button muted"
                    onClick={() => editWarehouse(item)}
                    aria-label="Editar almacén"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button muted"
                    onClick={() => void toggleWarehouse(item)}
                    disabled={saving}
                    aria-label="Cambiar estado del almacén"
                  >
                    <Power size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
      {mode && (
        <div className="modal-layer">
          <section
            className="customer-modal inventory-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">INVENTARIO</p>
                <h2>
                  {mode === "warehouse"
                    ? "Nuevo almacén"
                    : mode === "warehouse-edit"
                      ? "Editar almacén"
                      : mode === "adjustment"
                        ? "Ajustar existencia"
                        : "Transferir inventario"}
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
            <form className="customer-form" onSubmit={save}>
              {mode === "warehouse" || mode === "warehouse-edit" ? (
                <>
                  <label>
                    Código
                    <input
                      required
                      value={warehouseForm.code}
                      onChange={(e) =>
                        setWarehouseForm((f) => ({
                          ...f,
                          code: e.target.value,
                        }))
                      }
                      placeholder="ALM-001"
                    />
                  </label>
                  <label>
                    Nombre
                    <input
                      required
                      value={warehouseForm.name}
                      onChange={(e) =>
                        setWarehouseForm((f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Almacén principal"
                    />
                  </label>
                  <label>
                    Dirección
                    <input
                      value={warehouseForm.address}
                      onChange={(e) =>
                        setWarehouseForm((f) => ({
                          ...f,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Producto
                    <select
                      required
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                    >
                      <option value="">Selecciona un producto</option>
                      {products.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name} · {item.sku}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      {mode === "transfer" ? "Almacén origen" : "Almacén"}
                      <select
                        required
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                      >
                        <option value="">Selecciona un almacén</option>
                        {warehouses
                          .filter((item) => item.is_active)
                          .map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {mode === "transfer" && (
                      <label>
                        Almacén destino
                        <select
                          required
                          value={destinationId}
                          onChange={(e) => setDestinationId(e.target.value)}
                        >
                          <option value="">Selecciona un almacén</option>
                          {warehouses
                            .filter(
                              (item) =>
                                item.is_active && item.id !== warehouseId,
                            )
                            .map((item) => (
                              <option value={item.id} key={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="form-grid">
                    <label>
                      {mode === "adjustment" ? "Cantidad (+/-)" : "Cantidad"}
                      <input
                        required
                        type="number"
                        step="1"
                        min={mode === "transfer" ? "1" : undefined}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </label>
                    <label>
                      {mode === "transfer" ? "Folio" : "Referencia"}
                      <input
                        required={mode === "transfer"}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder={
                          mode === "transfer" ? "TR-001" : "Opcional"
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Nota
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Opcional"
                    />
                  </label>
                </>
              )}
              {error && <p className="login-error">{error}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMode(null)}
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={saving}>
                  {saving ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
