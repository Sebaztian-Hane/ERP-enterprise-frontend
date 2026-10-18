import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, LoaderCircle, Mail, Pencil, Phone, Plus, Search, UserPlus, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Customer = { id: string; code: string; name: string; email: string | null; phone: string | null; tax_id: string | null; credit_limit: string; is_active: boolean };
type Form = { code: string; name: string; email: string; phone: string; tax_id: string; credit_limit: string };
const emptyForm: Form = { code: "", name: "", email: "", phone: "", tax_id: "", credit_limit: "0" };
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

export function CustomersPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const load = async () => {
    if (!session || !tenantId) return;
    setIsLoading(true); setError(null);
    try { setCustomers(await apiFetch<Customer[]>("/customers", options)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los clientes."); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? customers.filter((customer) => [customer.name, customer.code, customer.email, customer.tax_id].some((value) => value?.toLocaleLowerCase().includes(normalized))) : customers;
  }, [customers, query]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsSaving(true); setError(null);
    try {
      const body = { ...form, email: form.email || null, phone: form.phone || null, tax_id: form.tax_id || null, credit_limit: Number(form.credit_limit || 0) };
      const customer = await apiFetch<Customer>(editingCustomerId ? `/customers/${editingCustomerId}` : "/customers", { ...options, method: editingCustomerId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setCustomers((current) => (editingCustomerId ? current.map((item) => item.id === customer.id ? customer : item) : [...current, customer]).sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm); setEditingCustomerId(null); setIsFormOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible crear el cliente."); }
    finally { setIsSaving(false); }
  };
  const setField = (field: keyof Form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openEdit = (customer: Customer) => { setError(null); setEditingCustomerId(customer.id); setForm({ code: customer.code, name: customer.name, email: customer.email ?? "", phone: customer.phone ?? "", tax_id: customer.tax_id ?? "", credit_limit: customer.credit_limit }); setIsFormOpen(true); };
  return <section className="module-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">RELACIÓN COMERCIAL</p><h1>Clientes</h1><p className="subtitle">Consulta y administra la cartera de clientes de la empresa activa.</p></div><button className="primary-button" onClick={() => { setError(null); setIsFormOpen(true); }}><Plus size={18} /> Nuevo cliente</button></div>
    <section className="customer-summary"><article><span className="summary-icon"><Building2 size={19} /></span><div><small>CLIENTES REGISTRADOS</small><strong>{customers.length}</strong></div></article><article><span className="summary-icon green"><UserPlus size={19} /></span><div><small>CLIENTES ACTIVOS</small><strong>{customers.filter((customer) => customer.is_active).length}</strong></div></article></section>
    <article className="panel customers-panel"><div className="customers-toolbar"><label className="search customer-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar clientes" placeholder="Buscar por nombre, código o RFC" /></label><span>{visibleCustomers.length} resultados</span></div>{error && !isFormOpen && <div className="module-error">{error}<button onClick={() => void load()}>Reintentar</button></div>}{isLoading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando clientes…</div> : visibleCustomers.length === 0 ? <div className="module-state"><Building2 size={28} /><strong>{query ? "No se encontraron coincidencias" : "Aún no hay clientes"}</strong><span>{query ? "Prueba con otro término de búsqueda." : "Crea el primer registro para comenzar a vender."}</span>{!query && <button className="text-button" onClick={() => setIsFormOpen(true)}>Crear cliente</button>}</div> : <div className="table-wrap"><table className="customers-table"><thead><tr><th>CLIENTE</th><th>CONTACTO</th><th>RFC / ID FISCAL</th><th>LÍMITE DE CRÉDITO</th><th>ESTADO</th><th /></tr></thead><tbody>{visibleCustomers.map((customer) => <tr key={customer.id}><td><span className="customer-initial">{customer.name.slice(0, 1).toUpperCase()}</span><span><strong>{customer.name}</strong><small>{customer.code}</small></span></td><td><span className="contact-cell">{customer.email && <span><Mail size={13} />{customer.email}</span>}{customer.phone && <span><Phone size={13} />{customer.phone}</span>}{!customer.email && !customer.phone && <em>Sin datos de contacto</em>}</span></td><td>{customer.tax_id || "—"}</td><td><strong>{money.format(Number(customer.credit_limit))}</strong></td><td><span className={`status-pill ${customer.is_active ? "active" : "inactive"}`}>{customer.is_active ? "Activo" : "Inactivo"}</span></td><td><button className="icon-button" onClick={() => openEdit(customer)} aria-label={`Editar ${customer.name}`}><Pencil size={16} /></button></td></tr>)}</tbody></table></div>}</article>
    {isFormOpen && <div className="modal-layer" role="presentation"><section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="new-customer-title"><div className="modal-header"><div><p className="eyebrow">{editingCustomerId ? "EDICIÓN" : "NUEVO REGISTRO"}</p><h2 id="new-customer-title">{editingCustomerId ? "Editar cliente" : "Crear cliente"}</h2></div><button className="icon-button" onClick={() => { setEditingCustomerId(null); setIsFormOpen(false); }} aria-label="Cerrar"><X size={20} /></button></div><form onSubmit={save} className="customer-form"><label>Código interno<input value={form.code} onChange={(event) => setField("code", event.target.value)} required maxLength={40} placeholder="CLI-001" /></label><label>Razón social o nombre<input value={form.name} onChange={(event) => setField("name", event.target.value)} required maxLength={160} placeholder="Empresa cliente" /></label><div className="form-grid"><label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="contacto@empresa.com" /></label><label>Teléfono<input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="(555) 000 0000" /></label></div><div className="form-grid"><label>RFC / ID fiscal<input value={form.tax_id} onChange={(event) => setField("tax_id", event.target.value)} placeholder="XAXX010101000" /></label><label>Límite de crédito<input type="number" min="0" step="0.01" value={form.credit_limit} onChange={(event) => setField("credit_limit", event.target.value)} /></label></div>{error && <p className="login-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setEditingCustomerId(null); setIsFormOpen(false); }}>Cancelar</button><button className="primary-button" disabled={isSaving}>{isSaving ? "Guardando…" : editingCustomerId ? "Guardar cambios" : "Guardar cliente"}</button></div></form></section></div>}
  </section>;
}
