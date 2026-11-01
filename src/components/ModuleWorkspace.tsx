import { ChevronLeft, ChevronRight, FileText, LayoutGrid } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { workspaceTransactions } from "../lib/workspaceNavigation";
import { type WorkspaceModule, type WorkSection } from "../lib/workspaceCatalog";
const sections: WorkSection[] = ["Datos maestros", "Preparación", "Operación", "Seguimiento", "Administración"];

export function ModuleWorkspace({ module, onModules }: { module: WorkspaceModule; onModules: () => void }) {
  const { roleCode, access, tenants, tenantId } = useAuth();
  const transactions = workspaceTransactions(module, roleCode, access, tenants.find(item => item.id === tenantId)?.business_profile);
  return <section className="module-page business-workspace" aria-label={`Módulo ${module.short}`}>
    <div className="module-heading"><div><button className="back-link" onClick={onModules}><ChevronLeft size={16} /> Todos los módulos</button><p className="eyebrow">MÓDULO {module.short}</p><h1>{module.label}</h1><p className="subtitle">{module.description}</p></div><span className="workspace-count"><LayoutGrid size={18} /> {transactions.length} transacciones disponibles</span></div>
    <nav className="workspace-section-index" aria-label="Áreas de trabajo">{sections.filter(section => transactions.some(item => item.section === section)).map(section => <button className="secondary-button" key={section} onClick={() => document.getElementById(`workspace-${module.id}-${sections.indexOf(section)}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{section}</button>)}</nav>
    {sections.map(section => { const items = transactions.filter(item => item.section === section); return items.length ? <section className="workspace-process-section" id={`workspace-${module.id}-${sections.indexOf(section)}`} key={section}><header><h2>{section}</h2><span>{items.length} {items.length === 1 ? "transacción" : "transacciones"}</span></header><div className="workspace-process-grid">{items.map(item => <a className="workspace-process-card" key={item.href} href={item.href}><span className="workspace-process-icon"><FileText size={22} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={18} /></a>)}</div></section> : null; })}
  </section>;
}
