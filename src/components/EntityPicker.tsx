import { useState } from "react";
import { Search } from "lucide-react";

export type EntityPickerOption = { id: string; primary: string; secondary?: string };

/** A search-first master-data selector which stays usable as tenant data grows. */
export function EntityPicker({
  label, placeholder, value, options, onChange, required = false,
}: {
  label: string; placeholder: string; value: string; options: EntityPickerOption[];
  onChange: (id: string) => void; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const matches = options.filter((option) => (option.primary + " " + (option.secondary ?? "")).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 8);
  const choose = (id: string) => { onChange(id); setQuery(""); setOpen(false); };
  return <label className="entity-picker"><span>{label}</span><div className="entity-picker-control"><Search size={16} /><input required={required} value={open ? query : (selected?.primary ?? "")} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder={placeholder} aria-autocomplete="list" aria-expanded={open} role="combobox" /><button type="button" className="entity-picker-clear" onClick={() => { onChange(""); setQuery(""); setOpen(true); }} aria-label={"Limpiar " + label}>×</button></div>{open && <div className="entity-picker-menu" role="listbox">{matches.length ? matches.map((option) => <button type="button" role="option" aria-selected={value === option.id} key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.id)}><strong>{option.primary}</strong>{option.secondary && <small>{option.secondary}</small>}</button>) : <p>Sin coincidencias. Ajusta la búsqueda.</p>}</div>}</label>;
}
