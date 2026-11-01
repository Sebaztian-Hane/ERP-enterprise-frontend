export type MigrationDefinition = { code: string; module: string; label: string; columns: string[]; dependencies: string[]; effect: string; schema_ready: boolean; blocked_dependencies: string[]; fields?: { key: string; required: boolean; description: string }[] };
export type MigrationCatalog = { ready: boolean; migration: string; groups: { code: string; label: string; objects: string[] }[]; objects: MigrationDefinition[] };
export type ObjectReport = { rows: number; created: number; reused: number; status: string; errors: { row?: number; message?: string; msg?: string }[] };
export type MigrationProject = {
  id: string; name: string; groups: string[]; status: string; version: number; created_by: string; created_at: string;
  objects: { code: string; filename: string | null; rows: number; file_sha256: string | null; status: string; report?: ObjectReport }[];
  simulation: { can_commit?: boolean; digest?: string; total_created?: number; total_rows?: number; objects?: Record<string, ObjectReport> };
  receipt: { committed_at?: string; digest?: string; total_created?: number; objects?: Record<string, ObjectReport> };
};
export type ProjectSummary = Pick<MigrationProject, "id" | "name" | "groups" | "status" | "created_by" | "created_at"> & { object_count: number };
export const migrationStatus: Record<string, string> = { draft: "No iniciado", uploaded: "Datos cargados", ready: "Simulación correcta", errors: "Con incidencias", error: "Con incidencias", migrated: "Migrado", empty: "Sin archivo" };
export function includedObjects(catalog: MigrationCatalog, groups: string[]) {
  const codes = new Set(catalog.groups.filter((group) => groups.includes(group.code)).flatMap((group) => group.objects));
  for (const code of codes) for (const dependency of catalog.objects.find((item) => item.code === code)?.dependencies ?? []) if (catalog.objects.some((item) => item.code === dependency)) codes.add(dependency);
  return codes;
}
