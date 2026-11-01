export type ImportModule = "products" | "customers" | "suppliers" | "warehouses" | "inventory" | "sales" | "purchases";
export type ImportTemplate = {
  module: ImportModule;
  label: string;
  columns: string[];
  example: string[];
  version?: string;
  download_url?: string;
  export_url?: string | null;
  fields?: { key: string; group: string; required: boolean; description: string }[];
};
export type ImportPreview = {
  valid_rows: number;
  errors: { row: number; message: string }[];
  conflicts: string[];
  can_commit: boolean;
  sample: Record<string, unknown>[];
  file_sha256?: string;
};

export function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function errorReport(preview: ImportPreview): Blob {
  const rows = [
    ["fila", "tipo", "mensaje"],
    ...preview.errors.map((item) => [String(item.row), "validación", item.message]),
    ...preview.conflicts.map((message) => ["", "conflicto o referencia", message]),
  ];
  return new Blob(["\uFEFF", rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
}

export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
