import { WORKSPACE_MODULES } from "../lib/workspaceCatalog";
export type ModuleEntitlement = { code: string; label: string; is_available: boolean; is_enabled: boolean };
export type AssignmentGroup = { code: string; label: string; modules: string[] };
export type AssignmentAccess = { groups: AssignmentGroup[]; modules: ModuleEntitlement[]; members: { id: string; role_code: string; overrides: Record<string, boolean> }[] };

export function ModuleAssignments({ groups, modules, role, overrides, busy, onChange }: { groups: AssignmentGroup[]; modules: ModuleEntitlement[]; role?: string; overrides?: Record<string, boolean>; busy: boolean; onChange: (changes: Record<string, boolean>) => void }) {
  return <div className="assignment-groups">{groups.map(group => {
    const workspace = WORKSPACE_MODULES.find(item => item.short.toLowerCase() === group.code || (group.code === "gobierno" && item.id === "governance"));
    if (role && workspace && (workspace.id === "governance" ? role !== "owner" : !["owner", "admin", ...workspace.roles].includes(role))) return null;
    const items = group.modules.map(code => modules.find(item => item.code === code)).filter((item): item is ModuleEntitlement => Boolean(item));
    const available = items.filter(item => item.is_available && (!overrides || item.is_enabled) && !(role === "owner" && item.code === "administration"));
    const enabled = (code: string) => overrides ? overrides[code] ?? true : modules.find(item => item.code === code)?.is_enabled ?? false;
    return <fieldset key={group.code} className="assignment-group"><legend>{group.label}</legend><label className="assignment-group-toggle"><input type="checkbox" aria-label={`Habilitar ${group.label}`} disabled={busy || !available.length} checked={available.length > 0 && available.every(item => enabled(item.code))} onChange={event => onChange(Object.fromEntries(available.map(item => [item.code, event.target.checked])))} /> Habilitar el módulo completo</label><div>{items.map(item => <label key={item.code}><input type="checkbox" disabled={busy || !available.includes(item)} checked={item.is_enabled && enabled(item.code)} onChange={event => onChange({ [item.code]: event.target.checked })} /> <span>{item.label}{!item.is_enabled && overrides ? <small>No habilitado en la empresa</small> : !item.is_available ? <small>No aplica al perfil del negocio</small> : null}</span></label>)}</div></fieldset>;
  })}</div>;
}
