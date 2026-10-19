import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, LoaderCircle, Pencil, Phone, Plus, Power, Search, Store, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Supplier = { id: string; code: string; name: string; email: string | null; phone: string | null; tax_id: string | null; address: string | null; is_active: boolean };
type SupplierLookup = { existing_supplier_id: string | null; tax_id: string; name: string; email: string; phone: string; address: string; source: "erp" | "decolecta" };
type Form = { code: string; name: string; email: string; phone: string; tax_id: string; address: string };
const emptyForm: Form = { code: "", name: "", email: "", phone: "", tax_id: "", address: "" };

export function SuppliersPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!session || !tenantId) return;
    setIsLoading(true); setError(null);
    try { setSuppliers(await apiFetch<Supplier[]>("/suppliers", options)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los proveedores."); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? suppliers.filter((supplier) => [supplier.name, supplier.code, supplier.tax_id, supplier.email].some((value) => value?.toLocaleLowerCase().includes(term))) : suppliers;
  }, [query, suppliers]);
  const setField = (field: keyof Form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const close = () => { setIsFormOpen(false); setEditingId(null); setForm(emptyForm); setNotice(null); setError(null); };
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(null); setNotice(null); setIsFormOpen(true); };
  const openEdit = (supplier: Supplier) => { setEditingId(supplier.id); setForm({ code: supplier.code, name: supplier.name, email: supplier.email ?? "", phone: supplier.phone ?? "", tax_id: supplier.tax_id ?? "", address: supplier.address ?? "" }); setError(null); setNotice(null); setIsFormOpen(true); };
  const lookupRuc = async () => {
    const ruc = form.tax_id.replace(/\D/g, "");
    if (ruc.length !== 11) { setError("Ingresa un RUC de 11 dígitos para consultar SUNAT."); return; }
    setField("tax_id", ruc); setIsLookingUp(true); setError(null); setNotice(null);
    try {
      const result = await apiFetch<SupplierLookup>(`/suppliers/lookup/${ruc}`, options);
      if (result.existing_supplier_id) {
        const existing = suppliers.find((item) => item.id === result.existing_supplier_id);
        if (existing) { openEdit(existing); setNotice("Este RUC ya pertenece a un proveedor registrado. Puedes actualizar sus datos."); return; }
      }
      setForm((current) => ({ ...current, tax_id: result.tax_id, code: current.code || `PRV-${result.tax_id}`, name: result.name, address: result.address || current.address, email: result.email || current.email, phone: result.phone || current.phone }));
      setNotice("Datos de SUNAT cargados. Completa los datos de contacto si corresponde.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible consultar el RUC."); }
    finally { setIsLookingUp(false); }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsSaving(true); setError(null);
    try {
      const body = { ...form, code: form.code || `PRV-${form.tax_id}`, email: form.email || null, phone: form.phone || null, address: form.address || null };
      const supplier = await apiFetch<Supplier>(editingId ? `/suppliers/${editingId}` : "/suppliers", { ...options, method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setSuppliers((current) => (editingId ? current.map((item) => item.id === supplier.id ? supplier : item) : [...current, supplier]).sort((a, b) => a.name.localeCompare(b.name)));
      close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el proveedor."); }
    finally { setIsSaving(false); }
  };
  const toggle = async (supplier: Supplier) => {
    try { const saved = await apiFetch<Supplier>(`/suppliers/${supplier.id}`, { ...options, method: "PATCH", body: JSON.stringify({ is_active: !supplier.is_active }) }); setSuppliers((current) => current.map((item) => item.id === saved.id ? saved : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar el proveedor."); }
  };
  return <section className="module-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">ABASTECIMIENTO</p><h1>Proveedores</h1><p className="subtitle">Administra el padrón de proveedores y valida su razón social mediante RUC.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Nuevo proveedor</button></div>
    <section className="customer-summary"><article><span className="summary-icon"><Building2 size={19} /></span><div><small>PROVEEDORES REGISTRADOS</small><strong>{suppliers.length}</strong></div></article><article><span className="summary-icon green"><Store size={19} /></span><div><small>PROVEEDORES ACTIVOS</small><strong>{suppliers.filter((item) => item.is_active).length}</strong></div></article></section>
    <article className="panel customers-panel"><div className="customers-toolbar"><label className="search customer-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar proveedores" placeholder="Buscar por razón social, código o RUC" /></label><span>{visible.length} resultados</span></div>{error && !isFormOpen && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}{isLoading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando proveedores…</div> : visible.length === 0 ? <div className="module-state"><Building2 size={28} /><strong>{query ? "No se encontraron coincidencias" : "Aún no hay proveedores"}</strong><span>{query ? "Prueba con otro criterio." : "Registra un proveedor con su RUC para iniciar compras."}</span>{!query && <button className="text-button" onClick={openCreate}>Crear proveedor</button>}</div> : <div className="table-wrap"><table className="customers-table suppliers-table"><thead><tr><th>PROVEEDOR</th><th>RUC</th><th>CONTACTO</th><th>ESTADO</th><th aria-label="Acciones" /></tr></thead><tbody>{visible.map((supplier) => <tr key={supplier.id}><td><div className="party-cell"><span className="customer-initial"><Building2 size={15} /></span><span className="party-cell-details"><strong>{supplier.name}</strong><small title={supplier.address ?? undefined}>{supplier.code}{supplier.address ? ` · ${supplier.address}` : ""}</small></span></div></td><td>{supplier.tax_id || "—"}</td><td><span className="contact-cell">{supplier.email && <span>{supplier.email}</span>}{supplier.phone && <span><Phone size={13} />{supplier.phone}</span>}{!supplier.email && !supplier.phone && <em>Sin datos de contacto</em>}</span></td><td><span className={`status-pill ${supplier.is_active ? "active" : "inactive"}`}>{supplier.is_active ? "Activo" : "Inactivo"}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(supplier)} aria-label={`Editar ${supplier.name}`}><Pencil size={16} /></button><button className="icon-button muted" onClick={() => void toggle(supplier)} aria-label={`Cambiar estado de ${supplier.name}`}><Power size={16} /></button></div></td></tr>)}</tbody></table></div>}</article>
    {isFormOpen && <div className="modal-layer" role="presentation"><section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-title"><div className="modal-header"><div><p className="eyebrow">{editingId ? "EDICIÓN" : "NUEVO PROVEEDOR"}</p><h2 id="supplier-title">{editingId ? "Editar proveedor" : "Registrar proveedor"}</h2></div><button className="icon-button" onClick={close} aria-label="Cerrar"><X size={20} /></button></div><form className="customer-form" onSubmit={save}><label>RUC<div className="ruc-input-group"><input required inputMode="numeric" maxLength={11} value={form.tax_id} onChange={(event) => setField("tax_id", event.target.value.replace(/\D/g, ""))} placeholder="20123456789" /><button type="button" className="secondary-button" onClick={() => void lookupRuc()} disabled={isLookingUp}>{isLookingUp ? "Consultando…" : "Consultar RUC"}</button></div></label><small className="field-help">Consulta SUNAT para completar razón social y dirección. El RUC evita registros duplicados.</small><label>Código interno<input required value={form.code} onChange={(event) => setField("code", event.target.value)} maxLength={40} placeholder="PRV-20123456789" /></label><label>Razón social<input required value={form.name} onChange={(event) => setField("name", event.target.value)} maxLength={160} placeholder="Razón social del proveedor" /></label><label>Dirección fiscal<input value={form.address} onChange={(event) => setField("address", event.target.value)} maxLength={500} placeholder="Dirección registrada en SUNAT" /></label><div className="form-grid"><label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="contacto@empresa.com" /></label><label>Teléfono<input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="999 000 000" /></label></div>{notice && <p className="supplier-lookup-notice">{notice}</p>}{error && <p className="login-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={isSaving}>{isSaving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar proveedor"}</button></div></form></section></div>}
  </section>;
}
