import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, Database, Files, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiDownload, apiFetch, postIdempotent } from "../lib/api";
import { saveDownload } from "../lib/migration";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";
import { includedObjects, migrationStatus, type MigrationCatalog, type MigrationDefinition, type MigrationProject, type ProjectSummary } from "../lib/migrationProjects";
import { ActionMenu } from "./ActionMenu";

export function DataCenterPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const catalog = useWorkspaceQuery("migration-catalog", (options) => apiFetch<MigrationCatalog>("/migration-projects/catalog", options));
  const listing = useWorkspaceQuery("migration-projects", (options) => apiFetch<{ ready: boolean; projects: ProjectSummary[] }>("/migration-projects", options));
  const [project, setProject] = useState<MigrationProject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [objectDetail, setObjectDetail] = useState<MigrationDefinition | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const target = useRef("");
  const options = { accessToken: session?.access_token, tenantId: tenantId ?? undefined };
  const definitions = catalog.data?.objects ?? [];
  const labelFor = (code: string) => definitions.find((item) => item.code === code)?.label ?? code;
  const task = async (name: string, operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(name); setError(null); setNotice(null);
    try { await operation(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la operación"); }
    finally { setBusy(null); }
  };
  const openProject = (id: string) => void task("Abriendo grupo…", async () => {
    setProject(await apiFetch<MigrationProject>(`/migration-projects/${id}`, options)); setQuery(""); setFilter("");
  });
  const refresh = () => { catalog.refresh(); listing.refresh(); if (project) openProject(project.id); };
  const simulate = () => project && void task("Simulando el grupo…", async () => {
    const result = await postIdempotent<MigrationProject>(`/migration-projects/${project.id}/simulate`, { ...options, body: JSON.stringify({ version: project.version }) });
    setProject(result); listing.refresh(); setNotice(result.simulation.can_commit ? "La simulación terminó correctamente. Revisa el resumen antes de la confirmación final." : "La simulación encontró incidencias. Consulta los mensajes del objeto y sustituye el archivo indicado.");
  });
  const download = (code: string, example = false, format = "xlsx") => void task("Preparando descarga…", async () => {
    saveDownload(await apiDownload(`/migration-projects/objects/${code}/template?example=${example}&format=${format}${project ? `&project_id=${project.id}` : ""}`, options), `${code}.${format}`);
  });
  const chooseFile = (code: string) => {
    target.current = code;
    if (upload.current) { upload.current.accept = code === "pack" ? ".zip" : ".xlsx,.csv"; upload.current.value = ""; upload.current.click(); }
  };
  const uploadFile = (file: File | undefined) => {
    if (!file || !project) return;
    const code = target.current;
    void task("Guardando archivos en el grupo…", async () => {
      if (file.size > (code === "pack" ? 10 : 5) * 1024 * 1024) throw new Error("Límite: 5 MB por plantilla o 10 MB por ZIP.");
      const body = new FormData(); body.append("file", file); body.append("version", String(project.version));
      const result = await apiFetch<MigrationProject>(`/migration-projects/${project.id}/${code === "pack" ? "upload-pack" : `objects/${code}/file`}`, { ...options, method: "POST", body });
      setProject(result); listing.refresh(); setNotice("Archivos preparados. La simulación resolverá las referencias de todo el grupo.");
    });
  };
  const migrate = () => project && void task("Migrando el grupo completo…", async () => {
    const result = await postIdempotent<MigrationProject>(`/migration-projects/${project.id}/commit`, { ...options, body: JSON.stringify({ version: project.version, digest: project.simulation.digest, confirmed: checked }) });
    setProject(result); setConfirmOpen(false); setChecked(false); listing.refresh(); setNotice(`Migración completada: ${result.receipt.total_created} registros creados. El comprobante está disponible.`);
  });
  const normalized = query.trim().toLocaleLowerCase("es-PE");
  const projects = (listing.data?.projects ?? []).filter((item) => (!filter || item.status === filter) && item.name.toLocaleLowerCase("es-PE").includes(normalized));
  const objects = (project?.objects ?? definitions.map((item) => ({ code: item.code, filename: null, rows: 0, status: "empty", file_sha256: null, report: undefined }))).filter((item) => (!filter || item.status === filter) && `${labelFor(item.code)} ${item.code}`.toLocaleLowerCase("es-PE").includes(normalized));
  const frozen = project?.status === "migrated";
  const rows = project?.objects.reduce((sum, item) => sum + item.rows, 0) ?? 0;
  const errors = project?.objects.reduce((sum, item) => sum + (item.report?.errors.length ?? 0), 0) ?? 0;

  return <section className="module-page migration-cockpit">
    <div className="module-heading"><div><button className="back-link" disabled={!!busy} onClick={() => project ? (setProject(null), setQuery(""), setFilter("")) : goBack()}><ChevronLeft size={16} />{project ? "Grupos de migración" : "Aplicaciones"}</button><p className="eyebrow">ADMINISTRACIÓN DE DATOS</p><h1><Database size={24} />{project?.name ?? "Centro de migraciones"}</h1><p className="subtitle">{project ? "Objetos, dependencias y resultados del grupo." : "Grupos de carga según los módulos habilitados para tu empresa y usuario."}</p></div><div className="heading-actions"><button className="secondary-button" disabled={!!busy} onClick={refresh}><RefreshCw size={16} /> Actualizar</button>{!project ? <button className="primary-button" disabled={!catalog.data?.ready || !!busy} onClick={() => setCreateOpen(true)}><Plus size={16} /> Crear grupo</button> : <ActionMenu disabled={!!busy} label="Acciones del grupo" actions={[
      { label: "Descargar Excel de prueba (ZIP)", run: () => void task("Descargando ejemplos…", async () => saveDownload(await apiDownload(`/migration-projects/${project.id}/example-pack`, options), "ejemplos-migracion.zip")) },
      { label: "Cargar paquete ZIP", run: () => chooseFile("pack"), disabled: frozen },
      { label: "Simular grupo", run: simulate, disabled: frozen || !rows },
      { label: "Migrar grupo", run: () => { setChecked(false); setConfirmOpen(true); }, disabled: frozen || !project.simulation.can_commit },
      { label: "Descargar comprobante", run: () => saveDownload(new Blob([JSON.stringify(project.receipt, null, 2)], { type: "application/json" }), `comprobante-${project.id}.json`), disabled: !frozen },
    ]} />}</div></div>
    <input ref={upload} type="file" aria-label="Archivo de migración" className="migration-hidden-input" onChange={(event) => uploadFile(event.target.files?.[0])} />
    {busy && <p className="migration-running" role="status"><LoaderCircle size={17} className="spin" />{busy}</p>}
    {(error || catalog.error || listing.error) && <p className="module-error" role="alert">{error ?? catalog.error ?? listing.error}</p>}
    {notice && <p className="module-notice" role="status">{notice}</p>}
    {catalog.data && !catalog.data.ready && <article className="migration-activation panel"><strong>Activación de grupos pendiente</strong><p>Ejecuta <code>0066_migration_projects.sql</code> del backend en Supabase y pulsa Actualizar. Ya puedes consultar y descargar las plantillas autorizadas.</p></article>}
    {project && <div className="migration-metrics"><span className={`migration-badge ${project.status}`}>{migrationStatus[project.status]}</span><span><strong>{project.objects.length}</strong> objetos asignados</span><span><strong>{rows}</strong> filas cargadas</span><span className={errors ? "migration-error-count" : ""}><strong>{errors}</strong> incidencias</span><span>Versión {project.version}</span></div>}
    <div className="migration-filters"><label>Buscar<div className="migration-search"><Search size={16} /><input aria-label={project ? "Buscar objeto de migración" : "Buscar grupo de migración"} placeholder={project ? "Objeto, módulo o código" : "Nombre del grupo"} value={query} onChange={(event) => setQuery(event.target.value)} /></div></label><label>Estado<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Todos</option>{(project ? ["empty", "uploaded", "ready", "error", "migrated"] : ["draft", "uploaded", "ready", "errors", "migrated"]).map((state) => <option key={state} value={state}>{migrationStatus[state]}</option>)}</select></label></div>
    {!project && catalog.data?.ready && <article className="panel migration-table-panel"><div className="panel-header"><h2>Grupos de migración ({projects.length})</h2><span>Hasta 200 grupos recientes</span></div><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Autor / fecha de creación</th><th>Grupos de módulos</th><th>Objetos</th><th></th></tr></thead><tbody>{projects.map((item) => <tr key={item.id}><td><button className="migration-object-link" disabled={!!busy} onClick={() => openProject(item.id)}>{item.name}</button></td><td><span className={`migration-badge ${item.status}`}>{migrationStatus[item.status]}</span></td><td>{item.created_by === session?.user.id ? "Tú" : `Usuario ${item.created_by.slice(0, 8)}`}<small className="table-secondary">{new Date(item.created_at).toLocaleString("es-PE")}</small></td><td>{item.groups.map((code) => catalog.data?.groups.find((group) => group.code === code)?.label ?? code).join(", ")}</td><td>{item.object_count}</td><td><button className="text-button" disabled={!!busy} onClick={() => openProject(item.id)}>Abrir grupo</button></td></tr>)}{!projects.length && <tr><td colSpan={6}><div className="migration-empty"><Files size={28} /><strong>No hay grupos para este filtro</strong><span>Crea un grupo y selecciona sus módulos. Las plantillas y predecesores se asignan automáticamente.</span></div></td></tr>}</tbody></table></div></article>}
    {(project || !catalog.data?.ready) && <article className="panel migration-table-panel"><div className="panel-header"><div><h2>{project ? "Objetos de migración" : "Plantillas disponibles"} ({objects.length})</h2><span>{project ? "Los objetos sin archivo no se migran. Sus datos pueden existir previamente en la empresa." : "Crea un grupo después de activar sus tablas."}</span></div>{project && !frozen && <button className="primary-button" disabled={!!busy || !rows} onClick={simulate}>Simular grupo</button>}</div><div className="table-wrap"><table><thead><tr><th>Objeto de migración</th><th>Datos</th><th>Simulación</th><th>Migración</th><th>Acción</th></tr></thead><tbody>{objects.map((item) => {
      const definition = definitions.find((entry) => entry.code === item.code);
      if (!definition) return null;
      return <tr key={item.code}><td><button className="migration-object-link" onClick={() => setObjectDetail(definition)}>{definition.label}</button><small className="table-secondary">{definition.columns.length} columnas · {definition.module}</small><button className="migration-dependency-link" onClick={() => setObjectDetail(definition)}>{definition.dependencies.length} objetos predecesores</button>{!definition.schema_ready && <small className="migration-error-count">Requiere activación 0065</small>}{definition.blocked_dependencies.length > 0 && <small className="migration-error-count">Predecesor sin habilitar</small>}</td><td><strong>{item.rows}</strong> filas<small className="table-secondary migration-filename">{item.filename ?? "Sin archivo"}</small></td><td><span className={`migration-badge ${item.status}`}>{migrationStatus[item.status]}</span>{item.report && <small className="table-secondary">{item.report.created} altas · {item.report.reused} referencias existentes · {item.report.errors.length} incidencias</small>}</td><td>{frozen && item.filename ? <span className="migration-success"><CheckCircle2 size={15} /> Completada</span> : "No iniciada"}</td><td><ActionMenu label={`Acciones · ${definition.label}`} disabled={!!busy} actions={[
        { label: "Descargar plantilla Excel", run: () => download(item.code) },
        { label: "Descargar plantilla CSV", run: () => download(item.code, false, "csv") },
        { label: "Descargar ejemplo completo", run: () => download(item.code, true) },
        ...(item.code === "products" ? [{ label: "Exportar materiales actuales", run: () => void task("Exportando materiales…", async () => saveDownload(await apiDownload("/imports/products/export?format=xlsx", options), "materiales.xlsx")) }] : []),
        { label: "Cargar archivo", run: () => chooseFile(item.code), disabled: !project || frozen || !!definition.blocked_dependencies.length },
        { label: "Simular grupo", run: simulate, disabled: !project || frozen || !rows },
        { label: "Mensajes y dependencias", run: () => setObjectDetail(definition) },
        { label: "Migrar grupo", run: () => { setChecked(false); setConfirmOpen(true); }, disabled: !project?.simulation.can_commit || frozen },
        { label: "Retirar archivo", disabled: !project || !item.filename || frozen, run: () => project && void task("Retirando archivo…", async () => setProject(await apiFetch<MigrationProject>(`/migration-projects/${project.id}/objects/${item.code}/remove`, { ...options, method: "POST", body: JSON.stringify({ version: project.version }) }))) },
      ]} /></td></tr>;
    })}</tbody></table></div></article>}
    {project?.simulation.can_commit && !frozen && <div className="migration-final-bar"><div><strong>{project.simulation.total_created} altas previstas</strong><span>La simulación terminó correctamente. Revisa el resumen del conjunto.</span></div><button className="primary-button" disabled={!!busy} onClick={() => { setChecked(false); setConfirmOpen(true); }}>Revisar y confirmar grupo</button></div>}
    {createOpen && catalog.data && <CreateGroup catalog={catalog.data} onClose={() => setCreateOpen(false)} onCreated={(result) => { setProject(result); setCreateOpen(false); setFilter(""); setQuery(""); listing.refresh(); }} />}
    {objectDetail && <div className="modal-layer"><section className="customer-modal migration-dialog" role="dialog" aria-modal="true" aria-label={`Detalle · ${objectDetail.label}`}><div className="modal-header"><h2>{objectDetail.label}</h2><button type="button" className="icon-button" aria-label="Cerrar detalle" onClick={() => setObjectDetail(null)}><X /></button></div><div className="customer-form"><p>{objectDetail.effect}</p><h3>Predecesores</h3>{objectDetail.dependencies.length ? <ul>{objectDetail.dependencies.map((code) => <li key={code}>{labelFor(code)} — {project?.objects.find((item) => item.code === code)?.filename ? "archivo cargado en este grupo" : "usar registros existentes o cargar su plantilla"}</li>)}</ul> : <p>Este objeto no requiere otra plantilla.</p>}<h3>Mensajes de simulación</h3>{(project?.simulation.objects?.[objectDetail.code]?.errors ?? []).length ? <ul className="migration-error-count">{project!.simulation.objects![objectDetail.code].errors.map((item, index) => <li key={index}>{item.row ? `Fila ${item.row}: ` : ""}{item.message ?? item.msg}</li>)}</ul> : <p>{project?.simulation.objects?.[objectDetail.code] ? "Sin incidencias en la última simulación." : "Todavía no se ha simulado este objeto."}</p>}<details><summary>Campos de la plantilla</summary><div className="table-wrap"><table><thead><tr><th>Campo</th><th>Regla</th></tr></thead><tbody>{(objectDetail.fields ?? objectDetail.columns.map((key) => ({ key, required: false, description: "Consulta el diccionario de la plantilla." }))).map((field) => <tr key={field.key}><td>{field.key}{field.required ? " *" : ""}</td><td>{field.description}</td></tr>)}</tbody></table></div></details></div></section></div>}
    {confirmOpen && project && <div className="modal-layer"><section className="customer-modal migration-dialog" role="dialog" aria-modal="true" aria-label="Confirmación final de migración"><div className="modal-header"><h2>Confirmar migración del grupo</h2><button className="icon-button" aria-label="Cerrar confirmación" disabled={!!busy} onClick={() => setConfirmOpen(false)}><X /></button></div><div className="customer-form"><p><strong>{project.name}</strong> · {project.simulation.total_rows} filas · {project.simulation.total_created} altas previstas.</p><div className="table-wrap"><table><thead><tr><th>Objeto</th><th>Altas</th><th>Efecto</th></tr></thead><tbody>{project.objects.filter((item) => item.filename).map((item) => <tr key={item.code}><td>{labelFor(item.code)}</td><td>{item.report?.created}</td><td>{definitions.find((entry) => entry.code === item.code)?.effect}</td></tr>)}</tbody></table></div><p>Se comprobarán automáticamente los datos actuales y se guardará todo en una transacción. Esta operación requiere verificación en dos pasos.</p><label className="migration-final-check"><input type="checkbox" checked={checked} disabled={!!busy} onChange={(event) => setChecked(event.target.checked)} /><span>He revisado el grupo y confirmo la carga completa en la empresa seleccionada.</span></label>{error && <p role="alert" className="module-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" disabled={!!busy} onClick={() => setConfirmOpen(false)}>Cancelar</button><button className="primary-button" disabled={!!busy || !checked} onClick={migrate}>{busy ? "Migrando…" : "Confirmar carga completa"}</button></div></div></section></div>}
  </section>;
}

function CreateGroup({ catalog, onClose, onCreated }: { catalog: MigrationCatalog; onClose: () => void; onCreated: (project: MigrationProject) => void }) {
  const { session, tenantId } = useAuth();
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const included = includedObjects(catalog, groups);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null);
    try { onCreated(await postIdempotent<MigrationProject>("/migration-projects", { accessToken: session?.access_token, tenantId: tenantId ?? undefined, body: JSON.stringify({ request_id: requestId, name, groups }) })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el grupo"); }
    finally { setBusy(false); }
  };
  return <div className="modal-layer"><section className="customer-modal migration-dialog" role="dialog" aria-modal="true" aria-label="Crear grupo de migración"><div className="modal-header"><h2>Crear grupo de migración</h2><button className="icon-button" aria-label="Cerrar" disabled={busy} onClick={onClose}><X /></button></div><form className="customer-form" onSubmit={submit}><label>Nombre del grupo<input autoFocus required minLength={3} maxLength={120} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="Carga inicial de materiales y almacenes" /></label><fieldset className="migration-group-options"><legend>Grupos de módulos habilitados</legend>{catalog.groups.map((group) => <label key={group.code}><input type="checkbox" disabled={busy} checked={groups.includes(group.code)} onChange={(event) => setGroups((current) => event.target.checked ? [...current, group.code] : current.filter((code) => code !== group.code))} /><span><strong>{group.label}</strong><small>{group.objects.length} objetos propios</small></span></label>)}</fieldset><p>{included.size} plantillas asignadas, incluidos los predecesores habilitados. Los maestros compartidos se cargan una sola vez.</p>{error && <p className="module-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy || !groups.length}>{busy ? "Creando…" : "Crear grupo"}</button></div></form></section></div>;
}
