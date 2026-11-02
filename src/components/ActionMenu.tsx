import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type MenuAction = { label: string; run: () => void; disabled?: boolean };
export function ActionMenu({ label = "Acciones", actions, disabled = false }: { label?: string; actions: MenuAction[]; disabled?: boolean }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const opened = position !== null;
  useEffect(() => {
    if (!opened) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    const close = (event: Event) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null); };
    const reposition = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) { setPosition(null); return; }
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - Math.min(420, actions.length * 39 + 16) - 8)), left: Math.max(8, Math.min(rect.left, window.innerWidth - 264)) });
    };
    document.addEventListener("pointerdown", close); window.addEventListener("scroll", reposition, true); window.addEventListener("resize", reposition);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [opened, actions.length]);
  return <><button ref={trigger} className="migration-action-trigger" type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={() => {
    if (position) { setPosition(null); return; }
    const rect = trigger.current!.getBoundingClientRect();
    setPosition({ top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - Math.min(420, actions.length * 39 + 16) - 8)), left: Math.max(8, Math.min(rect.left, window.innerWidth - 264)) });
  }}>{label}<ChevronDown size={15} /></button>{position && createPortal(<div ref={menu} role="menu" aria-label={label} className="migration-action-menu" style={position} onKeyDown={(event) => {
    const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") { setPosition(null); if (event.key === "Escape") trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
  }}>{actions.map((action) => <button type="button" role="menuitem" key={action.label} disabled={action.disabled} onClick={() => { setPosition(null); trigger.current?.focus(); action.run(); }}>{action.label}</button>)}</div>, document.body)}</>;
}
