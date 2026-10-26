import { ChangeEvent, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";
import { buildImportTemplateWorkbook } from "../lib/importTemplateWorkbook";

export type ImportModule = "products" | "customers" | "suppliers" | "warehouses" | "inventory" | "sales" | "purchases";

const templates: Record<ImportModule, { label: string; columns: string[]; example: string[] }> = {
  products: { label: "Productos", columns: ["sku", "name", "category", "unit", "sale_price", "average_cost"], example: ["SKU-001", "Producto de ejemplo", "General", "unit", "100.00", "80.00"] },
  customers: { label: "Clientes", columns: ["code", "name", "tax_id", "email", "phone", "credit_limit"], example: ["CLI-001", "Cliente de ejemplo", "12345678", "contacto@cliente.com", "999000000", "0"] },
  suppliers: { label: "Proveedores", columns: ["code", "name", "tax_id", "email", "phone", "address"], example: ["PRV-001", "Proveedor de ejemplo", "20123456789", "ventas@proveedor.com", "999000000", "Dirección fiscal"] },
  warehouses: { label: "Almacenes", columns: ["code", "name", "address"], example: ["ALM-001", "Almacén principal", "Dirección del almacén"] },
  inventory: { label: "Ajustes de inventario", columns: ["number", "sku", "warehouse_code", "quantity", "reason", "reference", "note"], example: ["AJ-20261019-001", "SKU-001", "ALM-001", "25", "Carga inicial", "MIG-001", "Existencia inicial"] },
  sales: { label: "Ventas", columns: ["number", "customer_tax_id", "customer_name", "warehouse_code", "product_sku", "quantity", "unit_price", "due_date", "note"], example: ["V-20261019-001", "12345678", "Cliente de ejemplo", "ALM-001", "SKU-001", "2", "100.00", "2026-10-19", "Migración histórica"] },
  purchases: { label: "Compras", columns: ["number", "supplier_tax_id", "supplier_name", "warehouse_code", "product_sku", "quantity", "unit_cost", "due_date", "note"], example: ["C-20261019-001", "20123456789", "Proveedor de ejemplo", "ALM-001", "SKU-001", "10", "80.00", "2026-10-19", "Migración histórica"] },
};

type Preview = { valid_rows: number; errors: { row: number; message: string }[]; conflicts: string[]; can_commit: boolean; sample: Record<string, unknown>[] };

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function DataMigrationPanel({ module, onImported }: { module: ImportModule; onImported: () => Promise<void> | void }) {
  const { session, tenantId, roleCode } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const template = templates[module];

  if (roleCode !== "owner" && roleCode !== "admin") return null;

  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const payload = () => {
    if (!file) throw new Error("Selecciona una plantilla CSV o XLSX.");
    const body = new FormData();
    body.append("file", file);
    return body;
  };
  const reset = () => { setFile(null); setPreview(null); setError(null); if (input.current) input.current.value = ""; };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setError(null); };
  const downloadTemplate = () => {
    const csv = `${template.columns.join(",")}\n${template.example.map(csvCell).join(",")}\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `plantilla-${module}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const downloadXlsxTemplate = () => {
    const workbook = buildImportTemplateWorkbook(template.columns, template.example);
    const url = URL.createObjectURL(workbook);
    const link = document.createElement("a"); link.href = url; link.download = `plantilla-${module}.xlsx`; link.click(); URL.revokeObjectURL(url);
  };
  const previewFile = async () => {
    try {
      setBusy("preview"); setError(null);
      setPreview(await apiFetch<Preview>(`/imports/${module}/preview`, { ...options, method: "POST", body: payload() }));
    } catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : "No se pudo validar la plantilla."); }
    finally { setBusy(null); }
  };
  const commit = async () => {
    if (!preview?.can_commit) return;
    try {
      setBusy("commit"); setError(null);
      const result = await postIdempotent<{ imported: number }>(`/imports/${module}/commit`, { ...options, body: payload() });
      reset(); setOpen(false); await onImported();
      window.alert(`${result.imported} registro(s) se migraron correctamente.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la migración. No se guardaron cambios."); }
    finally { setBusy(null); }
  };

  return <section className="data-migration">
    <button className="secondary-button" onClick={() => { setOpen((value) => !value); if (open) reset(); }}><FileUp size={16} /> Migrar {template.label.toLowerCase()}</button>
    {open && <article className="panel migration-panel">
      <div className="migration-header"><div><p className="card-label">CARGA CONTROLADA</p><h2>Migrar {template.label}</h2><p>Solo administradores y propietarios. Primero se valida la plantilla y después confirmas la migración.</p></div><FileSpreadsheet size={24} /></div>
      <div className="migration-actions"><button type="button" className="secondary-button" onClick={downloadTemplate}><Download size={15} /> Descargar CSV</button><button type="button" className="secondary-button" onClick={downloadXlsxTemplate}><FileSpreadsheet size={15} /> Descargar XLSX</button><label className="file-picker"><UploadCloud size={16} /><span>{file?.name ?? "Seleccionar CSV o XLSX"}</span><input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} /></label><button type="button" className="primary-button" disabled={!file || busy !== null} onClick={() => void previewFile()}>{busy === "preview" ? <><LoaderCircle className="spin" size={16} /> Validando…</> : "Validar plantilla"}</button></div>
      <small className="migration-help">No se reemplazan datos existentes. Las ventas y compras validan productos y almacenes antes de afectar stock, cuentas y contabilidad.</small>
      {error && <p className="login-error">{error}</p>}
      {preview && <div className={`migration-preview ${preview.can_commit ? "valid" : "invalid"}`}><div><strong>{preview.can_commit ? <><CheckCircle2 size={17} /> Plantilla lista para migrar</> : <><AlertTriangle size={17} /> Corrige la plantilla antes de migrar</>}</strong><span>{preview.valid_rows} filas válidas</span></div>{preview.errors.length > 0 && <ul>{preview.errors.slice(0, 5).map((item) => <li key={`${item.row}-${item.message}`}>Fila {item.row}: {item.message}</li>)}</ul>}{preview.conflicts.length > 0 && <ul>{preview.conflicts.slice(0, 5).map((message) => <li key={message}>{message}</li>)}</ul>}{preview.can_commit && <button type="button" className="primary-button" disabled={busy !== null} onClick={() => void commit()}>{busy === "commit" ? <><LoaderCircle className="spin" size={16} /> Migrando…</> : "Confirmar migración"}</button>}</div>}
    </article>}
  </section>;
}
