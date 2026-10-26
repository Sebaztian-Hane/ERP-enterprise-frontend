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
import { ApiError, apiFetch, postIdempotent } from "../lib/api";
import { fetchPage, PageMeta, TablePagination } from "../lib/pagination";
import { DataMigrationPanel } from "./DataMigrationPanel";

type Customer = { id: string; code: string; name: string };
type CustomerLookup = { existing_customer_id: string | null; tax_id: string; name: string; address: string; document_type: "DNI" | "RUC" };
type Product = { id: string; sku: string; name: string; sale_price: string; tracking_mode: "none" | "lot" | "serial" };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
type PriceList = { id: string; code: string; name: string; currency_code: string; currency_symbol?: string | null };
type PaymentTerm = { id: string; code: string; name: string; days_due: number };
type CostCenter = { id: string; code: string; name: string };
type PriceListQuote = { price_list_id: string; lines: { product_id: string; quantity: number; unit_price: string }[] };
type Sale = {
  id: string;
  number: string;
  customer_id: string;
  warehouse_id: string;
  status: string;
  total: string;
  note: string | null;
};
type Line = { product_id: string; quantity: number; unit_price: number; serial_text?: string };
type SalesDraft = {
  customerId: string; customerMode: "existing" | "lookup"; customerTaxId: string; customerName: string;
  customerEmail: string; customerPhone: string; warehouseId: string; priceListId: string;
  paymentTermId: string; costCenterId: string; note: string; lines: Line[];
};
type ElectronicDocument = {
  id: string;
  document_type: "01" | "03";
  series: string;
  correlative: string;
  file_name: string;
  status: string;
  provider_document_id: string | null;
  xml_url: string | null;
  cdr_url: string | null;
  provider_response_hash: string | null;
  provider_response_at: string | null;
  last_error: string | null;
};
type ElectronicArtifact = { id: string; artifact_type: "provider_response" | "xml" | "cdr" | "pdf"; capture_status: "stored" | "unavailable" | "failed"; content_type: string | null; size_bytes: number | null; content_hash: string | null; provider_document_id: string | null; error_message: string | null; captured_at: string };
type ElectronicEvent = { id: string; event_type: string; document_status: string | null; provider_document_id: string | null; payload_hash: string | null; detail: string | null; created_at: string };
type ElectronicTrace = { document_id: string; artifacts: ElectronicArtifact[]; events: ElectronicEvent[] };
const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

type PickerOption = { id: string; primary: string; secondary?: string };

