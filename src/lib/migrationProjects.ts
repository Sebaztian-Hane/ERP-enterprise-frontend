export type MigrationDefinition = { code: string; module: string; label: string; sheet_name?: string; columns: string[]; dependencies: string[]; effect: string; schema_ready: boolean; blocked_dependencies: string[]; fields?: { key: string; required: boolean; description: string }[] };
export type MigrationCatalog = { ready: boolean; migration: string; limits?: { file_bytes: number; batch_bytes: number; project_rows: number; object_rows: number }; groups: { code: string; label: string; objects: string[] }[]; objects: MigrationDefinition[] };
export type MigrationLog = { phase?: string; severity?: "error" | "warning" | "info" | "success"; file?: string; sheet?: string; object?: string; row?: number | null; field?: string | null; value?: string | null; message?: string; msg?: string };
export type ObjectReport = { rows: number; created: number; reused: number; status: string; errors: MigrationLog[]; error_count?: number; logs?: MigrationLog[] };
export type MigrationObjectProgress = { total_rows: number; validated_rows: number; prepared_rows: number; percent: number; state: "pending" | "running" | "processed" | "error" | "rolled_back"; phase: "waiting" | "validating" | "checking" | "preparing" | "done" };
export type MigrationProgress = { attempt_id: string; phase: "running" | "finalizing" | "completed" | "failed"; current_object: string | null; started_at: string; updated_at: string; live: boolean; total_rows: number; percent: number; objects: Record<string, MigrationObjectProgress> };
export type MigrationJob = { id: string; kind: "simulate" | "commit"; state: "queued" | "completed" | "failed"; requested_at: string; finished_at?: string; seconds?: number; message?: string; progress?: MigrationProgress | null };
export type MigrationProject = {
  id: string; name: string; groups: string[]; status: string; version: number; created_by: string; created_at: string;
  objects: { code: string; filename: string | null; rows: number; file_sha256: string | null; status: string; report?: ObjectReport }[];
  simulation: { can_commit?: boolean; digest?: string; total_created?: number; total_rows?: number; objects?: Record<string, ObjectReport>; upload_logs?: MigrationLog[]; simulated_at?: string; job?: MigrationJob };
  receipt: { committed_at?: string; digest?: string; total_created?: number; objects?: Record<string, ObjectReport> };
};
export type ProjectSummary = Pick<MigrationProject, "id" | "name" | "groups" | "status" | "created_by" | "created_at"> & { object_count: number; job?: MigrationJob };
export const migrationStatus: Record<string, string> = { draft: "No iniciado", uploaded: "Archivo preparado", ready: "Listo para cargar", errors: "Con errores", error: "Con errores", migrated: "Cargado en el ERP", empty: "Sin archivo" };
export function includedObjects(catalog: MigrationCatalog, groups: string[]) {
  const codes = new Set(catalog.groups.filter((group) => groups.includes(group.code)).flatMap((group) => group.objects));
  for (const code of codes) for (const dependency of catalog.objects.find((item) => item.code === code)?.dependencies ?? []) if (catalog.objects.some((item) => item.code === dependency)) codes.add(dependency);
  return codes;
}
