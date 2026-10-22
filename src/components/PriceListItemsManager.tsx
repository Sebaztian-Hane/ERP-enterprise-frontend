import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, Search, Tags } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";

export type CommercialPriceList = {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  currency_symbol?: string | null;
  is_active: boolean;
};

type Product = { id: string; sku: string; name: string; sale_price: string };
type PriceListItem = {
  id: string;
  product_id: string;
  product_sku: string;
  product_name: string;
  min_quantity: string;
  unit_price: string;
  valid_from: string;
  valid_to?: string | null;
  is_active: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyMeta: PageMeta = { page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false };

export function PriceListItemsManager({ lists }: { lists: CommercialPriceList[] }) {
  const { session, tenantId } = useAuth();
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const [activeListId, setActiveListId] = useState("");
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsMeta, setProductsMeta] = useState<PageMeta>(emptyMeta);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productId, setProductId] = useState("");
  const [form, setForm] = useState({ min_quantity: "1", unit_price: "", valid_from: today(), valid_to: "" });
  const manageableLists = useMemo(() => lists.filter((item) => item.is_active), [lists]);
  const activeList = manageableLists.find((item) => item.id === activeListId);

  const loadItems = async (listId = activeListId) => {
    if (!session || !tenantId || !listId) return;
    setLoadingItems(true);
    setError(null);
    try {
      setItems(await apiFetch<PriceListItem[]>("/operations/configuration/price-lists/" + listId + "/items", options));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las tarifas.");
    } finally {
      setLoadingItems(false);
    }
  };

  const loadProducts = async (targetPage = productPage, query = productQuery) => {
    if (!session || !tenantId) return;
    setLoadingProducts(true);
    try {
      const suffix = query.trim() ? "&q=" + encodeURIComponent(query.trim()) : "";
      const result = await fetchPage<Product, "products">("/products?active=true" + suffix, "products", targetPage, options);
      setProducts(result.products);
      setProductsMeta(result.meta);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron buscar productos.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!activeListId && manageableLists.length) setActiveListId(manageableLists[0].id);
  }, [manageableLists, activeListId]);
  useEffect(() => { if (activeListId) void loadItems(activeListId); }, [activeListId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadProducts(1, ""); }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectList = (listId: string) => {
    setActiveListId(listId);
    setProductId("");
    setForm({ min_quantity: "1", unit_price: "", valid_from: today(), valid_to: "" });
  };

  const selectProduct = (product: Product) => {
    setProductId(product.id);
    setForm((current) => ({ ...current, unit_price: current.unit_price || product.sale_price }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeListId || !productId) {
      setError("Selecciona una lista y un producto antes de registrar la tarifa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/operations/configuration/price-lists/" + activeListId + "/items", {
        ...options,
        method: "POST",
        body: JSON.stringify({
          product_id: productId,
          min_quantity: Number(form.min_quantity),
          unit_price: Number(form.unit_price),
          valid_from: form.valid_from,
          valid_to: form.valid_to || null,
        }),
      });
      setProductId("");
      setForm({ min_quantity: "1", unit_price: "", valid_from: today(), valid_to: "" });
      await loadItems();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la tarifa.");
    } finally {
      setSaving(false);
    }
  };

  return <article className="panel customers-panel price-list-items-panel">
    <div className="panel-header"><div><p className="card-label">TARIFAS POR PRODUCTO</p><h2>Contenido de la lista</h2><p>Las ventas toman la tarifa vigente y la cantidad mínima más favorable desde el servidor.</p></div><Tags className="muted-icon" size={20} /></div>
    {error && <div className="module-error">{error}<button type="button" onClick={() => void loadItems()}>Reintentar</button></div>}
    {manageableLists.length === 0 ? <div className="module-state"><Tags size={26} /><strong>Crea una lista activa primero</strong><span>Luego podrás cargar sus tarifas por producto.</span></div> : <>
      <fieldset className="entity-choice"><legend>Lista que deseas administrar</legend><div className="entity-choice-list currency-choice-list">{manageableLists.map((list) => <button key={list.id} type="button" className={activeListId === list.id ? "selected" : ""} onClick={() => selectList(list.id)}><strong>{list.name}</strong><small>{list.code} · {list.currency_code}</small></button>)}</div></fieldset>
      {activeList && <form className="customer-form config-form price-list-item-form" onSubmit={save}>
        <div className="price-list-selected"><strong>{activeList.name}</strong><span>{activeList.code} · {activeList.currency_code}</span></div>
        <label className="search customer-search">Buscar producto<Search size={17} /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setProductPage(1); void loadProducts(1); } }} placeholder="Nombre o SKU" /></label>
        <button type="button" className="secondary-button" onClick={() => { setProductPage(1); void loadProducts(1); }} disabled={loadingProducts}>{loadingProducts ? "Buscando…" : "Buscar producto"}</button>
        <div className="entity-choice-list product-price-choice" role="listbox">{products.map((product) => <button type="button" key={product.id} role="option" aria-selected={productId === product.id} className={productId === product.id ? "selected" : ""} onClick={() => selectProduct(product)}><strong>{product.name}</strong><small>{product.sku} · Precio estándar: {product.sale_price}</small></button>)}{!loadingProducts && products.length === 0 && <p>Sin productos para esta búsqueda.</p>}</div>
        <TablePagination meta={productsMeta} label="productos" onPageChange={(next) => { setProductPage(next); void loadProducts(next); }} />
        <div className="form-grid"><label>Cantidad mínima<input type="number" required min="0" step="1" value={form.min_quantity} onChange={(event) => setForm((current) => ({ ...current, min_quantity: event.target.value }))} /></label><label>Precio unitario<input type="number" required min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: event.target.value }))} /></label><label>Vigente desde<input type="date" required value={form.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} /></label><label>Vigente hasta <small>(opcional)</small><input type="date" min={form.valid_from} value={form.valid_to} onChange={(event) => setForm((current) => ({ ...current, valid_to: event.target.value }))} /></label></div>
        <div className="form-actions"><button className="primary-button" disabled={saving || !productId}>{saving ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : <><Plus size={16} /> Agregar tarifa</>}</button></div>
      </form>}
      {loadingItems ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Cargando tarifas…</div> : items.length === 0 ? <div className="module-state"><Tags size={24} /><strong>Esta lista aún no tiene tarifas</strong><span>Selecciona un producto y registra su primera vigencia.</span></div> : <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>DESDE CANT.</th><th>PRECIO</th><th>VIGENCIA</th><th>ESTADO</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.product_name}</strong><small>{item.product_sku}</small></td><td>{item.min_quantity}</td><td>{activeList?.currency_symbol || ""} {item.unit_price}</td><td>{item.valid_from}{item.valid_to ? " — " + item.valid_to : ""}</td><td><span className={"status-pill " + (item.is_active ? "active" : "inactive")}>{item.is_active ? "Activa" : "Inactiva"}</span></td></tr>)}</tbody></table></div>}
    </>}
  </article>;
}
