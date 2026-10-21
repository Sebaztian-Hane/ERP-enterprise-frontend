import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiOptions } from "./api";
import { apiFetch } from "./api";

export type PageMeta = { page: number; page_size: number; total: number; total_pages: number; has_previous: boolean; has_next: boolean };
export type Paginated<T, Key extends string> = { meta: PageMeta } & Record<Key, T[]>;

export function paginatedUrl(path: string, page: number, pageSize = 25) {
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=${pageSize}`;
}

export function fetchPage<T, Key extends string>(path: string, key: Key, page: number, options: ApiOptions, pageSize = 25) {
  return apiFetch<Paginated<T, Key>>(paginatedUrl(path, page, pageSize), options);
}

export function TablePagination({ meta, onPageChange, label = "registros" }: { meta: PageMeta; onPageChange: (page: number) => void; label?: string }) {
  if (meta.total <= meta.page_size) return null;
  const first = (meta.page - 1) * meta.page_size + 1;
  const last = Math.min(meta.page * meta.page_size, meta.total);
  return <nav className="table-pagination" aria-label={`Paginación de ${label}`}>
    <span>Mostrando {first}–{last} de {meta.total} {label}</span>
    <div>
      <button className="icon-button muted" onClick={() => onPageChange(meta.page - 1)} disabled={!meta.has_previous} aria-label="Página anterior"><ChevronLeft size={16} /></button>
      <strong>Página {meta.page} de {meta.total_pages}</strong>
      <button className="icon-button muted" onClick={() => onPageChange(meta.page + 1)} disabled={!meta.has_next} aria-label="Página siguiente"><ChevronRight size={16} /></button>
    </div>
  </nav>;
}