function EntityPicker({ pickerId, label, placeholder, value, options, onChange, isOpen, onOpen, onClose, required = false }: { pickerId: string; label: string; placeholder: string; value: string; options: PickerOption[]; onChange: (id: string) => void; isOpen: boolean; onOpen: () => void; onClose: () => void; required?: boolean }) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const matches = options.filter((option) => `${option.primary} ${option.secondary ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 8);
  const choose = (id: string) => { onChange(id); setQuery(""); onClose(); };
  const menuId = `${pickerId}-options`;
  return <div className="entity-picker" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
    <label htmlFor={pickerId}>{label}</label>
    <div className="entity-picker-control">
      <Search size={16} />
      <input id={pickerId} required={required} value={isOpen ? query : (selected?.primary ?? "")} onFocus={onOpen} onChange={(event) => { setQuery(event.target.value); onOpen(); }} placeholder={placeholder} aria-autocomplete="list" aria-controls={menuId} aria-expanded={isOpen} role="combobox" />
      <button type="button" className="entity-picker-clear" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setQuery(""); onOpen(); }} aria-label={`Limpiar ${label}`}>×</button>
    </div>
    {isOpen && <div id={menuId} className="entity-picker-menu" role="listbox">{matches.length ? matches.map((option) => <button type="button" role="option" aria-selected={value === option.id} key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.id)}><strong>{option.primary}</strong>{option.secondary && <small>{option.secondary}</small>}</button>) : <p>Sin coincidencias. Ajusta la búsqueda.</p>}</div>}
  </div>;
}

export function SalesPage({ goBack, mode = "sales" }: { goBack: () => void; mode?: "sales" | "pos" }) {
  const isPos = mode === "pos";
  const { session, tenantId } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
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
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerPickerQuery, setCustomerPickerQuery] = useState("");
  const [customerPickerPage, setCustomerPickerPage] = useState(1);
  const [customerPickerItems, setCustomerPickerItems] = useState<Customer[]>([]);
  const [customerPickerMeta, setCustomerPickerMeta] = useState<PageMeta>({ page: 1, page_size: 25, total: 0, total_pages: 0, has_previous: false, has_next: false });
  const [customerPickerLoading, setCustomerPickerLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [priceListId, setPriceListId] = useState("");
  const [paymentTermId, setPaymentTermId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [quotingPrices, setQuotingPrices] = useState(false);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [billingSale, setBillingSale] = useState<Sale | null>(null);
  const [billingDocument, setBillingDocument] = useState<ElectronicDocument | null>(null);
  const [billingTrace, setBillingTrace] = useState<ElectronicTrace | null>(null);
  const [billingType, setBillingType] = useState<"01" | "03">("03");
  const [billingBusy, setBillingBusy] = useState(false);
  const [voidReason, setVoidReason] = useState("Anulación solicitada desde EnterpriseCloud");
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returningBusy, setReturningBusy] = useState(false);
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const draftKey = tenantId && session?.user.id ? `enterprisecloud.draft.sale.${mode}.${tenantId}.${session.user.id}` : null;
  const clearDraft = () => { if (draftKey) localStorage.removeItem(draftKey); };
  const restoreDraft = (): SalesDraft | null => {
    if (!draftKey) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(draftKey) ?? "null") as Partial<SalesDraft> | null;
      if (!parsed || !Array.isArray(parsed.lines)) return null;
      return {
        customerId: parsed.customerId ?? "", customerMode: parsed.customerMode === "lookup" ? "lookup" : "existing",
        customerTaxId: parsed.customerTaxId ?? "", customerName: parsed.customerName ?? "", customerEmail: parsed.customerEmail ?? "", customerPhone: parsed.customerPhone ?? "",
        warehouseId: parsed.warehouseId ?? "", priceListId: parsed.priceListId ?? "", paymentTermId: parsed.paymentTermId ?? "", costCenterId: parsed.costCenterId ?? "", note: parsed.note ?? "",
        lines: parsed.lines.filter((line): line is Line => Boolean(line && typeof line.product_id === "string" && Number.isFinite(Number(line.quantity)) && Number.isFinite(Number(line.unit_price)))),
      };
    } catch { return null; }
  };
  const load = async (targetPage = page) => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [history, people, items, stores, commercialLists, terms, centers] = await Promise.all([
        fetchPage<Sale, "sales">("/sales", "sales", targetPage, options),
        apiFetch<Customer[]>("/customers", options),
        apiFetch<Product[]>("/products", options),
        apiFetch<Warehouse[]>("/sales/warehouses", options),
        apiFetch<PriceList[]>("/sales/price-lists", options),
        apiFetch<PaymentTerm[]>("/sales/payment-terms", options),
        apiFetch<CostCenter[]>("/sales/cost-centers", options),
      ]);
      setSales(history.sales); setMeta(history.meta);
      setCustomers(people);
      setProducts(items);
      setWarehouses(stores.filter((store) => store.is_active));
      setPriceLists(commercialLists);
      setPaymentTerms(terms);
      setCostCenters(centers);
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
  useEffect(() => {
    if (!isOpen || !draftKey) return;
    const draft: SalesDraft = { customerId, customerMode, customerTaxId, customerName, customerEmail, customerPhone, warehouseId, priceListId, paymentTermId, costCenterId, note, lines };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [isOpen, draftKey, customerId, customerMode, customerTaxId, customerName, customerEmail, customerPhone, warehouseId, priceListId, paymentTermId, costCenterId, note, lines]);
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines],
  );
  const openNew = () => {
    setError(null);
    const saved = restoreDraft();
    if (saved) {
      setCustomerId(saved.customerId); setCustomerMode(saved.customerMode); setCustomerTaxId(saved.customerTaxId); setCustomerName(saved.customerName); setCustomerEmail(saved.customerEmail); setCustomerPhone(saved.customerPhone);
      setWarehouseId(saved.warehouseId); setPriceListId(saved.priceListId); setPaymentTermId(saved.paymentTermId); setCostCenterId(saved.costCenterId); setNote(saved.note); setLines(saved.lines);
      setCustomerLookupHint("Se restauró tu borrador local. Verifica los datos antes de registrar la venta."); setActivePicker(null); setIsOpen(true); return;
    }
    // Transactional identities must always be deliberately selected.  Choosing
    // the first customer or warehouse here can post stock and receivables to
    // the wrong party when the user simply submits a new form.
    setCustomerId("");
    setCustomerMode(customers.length ? "existing" : "lookup");
    setCustomerTaxId(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerLookupHint(null);
    setWarehouseId("");
    setPriceListId("");
    setPaymentTermId("");
    setCostCenterId(costCenters.find((center) => center.code === "GENERAL")?.id ?? costCenters[0]?.id ?? "");
    setNote("");
    setLines([]);
    setActivePicker(null);
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
  const applyPriceList = async (targetPriceListId = priceListId) => {
    if (!targetPriceListId || lines.length === 0) {
      setError("Selecciona una lista de precios y agrega al menos un producto para aplicar sus tarifas.");
      return;
    }
    setQuotingPrices(true);
    setError(null);
    try {
      const quote = await apiFetch<PriceListQuote>("/sales/price-lists/" + targetPriceListId + "/quote", {
        ...options,
        method: "POST",
        body: JSON.stringify({ lines: lines.map(({ product_id, quantity }) => ({ product_id, quantity })) }),
      });
      const prices = new Map(quote.lines.map((item) => [item.product_id, Number(item.unit_price)]));
      setLines((current) => current.map((line) => ({ ...line, unit_price: prices.get(line.product_id) ?? line.unit_price })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron aplicar las tarifas vigentes.");
    } finally {
      setQuotingPrices(false);
    }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalidLine = lines.some((line) => !line.product_id || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unit_price) || line.unit_price < 0);
    const lookupDocumentIsValid = /^\d{8}(\d{3})?$/.test(customerTaxId);
    if ((!customerId && customerMode === "existing") || ((!customerTaxId || !customerName) && customerMode === "lookup") || !warehouseId || !costCenterId || lines.length === 0 || invalidLine) {
      setError("Completa el cliente, almacén, centro de costo y líneas válidas antes de registrar la venta.");
      return;
    }
    if (customerMode === "lookup" && !lookupDocumentIsValid) {
      setError("El cliente nuevo debe tener un DNI de 8 dígitos o un RUC de 11 dígitos.");
      return;
    }
    const serialLine = lines.find((line) => {
      const product = products.find((item) => item.id === line.product_id);
      const serials = (line.serial_text ?? "").split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
      return product?.tracking_mode === "serial" && serials.length !== line.quantity;
    });
    if (serialLine) {
      setError("La cantidad de series ingresadas debe coincidir con la cantidad vendida del producto serializado.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await postIdempotent<Sale>("/sales", {
        ...options,
        body: JSON.stringify({
          ...(customerMode === "existing" ? { customer_id: customerId } : { customer: { tax_id: customerTaxId, name: customerName, email: customerEmail || null, phone: customerPhone || null } }),
          warehouse_id: warehouseId,
          price_list_id: priceListId || null,
          payment_term_id: paymentTermId || null,
          cost_center_id: costCenterId || null,
          lines: lines.map(({ serial_text, ...line }) => ({ ...line, serial_numbers: serial_text ? serial_text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean) : null })),
          note: note || null,
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
      if (result.existing_customer_id) {
        setCustomerId(result.existing_customer_id);
        setCustomers((current) => current.some((customer) => customer.id === result.existing_customer_id) ? current : [...current, { id: result.existing_customer_id!, name: result.name, code: `CLI-${result.tax_id}` }]);
        setCustomerMode("existing");
        setCustomerLookupHint("Cliente existente encontrado: se reutilizará en esta venta.");
      }
      else setCustomerLookupHint(`${result.document_type} consultado. Verifica los datos antes de registrar la venta.`);
    } catch (cause) { setCustomerLookupHint(cause instanceof Error ? cause.message : "No se pudo consultar el documento."); }
    finally { setCustomerLookupBusy(false); }
  };
  const loadCustomerPicker = async (targetPage = customerPickerPage, query = customerPickerQuery) => {
    if (!session || !tenantId) return;
    setCustomerPickerLoading(true);
    try {
      const normalizedQuery = query.trim();
      const path = normalizedQuery ? `/customers?q=${encodeURIComponent(normalizedQuery)}` : "/customers";
      const result = await fetchPage<Customer, "customers">(path, "customers", targetPage, options);
      setCustomerPickerItems(result.customers); setCustomerPickerMeta(result.meta);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron buscar los clientes."); }
    finally { setCustomerPickerLoading(false); }
  };
  const openCustomerPicker = () => { setActivePicker(null); setCustomerPickerPage(1); setCustomerPickerOpen(true); void loadCustomerPicker(1); };
  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomers((current) => current.some((item) => item.id === customer.id) ? current : [...current, customer]);
    setCustomerPickerOpen(false);
  };
  const nameFor = (id: string) =>
    customers.find((customer) => customer.id === id)?.name ?? "Cliente";
  const selectCustomerMode = (mode: "existing" | "lookup") => {
    setCustomerMode(mode);
    setError(null);
    setCustomerLookupHint(null);
    if (mode === "lookup") setCustomerId("");
  };
  const loadBillingTrace = async (saleId: string) => {
    try {
      setBillingTrace(await apiFetch<ElectronicTrace>(`/sales/${saleId}/electronic-document/trace`, options));
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 404)) setError(cause instanceof Error ? cause.message : "No se pudo cargar la trazabilidad fiscal.");
    }
  };
  const downloadBillingArtifact = async (artifact: ElectronicArtifact) => {
    if (!billingSale || artifact.capture_status !== "stored") return;
    setBillingBusy(true);
    try {
      const download = await apiFetch<{ url: string }>(`/sales/${billingSale.id}/electronic-document/artifacts/${artifact.id}/download`, options);
      window.open(download.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo preparar la descarga segura.");
    } finally { setBillingBusy(false); }
  };
  const artifactLabel = (type: ElectronicArtifact["artifact_type"]) => ({ provider_response: "Respuesta del proveedor", xml: "XML", cdr: "CDR", pdf: "PDF" }[type]);
  const openBilling = async (sale: Sale) => {
    setError(null);
    setBillingSale(sale);
    setBillingDocument(null);
    setBillingTrace(null);
    setVoidReason("Anulación solicitada desde EnterpriseCloud");
    try {
      const document = await apiFetch<ElectronicDocument | null>(`/sales/${sale.id}/electronic-document`, options);
      setBillingDocument(document);
      setBillingType(document?.document_type ?? "03");
      if (document) void loadBillingTrace(sale.id);
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
      const document = await postIdempotent<ElectronicDocument>(`/sales/${billingSale.id}/electronic-document`, {
        ...options, body: JSON.stringify({ document_type: billingType }),
      });
      setBillingDocument(document);
      await loadBillingTrace(billingSale.id);
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
      await loadBillingTrace(billingSale.id);
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
      await loadBillingTrace(billingSale.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo solicitar la anulación.");
    } finally { setBillingBusy(false); }
  };
  const billingStatus = (value: string) => ({
    reserved: "Reservado para envío",
    submitted: "Enviado al proveedor",
    accepted: "Aceptado",
    observed: "Observado",
    rejected: "Rechazado",
    unknown: "Requiere conciliación",
    void_pending: "Anulación pendiente",
    voided: "Anulado",
  }[value] ?? value);
  const returnSale = async () => {
    if (!returningSale || returnReason.trim().length < 3) return;
    setReturningBusy(true); setError(null);
    try {
      await postIdempotent(`/sales/${returningSale.id}/return`, { ...options, body: JSON.stringify({ reason: returnReason.trim() }) });
      setReturningSale(null); setReturnReason(""); await load();
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
          <p className="eyebrow">OPERACIÓN COMERCIAL</p>
          <h1>{isPos ? "Punto de venta" : "Ventas"}</h1>
          <p className="subtitle">
            {isPos ? "Registra cobros de mostrador con el mismo stock, clientes y comprobantes de la empresa." : "Registra operaciones y consulta las ventas procesadas de la empresa."}
          </p>
        </div>
        <button className="primary-button" onClick={openNew}>
          <Plus size={18} /> {isPos ? "Abrir venta rápida" : "Nueva venta"}
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
                  <th aria-label="Devolución" />
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
                      <span className={`status-pill ${sale.status === "returned" || sale.status === "cancelled" ? "inactive" : "active"}`}>
                        {sale.status === "posted" ? "Procesada" : sale.status === "returned" ? "Devuelta" : sale.status}
                      </span>
                    </td>
                    <td>
                      <strong>{currency.format(Number(sale.total))}</strong>
                    </td>
                    <td>{sale.note || "—"}</td>
                    <td><button className="table-action-button" onClick={() => void openBilling(sale)}><FileText size={15} /> Comprobante</button></td>
                    <td>{sale.status === "posted" ? <button className="text-button danger-button" onClick={() => { setReturnReason(""); setReturningSale(sale); }}>Devolver</button> : "—"}</td>
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
                <h2>{isPos ? "Venta rápida" : "Nueva venta"}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <form noValidate onSubmit={save} className="sale-form">
              <div className="form-grid">
                <EntityPicker pickerId="sale-warehouse" label="Almacén" placeholder="Busca un almacén" required value={warehouseId} onChange={setWarehouseId} isOpen={activePicker === "warehouse"} onOpen={() => setActivePicker("warehouse")} onClose={() => setActivePicker(null)} options={warehouses.map((store) => ({ id: store.id, primary: store.name, secondary: store.code }))} />
                {!isPos && <><div className="price-list-field"><EntityPicker pickerId="sale-price-list" label="Lista de precios (opcional)" placeholder="Precio estándar del producto" value={priceListId} onChange={setPriceListId} isOpen={activePicker === "price-list"} onOpen={() => setActivePicker("price-list")} onClose={() => setActivePicker(null)} options={priceLists.map((list) => ({ id: list.id, primary: list.name, secondary: list.code + " · " + list.currency_code }))} />{priceListId && <button type="button" className="secondary-button" onClick={() => void applyPriceList()} disabled={quotingPrices || lines.length === 0}>{quotingPrices ? "Actualizando…" : "Actualizar tarifas"}</button>}</div>
                <EntityPicker pickerId="sale-payment-term" label="Condición de pago (opcional)" placeholder="Vencimiento al contado" value={paymentTermId} onChange={setPaymentTermId} isOpen={activePicker === "payment-term"} onOpen={() => setActivePicker("payment-term")} onClose={() => setActivePicker(null)} options={paymentTerms.map((term) => ({ id: term.id, primary: term.name, secondary: term.code + " · " + term.days_due + " día(s)" }))} />
                <EntityPicker pickerId="sale-cost-center" label="Centro de costo" placeholder="Operación general" required value={costCenterId} onChange={setCostCenterId} isOpen={activePicker === "cost-center"} onOpen={() => setActivePicker("cost-center")} onClose={() => setActivePicker(null)} options={costCenters.map((center) => ({ id: center.id, primary: center.name, secondary: center.code }))} /></>}
                <p className="field-help sale-folio-help">{isPos ? "La venta se registra al contado con el centro de costo general. El comprobante se puede emitir desde el historial." : "El folio se asignará automáticamente según la entidad, sucursal y tipo de documento."}</p>
              </div>
              {!isPos && priceListId && <p className="field-help">La lista se valida nuevamente al registrar la venta. Si falta una tarifa vigente para un producto, la venta no se procesará.</p>}
              {!isPos && paymentTermId && <p className="field-help">El vencimiento se calculará y quedará registrado con la condición seleccionada.</p>}
              <section className="sale-customer-card">
                <div className="sale-customer-heading"><div><span>Cliente</span><small>Usa un cliente registrado o consulta DNI/RUC.</small></div><div className="segmented-control"><button type="button" className={customerMode === "existing" ? "is-active" : ""} onClick={() => selectCustomerMode("existing")}>Existente</button><button type="button" className={customerMode === "lookup" ? "is-active" : ""} onClick={() => selectCustomerMode("lookup")}>Nuevo DNI/RUC</button></div></div>
                {customerMode === "existing" ? <label className="customer-picker-field">Cliente registrado<button type="button" className="customer-picker-trigger" onClick={openCustomerPicker}><Search size={17} /><span>{customers.find((customer) => customer.id === customerId)?.name ?? "Buscar y seleccionar cliente"}</span><small>{customers.find((customer) => customer.id === customerId)?.code ?? "Nombre, código o documento"}</small></button></label> : <div className="customer-lookup-fields"><label>Documento DNI o RUC<input inputMode="numeric" maxLength={11} value={customerTaxId} onChange={(event) => setCustomerTaxId(event.target.value.replace(/\D/g, ""))} placeholder="Ingresa DNI o RUC" /></label><button type="button" className="secondary-button" onClick={() => void lookupCustomer()} disabled={customerLookupBusy}>{customerLookupBusy ? "Consultando…" : "Consultar"}</button><label className="wide">Nombre o razón social<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Se completa al consultar" /></label><label>Correo (opcional)<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label><label>Teléfono (opcional)<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>{customerLookupHint && <p className="customer-lookup-hint">{customerLookupHint}</p>}</div>}
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
                    <div className="sale-line-wrap" key={line.product_id}><div className="sale-line">
                      <EntityPicker pickerId={`sale-product-${line.product_id}`} label="Producto" placeholder="Busca por nombre o SKU" value={line.product_id} onChange={(productId) => { const item = products.find((product) => product.id === productId); updateLine(index, { product_id: productId, unit_price: Number(item?.sale_price ?? 0), serial_text: "" }); }} isOpen={activePicker === `product-${line.product_id}`} onOpen={() => setActivePicker(`product-${line.product_id}`)} onClose={() => setActivePicker(null)} options={products.filter((product) => product.id === line.product_id || !lines.some((other) => other.product_id === product.id)).map((product) => ({ id: product.id, primary: product.name, secondary: product.sku }))} />
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
                          readOnly={Boolean(priceListId)}
                          onChange={(event) => updateLine(index, { unit_price: Number(event.target.value) })}
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
                    </div>{products.find((item) => item.id === line.product_id)?.tracking_mode === "serial" && <div className="tracking-line-fields"><input required placeholder="Series vendidas, una por línea o coma" value={line.serial_text ?? ""} onChange={(event) => updateLine(index, { serial_text: event.target.value })} /></div>}{products.find((item) => item.id === line.product_id)?.tracking_mode === "lot" && <small className="tracking-line-help">Los lotes se asignarán automáticamente por vencimiento próximo (FEFO).</small>}</div>
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
      {customerPickerOpen && <div className="modal-layer customer-picker-layer" role="presentation"><section className="customer-modal customer-picker-modal" role="dialog" aria-modal="true" aria-labelledby="customer-picker-title"><div className="modal-header"><div><p className="eyebrow">CARTERA COMERCIAL</p><h2 id="customer-picker-title">Seleccionar cliente</h2></div><button type="button" className="icon-button" onClick={() => setCustomerPickerOpen(false)} aria-label="Cerrar"><X size={20} /></button></div><div className="customer-picker-toolbar"><label className="search customer-search"><Search size={18} /><input autoFocus value={customerPickerQuery} onChange={(event) => setCustomerPickerQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setCustomerPickerPage(1); void loadCustomerPicker(1); } }} placeholder="Buscar por razón social, código o DNI/RUC" /></label><button type="button" className="secondary-button" onClick={() => { setCustomerPickerPage(1); void loadCustomerPicker(1); }} disabled={customerPickerLoading}>{customerPickerLoading ? "Buscando…" : "Buscar"}</button></div><p className="customer-picker-help">Selecciona un cliente para asociarlo a la venta. La búsqueda se realiza en toda la cartera de la empresa activa.</p>{customerPickerLoading ? <div className="module-state"><LoaderCircle className="spin" size={22} /> Buscando clientes…</div> : customerPickerItems.length === 0 ? <div className="module-state"><Search size={24} /><strong>No se encontraron clientes</strong><span>Prueba con otro nombre, código o documento.</span></div> : <><div className="table-wrap customer-picker-table"><table className="customers-table"><thead><tr><th>CLIENTE</th><th>CÓDIGO</th><th>ACCIÓN</th></tr></thead><tbody>{customerPickerItems.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.code}</td><td><button type="button" className="table-action-button" onClick={() => selectCustomer(customer)}>Seleccionar</button></td></tr>)}</tbody></table></div><TablePagination meta={customerPickerMeta} label="clientes" onPageChange={(nextPage) => { setCustomerPickerPage(nextPage); void loadCustomerPicker(nextPage); }} /></>}</section></div>}
      {billingSale && (
        <div className="modal-layer">
          <section className="sale-modal billing-modal" role="dialog" aria-modal="true" aria-label="Facturación electrónica">
            <div className="modal-header"><div><p className="eyebrow">FACTURACIÓN ELECTRÓNICA · DESARROLLO</p><h2>Comprobante de venta</h2></div><button className="icon-button" onClick={() => setBillingSale(null)} aria-label="Cerrar"><X size={20} /></button></div>
            <div className="billing-summary"><span>{billingSale.number}</span><strong>{nameFor(billingSale.customer_id)}</strong><b>{currency.format(Number(billingSale.total))}</b></div>
            {billingDocument ? <div className="billing-result"><span className={`status-pill ${billingDocument.status === "accepted" ? "active" : "inactive"}`}>{billingStatus(billingDocument.status)}</span><strong>{billingDocument.document_type === "01" ? "Factura" : "Boleta"} {billingDocument.series}-{billingDocument.correlative}</strong><small>Documento de prueba APISUNAT · {billingDocument.file_name}</small>{billingDocument.status === "reserved" && <p>El comprobante quedó reservado y será enviado en segundo plano.</p>}{billingDocument.status === "submitted" && <p>El proveedor recibió el envío; actualiza el estado para consultar su respuesta.</p>}{billingDocument.status === "unknown" && <p className="login-error">La respuesta del proveedor es incierta. No emitas otro comprobante: concilia primero este correlativo.</p>}{billingDocument.last_error && <p className="login-error">{billingDocument.last_error}</p>}<div className="billing-links"><button className="secondary-button" onClick={() => void refreshDocument()} disabled={billingBusy || !billingDocument.provider_document_id}><RefreshCw size={15} className={billingBusy ? "spin" : ""} /> Actualizar estado</button></div>{billingTrace && <section className="billing-evidence" aria-label="Expediente fiscal"><strong>Expediente fiscal</strong><small>Archivos privados y trazabilidad con huella SHA-256.</small><div className="billing-evidence-list">{billingTrace.artifacts.map((artifact) => <div key={artifact.id} className="billing-evidence-item"><div><b>{artifactLabel(artifact.artifact_type)}</b><small>{artifact.capture_status === "stored" ? artifact.content_hash ? `SHA-256 ${artifact.content_hash.slice(0, 16)}…` : "Guardado" : artifact.error_message ?? "No disponible"}</small></div>{artifact.capture_status === "stored" ? <button type="button" className="table-action-button" onClick={() => void downloadBillingArtifact(artifact)} disabled={billingBusy}>Descargar</button> : <span className="status-pill inactive">{artifact.capture_status === "failed" ? "Falló captura" : "No disponible"}</span>}</div>)}</div><details className="billing-trace-details"><summary>Trazabilidad ({billingTrace.events.length} eventos)</summary>{billingTrace.events.map((event) => <p key={event.id}><b>{event.event_type}</b> · {event.document_status ?? "sin estado"}{event.payload_hash ? ` · ${event.payload_hash.slice(0, 12)}…` : ""}</p>)}</details></section>}{billingDocument.provider_document_id && !['voided', 'void_pending', 'unknown'].includes(billingDocument.status) && <div className="billing-void"><label>Motivo de anulación<input value={voidReason} maxLength={250} onChange={(event) => setVoidReason(event.target.value)} /></label><button className="secondary-button danger-button" onClick={() => void voidDocument()} disabled={billingBusy || !voidReason.trim()}>Solicitar anulación</button></div>}</div> : <div className="billing-choice"><p>Elige el tipo de comprobante. Se emitirá únicamente en el ambiente de pruebas.</p><label>Tipo de comprobante<select value={billingType} onChange={(event) => setBillingType(event.target.value as "01" | "03")}><option value="03">Boleta de venta</option><option value="01">Factura</option></select></label><small>Factura requiere RUC de 11 dígitos; Boleta requiere DNI o RUC registrado en el cliente.</small><button className="primary-button" onClick={() => void issueDocument()} disabled={billingBusy}>{billingBusy ? "Reservando…" : "Emitir comprobante de prueba"}</button></div>}
          </section>
        </div>
      )}
      {returningSale && <div className="modal-layer"><section className="customer-modal" role="dialog" aria-modal="true" aria-label="Devolver venta"><div className="modal-header"><div><p className="eyebrow">DEVOLUCIÓN COMERCIAL</p><h2>Devolver venta {returningSale.number}</h2></div><button className="icon-button" onClick={() => setReturningSale(null)} aria-label="Cerrar"><X size={20} /></button></div><div className="customer-form"><p className="field-help">Se revertirá completamente el stock, la cuenta por cobrar y el asiento. Si existe un CPE activo, primero corresponde emitir su nota de crédito.</p><label>Motivo<input autoFocus minLength={3} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Describe el motivo de la devolución" /></label>{error && <p className="login-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setReturningSale(null)}>Cancelar</button><button type="button" className="danger-button" disabled={returningBusy || returnReason.trim().length < 3} onClick={() => void returnSale()}>{returningBusy ? "Registrando…" : "Confirmar devolución"}</button></div></div></section></div>}
    </section>
  );
}
