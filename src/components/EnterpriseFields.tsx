import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { BusinessField } from "../lib/enterprise";
import { optionLabels } from "../lib/enterprise";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";

type Option = { id: string; code: string; label: string; status?: string };

export function EnterpriseReference({ resource, fieldKey, label, value, onChange, required = false, disabled = false }: { resource: string; fieldKey: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Option | null>(null);
  const { data, error, loading } = useWorkspaceQuery(`reference:${resource}:${fieldKey}:${query}:${value}`, async (options) => {
    const path = `/enterprise/${resource}/options/${fieldKey}`;
    const results = await apiFetch<Option[]>(`${path}?q=${encodeURIComponent(query)}`, options);
    if (value && !results.some((item) => item.id === value)) {
      const selected = await apiFetch<Option[]>(`${path}?selected=${encodeURIComponent(value)}`, options);
      return [...selected, ...results];
    }
    return results;
  });
  useEffect(() => { const choice = data?.find((item) => item.id === value); if (choice) setPicked(choice); }, [data, value]);
  const selected = data?.find((item) => item.id === value) ?? (picked?.id === value ? picked : null);
  return <label className="enterprise-reference"><span>{label}{required ? " *" : ""}</span><div className="enterprise-reference-control"><Search size={16} /><input role="combobox" aria-label={label} aria-expanded={open} required={required} disabled={disabled} value={open ? query : selected ? `${selected.code} · ${selected.label}` : ""} placeholder={disabled ? "Consultando referencia…" : "Buscar por código o nombre"} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (value) onChange(""); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && open) event.preventDefault(); }} />{!disabled && value && <button type="button" className="icon-button" aria-label={`Limpiar ${label}`} onClick={() => { onChange(""); setQuery(""); setPicked(null); }}><X size={14} /></button>}{open && !disabled && <div className="enterprise-reference-menu" role="listbox">{loading && <small><LoaderCircle size={14} className="spin" /> Buscando…</small>}{(data ?? []).map((item) => <button role="option" aria-selected={item.id === value} type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setPicked(item); onChange(item.id); setQuery(""); setOpen(false); }}><strong>{item.code}</strong><span>{item.label}</span></button>)}{!loading && !data?.length && <small>Sin coincidencias. Registra primero el documento de origen.</small>}</div>}</div>{error && <small role="alert">{error}</small>}</label>;
}

export function EnterpriseFields({ resource, fields, values, onChange, disabled = false }: { resource: string; fields: BusinessField[]; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void; disabled?: boolean }) {
  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });
  return <div className="enterprise-fields">{fields.map((field) => {
    const value = String(values[field.key] ?? "");
    if (field.kind === "reference") return <EnterpriseReference key={field.key} resource={resource} fieldKey={field.key} label={field.label} value={value} required={field.required} disabled={disabled} onChange={(next) => set(field.key, next)} />;
    if (field.kind === "lines") {
      const lines = (Array.isArray(values[field.key]) ? values[field.key] : []) as { product_id: string; quantity: string }[];
      return <fieldset className="enterprise-components" key={field.key}><legend>{field.label} *</legend>{lines.map((line, index) => <div className="enterprise-component" key={index}><EnterpriseReference resource={resource} fieldKey="components.product_id" label={`Componente ${index + 1}`} value={line.product_id} required disabled={disabled} onChange={(product_id) => set(field.key, lines.map((item, pos) => pos === index ? { ...item, product_id } : item))} /><label>Cantidad<input type="number" step="0.001" min="0.001" required disabled={disabled} value={line.quantity} onChange={(event) => set(field.key, lines.map((item, pos) => pos === index ? { ...item, quantity: event.target.value } : item))} /></label>{!disabled && <button className="icon-button" type="button" aria-label={`Quitar componente ${index + 1}`} onClick={() => set(field.key, lines.filter((_, pos) => pos !== index))}><X size={16} /></button>}</div>)}{!disabled && <button className="secondary-button" type="button" disabled={lines.length >= 100} onClick={() => set(field.key, [...lines, { product_id: "", quantity: "1" }])}><Plus size={15} /> Añadir componente</button>}</fieldset>;
    }
    return <label key={field.key} className={field.kind === "textarea" ? "enterprise-wide" : ""}>{field.label}{field.required ? " *" : ""}{field.kind === "select" ? <select disabled={disabled} required={field.required} value={value} onChange={(event) => set(field.key, event.target.value)}><option value="">Seleccionar</option>{field.choices.map((choice) => <option key={choice} value={choice}>{optionLabels[choice] ?? choice}</option>)}</select> : field.kind === "textarea" ? <textarea disabled={disabled} maxLength={2000} required={field.required} value={value} onChange={(event) => set(field.key, event.target.value)} /> : <input disabled={disabled} required={field.required} type={field.kind === "date" ? "date" : field.kind === "email" ? "email" : ["number", "integer"].includes(field.kind) ? "number" : "text"} min={field.minimum ?? undefined} max={field.maximum ?? undefined} step={field.kind === "integer" ? "1" : "0.001"} maxLength={160} value={value} onChange={(event) => set(field.key, event.target.value)} />}</label>;
  })}</div>;
}
