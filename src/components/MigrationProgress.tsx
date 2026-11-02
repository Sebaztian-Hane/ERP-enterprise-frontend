import type { MigrationJob, ObjectReport } from "../lib/migrationProjects";

function ProgressBar({ label, percent, state, detail }: { label: string; percent: number | null; state: string; detail: string }) {
  const value = percent === null ? null : Math.max(0, Math.min(100, Math.floor(percent)));
  return <div className={`migration-progress-track ${state} ${value === null ? "indeterminate" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-valuetext={value === null ? detail : `${value}% · ${detail}`}><span style={value === null ? undefined : { width: `${value}%` }} /></div>;
}

export function MigrationObjectProgress({ code, label, rows, hasFile, kind, job, report, migrated }: { code: string; label: string; rows: number; hasFile: boolean; kind: "simulate" | "commit"; job?: MigrationJob; report?: ObjectReport; migrated: boolean }) {
  const currentJob = job?.kind === kind ? job : undefined;
  const item = currentJob?.progress?.objects[code];
  let percent: number | null = 0;
  let state = "pending";
  let title = hasFile ? kind === "simulate" ? "Sin simular" : "No iniciada" : "Sin archivo";
  let detail = hasFile ? `${rows} filas por procesar` : "Sin datos para esta plantilla";
  if (hasFile && migrated && kind === "commit") {
    percent = 100; state = "complete"; title = "Cargada en el ERP"; detail = `${rows} filas guardadas`;
  } else if (hasFile && currentJob?.state === "queued") {
    if (!item) {
      percent = null; state = "running"; title = "Esperando avance"; detail = "Consultando el proceso en el servidor";
    } else {
      percent = item.percent; state = item.state === "error" ? "error" : item.state === "pending" ? "pending" : "running";
      title = item.state === "pending" ? "Pendiente" : item.state === "error" ? "Con errores" : item.state === "processed" ? kind === "commit" ? "Pendiente de cierre" : "Revisada" : item.phase === "preparing" ? "Preparando datos" : item.phase === "checking" ? "Verificando plantilla" : "Revisando filas";
      detail = item.phase === "preparing" || item.state === "processed" ? `${item.prepared_rows} / ${item.total_rows} filas preparadas` : `${item.validated_rows} / ${item.total_rows} filas revisadas`;
    }
  } else if (hasFile && currentJob?.state === "failed") {
    state = "error";
    title = kind === "commit" ? item?.state === "pending" ? "Cancelada" : "Carga revertida" : "Simulación interrumpida";
    detail = kind === "commit" ? "0 filas guardadas en esta carga" : "Revisa el registro y vuelve a simular";
  } else if (hasFile && kind === "simulate" && report) {
    state = report.status === "ready" ? "complete" : "error";
    percent = report.status === "ready" ? 100 : (item?.percent ?? 0);
    title = report.status === "ready" ? "Simulación correcta" : "Con errores";
    detail = `${report.created} altas · ${report.reused} referencias · ${report.error_count ?? report.errors.length} errores`;
  }
  return <div className={`migration-object-progress ${state}`}>
    <div className="migration-progress-caption"><span>{title}</span><strong>{percent === null ? "—" : `${percent}%`}</strong></div>
    <ProgressBar label={`${kind === "simulate" ? "Simulación" : "Carga"} · ${label}`} percent={percent} state={state} detail={title} />
    <small>{detail}</small>
  </div>;
}

export function MigrationGroupProgress({ job, labelFor }: { job: MigrationJob; labelFor: (code: string) => string }) {
  const progress = job.progress;
  const percent = progress?.percent ?? null;
  const current = progress?.current_object;
  const title = job.kind === "simulate" ? "Simulación del grupo" : "Carga definitiva del grupo";
  const detail = progress?.phase === "finalizing" ? "Cerrando la operación del grupo…" : current ? labelFor(current) : progress ? "Preparando la siguiente plantilla…" : "Esperando información de avance del servidor…";
  return <div className="migration-group-progress">
    <div className="migration-progress-caption"><strong>{title}</strong><strong>{percent === null ? "—" : `${percent}%`}</strong></div>
    <ProgressBar label={title} percent={percent} state="running" detail={detail} />
    <small className="migration-progress-explanation">Avance por filas revisadas y preparadas; no representa tiempo restante.</small>
    <div className="migration-progress-foot"><span>{detail}</span><small>{job.kind === "commit" ? "Las filas preparadas se guardan cuando finaliza todo el grupo." : "Se revisan datos y relaciones sin guardar operaciones definitivas."}</small></div>
  </div>;
}
