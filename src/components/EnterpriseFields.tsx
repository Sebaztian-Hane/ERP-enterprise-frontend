import { useEffect, useState } from "react";
import { Copy, Plus, Search, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { BusinessField } from "../lib/enterprise";
import { optionLabels } from "../lib/enterprise";
import { useWorkspaceQuery } from "../lib/useWorkspaceQuery";
import { ValueHelpDialog } from "./ValueHelpDialog";
import { stateLabels } from "../lib/enterprise";

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
  return <><label className="enterprise-reference"><span>{label}{required ? " *" : ""}</span><div className="enterprise-reference-control"><Search size={16} /><input aria-label={label} required={required} readOnly disabled={disabled} value={selected ? `${selected.code} · ${selected.label}` : ""} placeholder={disabled ? "Consultando referencia..." : "Seleccionar valor (F4)"} onClick={() => !disabled && setOpen(true)} onKeyDown={(event) => { if (event.key === "F4" || event.key === "Enter") { event.preventDefault(); setOpen(true); } }} />{!disabled && <button type="button" className="value-help-trigger" aria-label={`Entradas posibles: ${label}`} onClick={() => setOpen(true)}><Copy size={16} /></button>}{!disabled && value && <button type="button" className="icon-button" aria-label={`Limpiar ${label}`} onClick={() => { onChange(""); setQuery(""); setPicked(null); }}><X size={14} /></button>}</div>{error && <small role="alert">{error}</small>}</label>{open && !disabled && <ValueHelpDialog title={label} value={value} query={query} onQuery={setQuery} loading={loading} error={error} options={(data ?? []).map((item) => ({ id: item.id, primary: item.code, secondary: item.label, status: stateLabels[item.status ?? ""] }))} onClose={() => { setOpen(false); setQuery(""); }} onSelect={(id) => { setPicked(data?.find((item) => item.id === id) ?? null); onChange(id); setOpen(false); setQuery(""); }} />}</>;
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
