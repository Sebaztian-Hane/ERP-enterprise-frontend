import { DragEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Banknote, Check, CreditCard, LoaderCircle, Minus, Plus, ReceiptText, Search, ShoppingBag, Smartphone, Trash2, UserRound, Wallet, X } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../../lib/api";
import type { PosCartLine, PosCheckoutResult, PosCustomer, PosPaymentMethod, PosPaymentMethodConfig, PosProduct, PosTender, PosWarehouse } from "./types";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const methodLabels: Record<PosPaymentMethod, string> = { cash: "Efectivo", visa: "Visa", mastercard: "Mastercard", yape: "Yape", plin: "Plin" };
const methodIcons: Record<PosPaymentMethod, typeof Banknote> = { cash: Banknote, visa: CreditCard, mastercard: CreditCard, yape: Smartphone, plin: Wallet };

type CustomerLookup = { existing_customer_id: string | null; tax_id: string; name: string };

function validDocument(value: string | null | undefined) {
  return Boolean(value && /^\d{8}(\d{3})?$/.test(value));
}

export function PosCheckout({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [warehouses, setWarehouses] = useState<PosWarehouse[]>([]);
  const [methods, setMethods] = useState<PosPaymentMethodConfig[]>([]);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [query, setQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [documentType, setDocumentType] = useState<"ticket" | "03" | "01">("ticket");
  const [tenders, setTenders] = useState<PosTender[]>([]);
  const [activeMethod, setActiveMethod] = useState<PosPaymentMethod | null>(null);
  const [tenderAmount, setTenderAmount] = useState("");
  const [tenderReference, setTenderReference] = useState("");
  const [lookupDocument, setLookupDocument] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PosCheckoutResult | null>(null);
  const [cpeWarning, setCpeWarning] = useState<string | null>(null);

  const total = useMemo(() => cart.reduce((sum, line) => sum + Number(line.product.sale_price) * line.quantity, 0), [cart]);
  const tenderTotal = useMemo(() => tenders.reduce((sum, tender) => sum + tender.amount, 0), [tenders]);
  const balance = Number((total - tenderTotal).toFixed(2));
  const availableProducts = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [products, query]);
  const matchingCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.code} ${customer.tax_id ?? ""}`.toLocaleLowerCase().includes(customerQuery.toLocaleLowerCase())).slice(0, 8), [customers, customerQuery]);
  const activeMethods = methods.filter((method) => method.is_active);

  useEffect(() => {
    if (!session || !tenantId) return;
    let active = true;
    setLoading(true); setError(null);
    void Promise.all([
      apiFetch<PosProduct[]>("/products", options),
      apiFetch<PosCustomer[]>("/customers", options),
      apiFetch<PosWarehouse[]>("/sales/warehouses", options),
      apiFetch<PosPaymentMethodConfig[]>("/payments/pos-methods", options),
    ]).then(([catalog, people, stores, paymentMethods]) => {
      if (!active) return;
      setProducts(catalog); setCustomers(people); setWarehouses(stores.filter((store) => store.is_active)); setMethods(paymentMethods);
      setWarehouseId((current) => current || stores.find((store) => store.is_active)?.id || "");
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "No se pudo preparar el punto de venta.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProduct = (product: PosProduct) => {
    setSuccess(null); setError(null);
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { product, quantity: 1, serialText: "" }];
    });
  };
  const updateQuantity = (productId: string, next: number) => setCart((current) => next < 1 ? current.filter((line) => line.product.id !== productId) : current.map((line) => line.product.id === productId ? { ...line, quantity: next } : line));
  const addTender = () => {
    if (!activeMethod) return;
    const amount = Number(tenderAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Ingresa un importe válido para el medio de pago."); return; }
    setTenders((current) => [...current, { method: activeMethod, amount, reference: tenderReference.trim() }]);
    setTenderAmount(""); setTenderReference(""); setActiveMethod(null); setError(null);
  };
  const lookupCustomer = async () => {
    if (!/^\d{8}(\d{3})?$/.test(lookupDocument.trim())) { setError("Ingresa un DNI de 8 dígitos o RUC de 11 dígitos."); return; }
    setLookupBusy(true); setError(null);
    try {
      const result = await apiFetch<CustomerLookup>(`/sales/customer-lookup/${lookupDocument.trim()}`, options);
      const existing = result.existing_customer_id ? customers.find((customer) => customer.id === result.existing_customer_id) : undefined;
      const customer: PosCustomer = existing ?? { id: "", code: "", name: result.name, tax_id: result.tax_id };
      setSelectedCustomer(customer); setCustomerQuery(customer.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar el documento."); }
    finally { setLookupBusy(false); }
  };
  const customerPayload = () => selectedCustomer?.id ? { customer_id: selectedCustomer.id } : selectedCustomer?.tax_id ? { customer: { name: selectedCustomer.name, tax_id: selectedCustomer.tax_id } } : {};
  const customerTaxId = selectedCustomer?.tax_id ?? null;
  const customerIsRequired = (documentType === "01") || (documentType === "03" && total > 700);
  const serialLinesAreComplete = cart.every((line) => line.product.tracking_mode !== "serial" || line.serialText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean).length === line.quantity);
  const canCheckout = !submitting && cart.length > 0 && Boolean(warehouseId) && Math.abs(balance) < 0.005 && serialLinesAreComplete && (!customerIsRequired || validDocument(customerTaxId));

  const checkout = async () => {
    if (!canCheckout) { setError(customerIsRequired && !validDocument(customerTaxId) ? "Este comprobante requiere identificar al cliente con DNI o RUC." : "Completa el carrito, almacén y cobro exacto antes de registrar."); return; }
    setSubmitting(true); setError(null); setCpeWarning(null);
    try {
      const result = await postIdempotent<PosCheckoutResult>("/sales/pos-checkout", {
        ...options,
        body: JSON.stringify({
          warehouse_id: warehouseId,
          ...customerPayload(),
          document_type: documentType,
          lines: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity, serial_numbers: line.product.tracking_mode === "serial" ? line.serialText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean) : undefined })),
          tenders: tenders.map(({ method, amount, reference }) => ({ method, amount, reference: reference || undefined })),
        }),
      });
      setSuccess(result);
      if (documentType !== "ticket") {
        try {
          await postIdempotent(`/sales/${result.sale_id}/electronic-document`, { ...options, body: JSON.stringify({ document_type: documentType }) });
        } catch (cause) {
          setCpeWarning(cause instanceof Error ? `La venta quedó registrada; no se pudo reservar el CPE: ${cause.message}` : "La venta quedó registrada; reserva el CPE desde el historial.");
        }
      }
      setCart([]); setTenders([]); setSelectedCustomer(null); setCustomerQuery(""); setLookupDocument("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar el cobro POS."); }
    finally { setSubmitting(false); }
  };
  const beginProductDrag = (event: DragEvent<HTMLButtonElement>, productId: string) => {
    // Keep a plain-text fallback: some touch and embedded browser engines do not
    // preserve custom MIME types during a drag operation.
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-enterprisecloud-product", productId);
    event.dataTransfer.setData("text/plain", productId);
  };
  const dropProduct = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const productId = event.dataTransfer.getData("application/x-enterprisecloud-product") || event.dataTransfer.getData("text/plain");
    const product = products.find((item) => item.id === productId);
    if (product) addProduct(product);
  };

  return <section className="module-page pos-page">
    <div className="module-heading pos-heading"><div><button className="back-link" onClick={goBack}><ArrowLeft size={16} /> Panel general</button><h1>Punto de venta</h1><p className="subtitle">Venta rápida de mostrador con inventario, cliente y cobro en una sola operación.</p></div><div className="pos-header-controls"><label>Almacén<select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">Selecciona un almacén</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><button type="button" className="secondary-button" onClick={() => { setCart([]); setTenders([]); setError(null); setSuccess(null); }}>Nueva venta</button></div></div>
    {loading ? <div className="module-state"><LoaderCircle className="spin" size={24} /> Preparando caja…</div> : <div className="pos-layout">
      <section className="pos-catalog" aria-label="Catálogo de productos"><div className="pos-catalog-toolbar"><label className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o SKU" /></label><span>{availableProducts.length} productos</span></div><div className="pos-product-grid">{availableProducts.map((product) => <button key={product.id} type="button" className="pos-product-card" draggable onDragStart={(event) => beginProductDrag(event, product.id)} onClick={() => addProduct(product)}><span className="pos-product-sku">{product.sku}</span><strong>{product.name}</strong><small>{product.tracking_mode === "serial" ? "Control por serie" : product.tracking_mode === "lot" ? "Control por lote" : "Disponible para venta"}</small><b>{money.format(Number(product.sale_price))}</b><span className="pos-add-label"><Plus size={15} /> Agregar</span></button>)}</div>{availableProducts.length === 0 && <div className="module-state"><Search size={24} /> No hay productos con esa búsqueda.</div>}</section>
      <aside className="pos-cart" onDragOver={(event) => event.preventDefault()} onDrop={dropProduct} aria-label="Carrito y cobro"><div className="pos-cart-heading"><div><ShoppingBag size={19} /><h2>Carrito</h2></div><span>{cart.reduce((sum, line) => sum + line.quantity, 0)} artículos</span></div><div className="pos-cart-lines">{cart.length === 0 ? <div className="pos-empty-cart"><ShoppingBag size={28} /><strong>El carrito está vacío</strong><span>Haz clic o arrastra un producto aquí.</span></div> : cart.map((line) => <article key={line.product.id} className="pos-cart-line"><div><strong>{line.product.name}</strong><small>{money.format(Number(line.product.sale_price))} c/u</small>{line.product.tracking_mode === "serial" && <input value={line.serialText} onChange={(event) => setCart((current) => current.map((item) => item.product.id === line.product.id ? { ...item, serialText: event.target.value } : item))} placeholder={`Series (${line.quantity}), separadas por coma`} />}</div><div className="pos-line-actions"><div className="pos-quantity"><button type="button" aria-label={`Reducir ${line.product.name}`} onClick={() => updateQuantity(line.product.id, line.quantity - 1)}><Minus size={14} /></button><b>{line.quantity}</b><button type="button" aria-label={`Aumentar ${line.product.name}`} onClick={() => updateQuantity(line.product.id, line.quantity + 1)}><Plus size={14} /></button></div><strong>{money.format(Number(line.product.sale_price) * line.quantity)}</strong><button type="button" className="icon-button" aria-label={`Eliminar ${line.product.name}`} onClick={() => updateQuantity(line.product.id, 0)}><Trash2 size={16} /></button></div></article>)}</div>
        <section className="pos-customer"><div className="pos-section-title"><UserRound size={16} /><strong>Cliente</strong><button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery(""); setLookupDocument(""); }}>Consumidor final</button></div><p>{selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.tax_id ? ` · ${selectedCustomer.tax_id}` : ""}` : "Consumidor final (sin documento)"}</p><div className="pos-customer-tools"><div><Search size={15} /><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Buscar cliente registrado" /></div><input value={lookupDocument} onChange={(event) => setLookupDocument(event.target.value)} placeholder="DNI o RUC" /><button type="button" className="secondary-button" onClick={() => void lookupCustomer()} disabled={lookupBusy}>{lookupBusy ? "…" : "Consultar"}</button></div>{customerQuery && matchingCustomers.length > 0 && <div className="pos-customer-results">{matchingCustomers.map((customer) => <button type="button" key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(customer.name); }}><strong>{customer.name}</strong><small>{customer.code}{customer.tax_id ? ` · ${customer.tax_id}` : ""}</small></button>)}</div>}</section>
        <section className="pos-payment"><div className="pos-section-title"><ReceiptText size={16} /><strong>Comprobante y pago</strong></div><div className="pos-document-options"><button type="button" className={documentType === "ticket" ? "selected" : ""} onClick={() => setDocumentType("ticket")}>Recibo interno</button><button type="button" className={documentType === "03" ? "selected" : ""} onClick={() => setDocumentType("03")}>Boleta</button><button type="button" className={documentType === "01" ? "selected" : ""} onClick={() => setDocumentType("01")}>Factura</button></div><small>{documentType === "ticket" ? "Recibo interno de venta. No es guía de remisión ni CPE." : documentType === "01" ? "Factura: requiere RUC de 11 dígitos." : total > 700 ? "Boleta mayor a S/ 700: requiere DNI/RUC y nombre." : "Boleta: el cliente puede ser consumidor final hasta S/ 700."}</small><div className="pos-methods">{activeMethods.map((config) => { const Icon = methodIcons[config.method]; return <button type="button" key={config.method} className={activeMethod === config.method ? "selected" : ""} onClick={() => { setActiveMethod(config.method); setTenderAmount(Math.max(0, balance).toFixed(2)); }}><Icon size={16} />{methodLabels[config.method]}</button>; })}</div>{activeMethod && <div className="pos-tender-editor"><input type="number" min="0.01" step="0.01" value={tenderAmount} onChange={(event) => setTenderAmount(event.target.value)} aria-label="Importe del medio de pago" /><input value={tenderReference} onChange={(event) => setTenderReference(event.target.value)} placeholder="Referencia opcional" /><button type="button" className="secondary-button" onClick={addTender}>Agregar</button></div>}<div className="pos-tender-list">{tenders.map((tender, index) => <div key={`${tender.method}-${index}`}><span>{methodLabels[tender.method]}{tender.reference ? ` · ${tender.reference}` : ""}</span><b>{money.format(tender.amount)}</b><button type="button" onClick={() => setTenders((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Eliminar medio de pago"><X size={14} /></button></div>)}</div></section>
        {error && <p className="login-error">{error}</p>}{success && <p className="pos-success"><Check size={16} /> Venta {success.sale_number} registrada. Recibo {success.ticket_number}.</p>}{cpeWarning && <p className="login-error">{cpeWarning}</p>}
        <footer className="pos-total"><div><span>Total</span><strong>{money.format(total)}</strong></div><div><span>Cobrado</span><b className={Math.abs(balance) < 0.005 ? "balanced" : ""}>{money.format(tenderTotal)}</b></div><button type="button" className="primary-button" disabled={!canCheckout} onClick={() => void checkout()}>{submitting ? "Registrando…" : `Cobrar ${money.format(total)}`}</button></footer>
      </aside>
    </div>}
  </section>;
}
