import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiDownload, apiFetch, postIdempotent } from "../lib/api";
import { buildImportTemplateWorkbook } from "../lib/importTemplateWorkbook";
import { csvCell, errorReport, saveDownload, type ImportModule, type ImportPreview, type ImportTemplate } from "../lib/migration";

export type { ImportModule } from "../lib/migration";
type Props = { module: ImportModule; onImported: () => Promise<void> | void; expanded?: boolean };
const labels: Record<ImportModule, string> = { products: "materiales", customers: "clientes", suppliers: "proveedores", warehouses: "almacenes", inventory: "inventario", sales: "ventas", purchases: "compras" };

export function DataMigrationPanel(props: Props) {
  const { tenantId, roleCode } = useAuth();
  if (roleCode !== "owner" && roleCode !== "admin") return null;
  return <MigrationWorkspace key={`${tenantId}:${props.module}`} {...props} />;
}

function MigrationWorkspace({ module, onImported, expanded = false }: Props) {
  const { session, tenantId } = useAuth();
  const [open, setOpen] = useState(expanded);
  const [template, setTemplate] = useState<ImportTemplate | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ imported: number; file_sha256?: string } | null>(null);
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!open || !tenantId || !session?.access_token) return;
    const controller = new AbortController();
    setError(null);
    apiFetch<ImportTemplate[]>("/imports/templates", { accessToken: session.access_token, tenantId, signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        const selected = items.find((item) => item.module === module);
        if (!selected) throw new Error("No hay plantilla disponible para este módulo.");
        setTemplate(selected);
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la plantilla."); });
    return () => controller.abort();
  }, [open, module, tenantId, session?.access_token, reload]);

  const reset = () => { setFile(null); setPreview(null); setError(null); if (input.current) input.current.value = ""; };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    reset(); setReceipt(null);
    if (selected && (selected.size > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(selected.name))) {
      setError("Selecciona un archivo CSV o XLSX de hasta 5 MB.");
      return;
    }
    setFile(selected);
  };
  const payload = (withDigest = false) => {
    if (!file) throw new Error("Selecciona una plantilla CSV o XLSX.");
    const body = new FormData();
    body.append("file", file);
    if (withDigest && preview?.file_sha256) body.append("preview_digest", preview.file_sha256);
    return body;
  };
  const download = async (format: "csv" | "xlsx", exporting = false) => {
    if (!template) return;
    setBusy("download"); setError(null);
    try {
      let blob: Blob;
      const endpoint = exporting ? template.export_url : template.download_url;
      if (endpoint) blob = await apiDownload(`${endpoint}?format=${format}`, options);
      else if (format === "xlsx") blob = buildImportTemplateWorkbook(template.columns, template.example);
      else blob = new Blob(["\uFEFF", template.columns.join(","), "\r\n", template.example.map(csvCell).join(","), "\r\n"], { type: "text/csv;charset=utf-8" });
      if (alive.current) saveDownload(blob, `${exporting ? "exportacion" : "plantilla"}-${module}.${format}`);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "No se pudo descargar el archivo."); }
    finally { if (alive.current) setBusy(null); }
  };
  const previewFile = async () => {
    setBusy("preview"); setError(null); setReceipt(null); setPreview(null);
    try {
      const result = await apiFetch<ImportPreview>(`/imports/${module}/preview`, { ...options, method: "POST", body: payload() });
      if (alive.current) setPreview(result);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "No se pudo validar la plantilla."); }
    finally { if (alive.current) setBusy(null); }
  };
  const commit = async () => {
    if (!preview?.can_commit || busy) return;
    setBusy("commit"); setError(null);
    try {
      const result = await postIdempotent<{ imported: number; file_sha256?: string }>(`/imports/${module}/commit`, { ...options, body: payload(true) });
      if (!alive.current) return;
      reset(); setReceipt(result);
      try { await onImported(); }
      catch { if (alive.current) setError("La carga se completó. Actualiza el catálogo para ver los registros nuevos."); }
    } catch (cause) {
      if (alive.current) { setPreview(null); setError(cause instanceof Error ? cause.message : "No se pudo confirmar la carga. Revisa el catálogo antes de reintentar."); }
    } finally { if (alive.current) setBusy(null); }
  };
  const step = receipt ? 4 : preview?.can_commit ? 3 : file ? 2 : 1;
  const sample = (preview?.sample ?? []).map(({ material_profile, ...row }) => ({ ...row, ...(material_profile && typeof material_profile === "object" ? material_profile : {}) }));
  const sampleColumns = [...new Set(sample.flatMap((row) => Object.keys(row)))];

  return <section className="data-migration" aria-label="Carga y exportación de datos">
    {!expanded && <button className="secondary-button" disabled={busy !== null} onClick={() => { setOpen((value) => !value); if (open) reset(); }}><FileUp size={16} /> Migrar {labels[module]}</button>}
    {open && <article className="panel migration-panel" aria-busy={busy !== null}>
      <div className="migration-header"><div><p className="card-label">CARGA Y EXPORTACIÓN CONTROLADA</p><h2>{template?.label ?? "Preparar carga de datos"}</h2><p>Plantilla → validación → confirmación → verificación. Cada carga crea registros nuevos.</p></div><FileSpreadsheet size={24} /></div>
      <ol className="migration-steps" aria-label="Etapas de la carga">{["Preparar plantilla", "Validar archivo", "Confirmar carga", "Verificar resultado"].map((label, index) => <li key={label} className={step >= index + 1 ? "current" : ""} aria-current={step === index + 1 ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      {!template && !error && <p className="migration-help"><LoaderCircle className="spin" size={16} /> Consultando plantilla…</p>}
      {template && <>
        <div className="migration-actions">
          <button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void download("xlsx")}><Download size={15} /> Plantilla Excel</button>
          <button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void download("csv")}><Download size={15} /> Plantilla CSV</button>
          {template.export_url && <><button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void download("xlsx", true)}><FileSpreadsheet size={15} /> Exportar Excel</button><button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void download("csv", true)}><Download size={15} /> Exportar CSV</button></>}
        </div>
        <p className="migration-help">{template.columns.length} columnas · versión {template.version ?? "1.0"} · hasta 2000 filas / 5 MB · acceso de propietario o administrador.</p>
        {template.fields && <details className="migration-dictionary"><summary>Ver campos y reglas de la plantilla</summary><div className="table-wrap"><table><thead><tr><th>Campo</th><th>Grupo</th><th>Regla</th></tr></thead><tbody>{template.fields.map((field) => <tr key={field.key}><td><code>{field.key}</code>{field.required && " *"}</td><td>{field.group}</td><td>{field.description}</td></tr>)}</tbody></table></div></details>}
        <div className="migration-actions"><label className="migration-file-picker"><UploadCloud size={16} /><span>{file?.name ?? "Seleccionar CSV o XLSX"}</span><input aria-label="Archivo para importar" ref={input} disabled={busy !== null} type="file" accept=".csv,.xlsx" onChange={chooseFile} /></label><button type="button" className="primary-button" disabled={!file || busy !== null} onClick={() => void previewFile()}>{busy === "preview" ? <><LoaderCircle className="spin" size={16} /> Validando…</> : "Validar sin guardar"}</button></div>
        <p className="migration-help">La validación revisa formato, duplicados y referencias disponibles. La confirmación vuelve a validar y guarda la carga en una transacción. {module === "products" ? "Las existencias se cargan después desde Inventario; los campos de planificación son informativos." : "Las operaciones pueden afectar stock, cuentas y contabilidad; revisa su origen antes de confirmar."}</p>
      </>}
      {error && <div className="login-error" role="alert">{error}{!template && <button type="button" className="text-button" onClick={() => setReload((value) => value + 1)}>Reintentar</button>}</div>}
      {receipt && <div className="migration-preview valid" role="status"><strong><CheckCircle2 size={17} /> {receipt.imported} registro(s) cargados correctamente</strong>{receipt.file_sha256 && <small className="migration-digest">SHA-256: {receipt.file_sha256}</small>}<button type="button" className="secondary-button" onClick={() => saveDownload(new Blob([JSON.stringify({ module, tenant_id: tenantId, ...receipt }, null, 2)], { type: "application/json" }), `comprobante-carga-${module}.json`)}><Download size={15} /> Guardar comprobante</button></div>}
      {preview && <div className={`migration-preview ${preview.can_commit ? "valid" : "invalid"}`}>
        <div><strong>{preview.can_commit ? <><CheckCircle2 size={17} /> Archivo listo para confirmar</> : <><AlertTriangle size={17} /> Corrige el archivo y vuelve a validarlo</>}</strong><span>{preview.valid_rows} filas válidas · {preview.errors.length + preview.conflicts.length} incidencias</span></div>
        {preview.errors.length > 0 && <ul>{preview.errors.slice(0, 10).map((item, index) => <li key={index}>Fila {item.row}: {item.message}</li>)}</ul>}
        {preview.conflicts.length > 0 && <ul>{preview.conflicts.slice(0, 10).map((message, index) => <li key={index}>{message}</li>)}</ul>}
        {(preview.errors.length > 0 || preview.conflicts.length > 0) && <button type="button" className="secondary-button" onClick={() => saveDownload(errorReport(preview), `errores-${module}.csv`)}><Download size={15} /> Descargar todas las incidencias</button>}
        {sample.length > 0 && <details className="migration-sample" open><summary>Muestra de hasta 5 filas normalizadas</summary><div className="table-wrap"><table><thead><tr>{sampleColumns.map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{sample.map((row, index) => <tr key={index}>{sampleColumns.map((key) => <td key={key}>{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div></details>}
        {preview.can_commit && <button type="button" className="primary-button" disabled={busy !== null} onClick={() => void commit()}>{busy === "commit" ? <><LoaderCircle className="spin" size={16} /> Guardando…</> : `Confirmar carga de ${preview.valid_rows} filas`}</button>}
      </div>}
    </article>}
  </section>;
}
