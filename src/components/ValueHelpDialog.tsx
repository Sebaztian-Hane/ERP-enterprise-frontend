import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Search, X } from "lucide-react";

export type ValueHelpOption = { id: string; primary: string; secondary?: string; status?: string };

/** A nested, keyboard-accessible value-help window for transaction references. */
export function ValueHelpDialog({ title, options, value, query, onQuery, onSelect, onClose, loading = false, error }: {
  title: string; options: ValueHelpOption[]; value: string; query: string; onQuery: (query: string) => void;
  onSelect: (id: string) => void; onClose: () => void; loading?: boolean; error?: string | null;
}) {
  const [chosen, setChosen] = useState(value);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus();
    return () => previous?.focus();
  }, []);
  return createPortal(<div className="value-help-layer" onClick={(event) => event.stopPropagation()}><section ref={dialog} className="value-help-dialog" role="dialog" aria-modal="true" aria-label={`Entradas posibles: ${title}`} onKeyDown={(event) => {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'));
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}><header><div><small>AYUDA DE ENTRADA</small><h2>Entradas posibles: {title}</h2></div><button type="button" className="icon-button" aria-label={`Cerrar búsqueda de ${title}`} onClick={onClose}><X size={19} /></button></header><div className="value-help-search"><Search size={16} /><input type="search" aria-label={`Buscar ${title}`} placeholder="Código o descripción" value={query} onChange={(event) => onQuery(event.target.value)} /><span>{loading ? <LoaderCircle size={16} className="spin" /> : `${options.length} resultados`}</span></div>{error && <p role="alert" className="module-error">{error}</p>}<div className="value-help-table"><table><thead><tr><th>Selección</th><th>Código</th><th>Descripción</th>{options.some((item) => item.status) && <th>Estado</th>}</tr></thead><tbody>{options.map((option) => <tr key={option.id} className={chosen === option.id ? "selected" : ""} onClick={() => setChosen(option.id)} onDoubleClick={() => onSelect(option.id)}><td><input type="radio" name="value-help-choice" aria-label={`Seleccionar ${option.primary}`} checked={chosen === option.id} onChange={() => setChosen(option.id)} /></td><td><strong>{option.primary}</strong></td><td>{option.secondary ?? ""}</td>{options.some((item) => item.status) && <td>{option.status}</td>}</tr>)}{!loading && !options.length && <tr><td colSpan={4}>Sin coincidencias. Registra el documento de origen o cambia la búsqueda.</td></tr>}</tbody></table></div><footer><span>Los valores pertenecen a la empresa seleccionada.</span><button type="button" className="primary-button" disabled={!chosen || !options.some((item) => item.id === chosen)} onClick={() => onSelect(chosen)}>Seleccionar</button><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button></footer></section></div>, document.body);
}
