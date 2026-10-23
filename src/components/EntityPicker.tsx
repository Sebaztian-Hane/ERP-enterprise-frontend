import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const controlRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.id === value);
  const matches = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase();
    return options
      .filter((option) => `${option.primary} ${option.secondary ?? ""}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [options, query]);
  const choose = (id: string) => { onChange(id); setQuery(""); setOpen(false); setActiveIndex(0); };

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const closeWhenFocusLeaves = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!controlRef.current?.contains(event.relatedTarget)) setOpen(false);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); setQuery(""); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.min(current + 1, Math.max(matches.length - 1, 0))); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); return; }
    if (event.key === "Enter" && open && matches[activeIndex]) { event.preventDefault(); choose(matches[activeIndex].id); }
  };

  return <label className="entity-picker"><span>{label}</span><div className="entity-picker-control" ref={controlRef} onBlur={closeWhenFocusLeaves}><Search size={16} /><input required={required} value={open ? query : (selected?.primary ?? "")} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={onKeyDown} placeholder={placeholder} aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined} role="combobox" /><button type="button" className="entity-picker-clear" onClick={() => { onChange(""); setQuery(""); setOpen(true); }} aria-label={`Limpiar ${label}`}>×</button>{open && <div className="entity-picker-menu" id={listId} role="listbox">{matches.length ? matches.map((option, index) => <button type="button" role="option" id={`${listId}-${option.id}`} aria-selected={value === option.id} key={option.id} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option.id)}><strong>{option.primary}</strong>{option.secondary && <small>{option.secondary}</small>}</button>) : <p>Sin coincidencias. Ajusta la búsqueda.</p>}</div>}</div></label>;
}
