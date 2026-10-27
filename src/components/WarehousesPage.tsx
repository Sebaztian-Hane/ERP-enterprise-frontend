import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, GitBranch, LoaderCircle, MapPin, Pencil, Plus, Power, Warehouse as WarehouseIcon, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Warehouse = { id: string; code: string; name: string; address: string | null; branch_id: string | null; is_active: boolean };
type Stock = { warehouse_id: string; quantity: string };
type Branch = { id: string; legal_entity_id: string; code: string; name: string; is_active: boolean };
type Mode = "create" | "edit" | null;

/**
 * Warehouses are a master-data module. Stock, adjustments and transfers stay
 * in Inventory; this view owns only the lifecycle of physical locations.
 */
export function WarehousesPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [stock, setStock] = useState<Stock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", address: "", branch_id: "" });
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };

  const load = async (targetPage = page) => {
    if (!session || !tenantId) return;
    setLoading(true); setError(null);
    try {
      const [stores, quantities] = await Promise.all([
        fetchPage<Warehouse, "warehouses">("/inventory/warehouses", "warehouses", targetPage, options),
        apiFetch<Stock[]>("/inventory/stock", options),
      ]);
      setWarehouses(stores.warehouses); setMeta(stores.meta); setStock(quantities);
      // Branch data is configuration master data. Inventory-only users may
      // operate assigned warehouses but cannot alter their legal assignment.
      const branchResult = await apiFetch<Branch[]>("/legal-entities/branches", options).catch(() => []);
      setBranches(branchResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar los almacenes.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(page); }, [session?.access_token, tenantId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockByWarehouse = useMemo(() => stock.reduce<Record<string, number>>((totals, item) => {
    totals[item.warehouse_id] = (totals[item.warehouse_id] ?? 0) + Number(item.quantity);
    return totals;
  }, {}), [stock]);
  const openCreate = () => { setError(null); setEditingId(null); setForm({ code: "", name: "", address: "", branch_id: "" }); setMode("create"); };
  const openEdit = (warehouse: Warehouse) => { setError(null); setEditingId(warehouse.id); setForm({ code: warehouse.code, name: warehouse.name, address: warehouse.address ?? "", branch_id: warehouse.branch_id ?? "" }); setMode("edit"); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await apiFetch<Warehouse>(mode === "edit" && editingId ? `/inventory/warehouses/${editingId}` : "/inventory/warehouses", {
        ...options, method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, address: form.address.trim() || null, branch_id: form.branch_id || null }),
      });
      setMode(null); setPage(1); await load(1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el almacén."); }
    finally { setSaving(false); }
  };
  const toggle = async (warehouse: Warehouse) => {
    setSaving(true); setError(null);
    try {
      await apiFetch<Warehouse>(`/inventory/warehouses/${warehouse.id}`, {
        ...options, method: "PATCH", body: JSON.stringify({ is_active: !warehouse.is_active }),
      });
      await load(page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar el almacén."); }
    finally { setSaving(false); }
  };
  const activeCount = warehouses.filter((item) => item.is_active).length;
  const assignedUnits = stock.reduce((total, item) => total + Number(item.quantity), 0);
  const branchName = (branchId: string | null) => branches.find((branch) => branch.id === branchId)?.name ?? (branchId ? "Sucursal asignada" : "Sin asignar");

  return <section className="module-page warehouses-page">
    <div className="module-heading">
      <div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Inventario</button><p className="eyebrow">MAESTROS LOGÍSTICOS</p><h1>Almacenes</h1><p className="subtitle">Administra las ubicaciones físicas donde se recibe, conserva y despacha el inventario.</p></div>
      <div className="heading-actions"><a className="secondary-button" href="#inventario">Ver inventario</a><button className="primary-button" onClick={openCreate}><Plus size={17} /> Nuevo almacén</button></div>
    </div>
    <section className="customer-summary inventory-summary">
      <article><span className="summary-icon"><WarehouseIcon size={19} /></span><div><small>ALMACENES ACTIVOS</small><strong>{activeCount}</strong></div></article>
      <article><span className="summary-icon green"><MapPin size={19} /></span><div><small>UBICACIONES REGISTRADAS</small><strong>{meta.total}</strong></div></article>
      <article><span className="summary-icon"><WarehouseIcon size={19} /></span><div><small>UNIDADES ASIGNADAS</small><strong>{assignedUnits.toLocaleString("es-MX")}</strong></div></article>
    </section>
    <DataMigrationPanel module="warehouses" onImported={load} />
    {error && !mode && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}
    <article className="panel customers-panel warehouse-directory">
      <div className="panel-header"><div><p className="card-label">RED DE ALMACENES</p><h2>Ubicaciones operativas</h2></div><span className="table-count">{meta.total} registros</span></div>
      {loading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando almacenes…</div> : warehouses.length === 0 ? <div className="module-state"><WarehouseIcon size={28} /><strong>Aún no hay almacenes registrados</strong><span>Crea el primer almacén antes de registrar compras, stock o transferencias.</span><button className="text-button" onClick={openCreate}>Crear almacén</button></div> : <><div className="table-wrap"><table className="inventory-table"><thead><tr><th>CÓDIGO</th><th>ALMACÉN</th><th>SUCURSAL</th><th>DIRECCIÓN</th><th>EXISTENCIA</th><th>ESTADO</th><th aria-label="Acciones" /></tr></thead><tbody>{warehouses.map((warehouse) => <tr key={warehouse.id}><td><strong>{warehouse.code}</strong></td><td><strong>{warehouse.name}</strong></td><td>{branchName(warehouse.branch_id)}</td><td>{warehouse.address || "—"}</td><td>{(stockByWarehouse[warehouse.id] ?? 0).toLocaleString("es-MX")}</td><td><span className={`status-pill ${warehouse.is_active ? "active" : "inactive"}`}>{warehouse.is_active ? "Activo" : "Inactivo"}</span></td><td><span className="row-actions"><button className="icon-button muted" aria-label={`Editar ${warehouse.name}`} onClick={() => openEdit(warehouse)}><Pencil size={15} /></button><button className="icon-button muted" disabled={saving} aria-label={`${warehouse.is_active ? "Desactivar" : "Activar"} ${warehouse.name}`} onClick={() => void toggle(warehouse)}><Power size={15} /></button></span></td></tr>)}</tbody></table></div><TablePagination meta={meta} label="almacenes" onPageChange={setPage} /></>}
    </article>
    {mode && <div className="modal-layer"><section className="customer-modal inventory-modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-modal-title"><div className="modal-header"><div><p className="eyebrow">ALMACENES</p><h2 id="warehouse-modal-title">{mode === "create" ? "Nuevo almacén" : "Editar almacén"}</h2></div><button className="icon-button" onClick={() => setMode(null)} aria-label="Cerrar"><X size={20} /></button></div><form className="customer-form" onSubmit={save}><label>Código<input required value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} placeholder="ALM-001" /></label><label>Nombre<input required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Almacén principal" /></label><fieldset className="entity-choice"><legend>Sucursal <small>(opcional)</small></legend><div role="radiogroup" aria-label="Sucursal del almacén" className="entity-choice-list"><button type="button" role="radio" aria-checked={!form.branch_id} className={!form.branch_id ? "selected" : ""} onClick={() => setForm((value) => ({ ...value, branch_id: "" }))}><strong>Sin asignar por ahora</strong><small>Podrás asociarlo cuando la estructura legal esté lista.</small></button>{branches.filter((branch) => branch.is_active).map((branch) => <button type="button" role="radio" aria-checked={form.branch_id === branch.id} className={form.branch_id === branch.id ? "selected" : ""} key={branch.id} onClick={() => setForm((value) => ({ ...value, branch_id: branch.id }))}><strong><GitBranch size={14} /> {branch.name}</strong><small>{branch.code}</small></button>)}{branches.length === 0 && <p>Las sucursales se administran desde Configuración.</p>}</div></fieldset><label>Dirección<input value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} placeholder="Opcional" /></label>{error && <p className="login-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => setMode(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : "Guardar almacén"}</button></div></form></section></div>}
  </section>;
}
