import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, LoaderCircle, MapPin, Pencil, Plus, Power, Warehouse as WarehouseIcon, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Warehouse = { id: string; code: string; name: string; address: string | null; is_active: boolean };
type Stock = { warehouse_id: string; quantity: string };
type Mode = "create" | "edit" | null;

/**
 * Warehouses are a master-data module. Stock, adjustments and transfers stay
 * in Inventory; this view owns only the lifecycle of physical locations.
 */
export function WarehousesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", address: "" });
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };

  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const [stores, quantities] = await Promise.all([
        apiFetch<Warehouse[]>("/inventory/warehouses", options),
        apiFetch<Stock[]>("/inventory/stock", options),
      ]);
      setWarehouses(stores); setStock(quantities);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los almacenes.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockByWarehouse = useMemo(() => stock.reduce<Record<string, number>>((totals, item) => {
    totals[item.warehouse_id] = (totals[item.warehouse_id] ?? 0) + Number(item.quantity);
    return totals;
  }, {}), [stock]);
  const openCreate = () => { setError(null); setEditingId(null); setForm({ code: "", name: "", address: "" }); setMode("create"); };
  const openEdit = (warehouse: Warehouse) => { setError(null); setEditingId(warehouse.id); setForm({ code: warehouse.code, name: warehouse.name, address: warehouse.address ?? "" }); setMode("edit"); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch<Warehouse>(mode === "edit" && editingId ? `/inventory/warehouses/${editingId}` : "/inventory/warehouses", {
        ...options, method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, address: form.address.trim() || null }),
      });
      setMode(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el almacén."); }
    finally { setSaving(false); }
  };
  const toggle = async (warehouse: Warehouse) => {
    setSaving(true); setError(null);
    try {
      await apiFetch<Warehouse>(`/inventory/warehouses/${warehouse.id}`, {
        ...options, method: "PATCH", body: JSON.stringify({ is_active: !warehouse.is_active }),
      });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar el almacén."); }
    finally { setSaving(false); }
  };
  const activeCount = warehouses.filter((item) => item.is_active).length;
  const assignedUnits = stock.reduce((total, item) => total + Number(item.quantity), 0);

  return <section className="module-page warehouses-page">
    <div className="module-heading">
      <div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Inventario</button><p className="eyebrow">MAESTROS LOGÍSTICOS</p><h1>Almacenes</h1><p className="subtitle">Administra las ubicaciones físicas donde se recibe, conserva y despacha el inventario.</p></div>
      <div className="heading-actions"><a className="secondary-button" href="#inventario">Ver inventario</a><button className="primary-button" onClick={openCreate}><Plus size={17} /> Nuevo almacén</button></div>
    </div>
    <section className="customer-summary inventory-summary">
      <article><span className="summary-icon"><WarehouseIcon size={19} /></span><div><small>ALMACENES ACTIVOS</small><strong>{activeCount}</strong></div></article>
      <article><span className="summary-icon green"><MapPin size={19} /></span><div><small>UBICACIONES REGISTRADAS</small><strong>{warehouses.length}</strong></div></article>
      <article><span className="summary-icon"><WarehouseIcon size={19} /></span><div><small>UNIDADES ASIGNADAS</small><strong>{assignedUnits.toLocaleString("es-MX")}</strong></div></article>
    </section>
    <DataMigrationPanel module="warehouses" onImported={load} />
    {error && !mode && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    <article className="panel customers-panel warehouse-directory">
      <div className="panel-header"><div><p className="card-label">RED DE ALMACENES</p><h2>Ubicaciones operativas</h2></div><span className="table-count">{warehouses.length} registros</span></div>
      {loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando almacenes…</div> : warehouses.length === 0 ? <div className="module-state"><WarehouseIcon size={28} /><strong>Aún no hay almacenes registrados</strong><span>Crea el primer almacén antes de registrar compras, stock o transferencias.</span><button className="text-button" onClick={openCreate}>Crear almacén</button></div> : <div className="table-wrap"><table className="inventory-table"><thead><tr><th>CÓDIGO</th><th>ALMACÉN</th><th>DIRECCIÓN</th><th>EXISTENCIA</th><th>ESTADO</th><th aria-label="Acciones" /></tr></thead><tbody>{warehouses.map((warehouse) => <tr key={warehouse.id}><td><strong>{warehouse.code}</strong></td><td><strong>{warehouse.name}</strong></td><td>{warehouse.address || "—"}</td><td>{(stockByWarehouse[warehouse.id] ?? 0).toLocaleString("es-MX")}</td><td><span className={`status-pill ${warehouse.is_active ? "active" : "inactive"}`}>{warehouse.is_active ? "Activo" : "Inactivo"}</span></td><td><span className="row-actions"><button className="icon-button muted" aria-label={`Editar ${warehouse.name}`} onClick={() => openEdit(warehouse)}><Pencil size={15} /></button><button className="icon-button muted" disabled={saving} aria-label={`${warehouse.is_active ? "Desactivar" : "Activar"} ${warehouse.name}`} onClick={() => void toggle(warehouse)}><Power size={15} /></button></span></td></tr>)}</tbody></table></div>}
    </article>
    {mode && <div className="modal-layer"><section className="customer-modal inventory-modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-modal-title"><div className="modal-header"><div><p className="eyebrow">ALMACENES</p><h2 id="warehouse-modal-title">{mode === "create" ? "Nuevo almacén" : "Editar almacén"}</h2></div><button className="icon-button" onClick={() => setMode(null)} aria-label="Cerrar"><X size={20} /></button></div><form className="customer-form" onSubmit={save}><label>Código<input required value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} placeholder="ALM-001" /></label><label>Nombre<input required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Almacén principal" /></label><label>Dirección<input value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} placeholder="Opcional" /></label>{error && <p className="login-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setMode(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : "Guardar almacén"}</button></div></form></section></div>}
  </section>;
}
