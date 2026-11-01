import { canAccessModule, isProfileModuleAvailable, type BusinessProfile, type WorkspaceAccess } from "./roleAccess";
import { WORKSPACE_MODULES, transactionFor, workspaceFor, type WorkspaceModule } from "./workspaceCatalog";

export function workspaceTransactions(module: WorkspaceModule, role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  if (module.id === "governance" ? role !== "owner" : !["owner", "admin", ...module.roles].includes(role ?? "")) return [];
  if (access && access.modules[module.id === "governance" ? "administration" : module.id] !== true) return [];
  return module.transactions.filter(item => canAccessModule(role, item.view, access) && isProfileModuleAvailable(profile, item.view));
}
export function visibleWorkspaces(role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  return WORKSPACE_MODULES.filter(module => workspaceTransactions(module, role, access, profile).length > 0);
}
export function routeAllowed(route: string, role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  if (route === "#perfil" || route === "#guia") return Boolean(role);
  const transaction = transactionFor(route);
  if (transaction) return workspaceTransactions(transaction.workspace, role, access, profile).some(item => item.href === route);
  const module = workspaceFor(route);
  if (module) return workspaceTransactions(module, role, access, profile).length > 0;
  return visibleWorkspaces(role, access, profile).some(module => workspaceTransactions(module, role, access, profile).some(item => !item.resource && item.view === route));
}
export function routeWorkspace(route: string, role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  return transactionFor(route)?.workspace ?? workspaceFor(route) ?? visibleWorkspaces(role, access, profile).find(module => workspaceTransactions(module, role, access, profile).some(item => !item.resource && item.view === route));
}
export function defaultWorkspace(role: string | null, access?: WorkspaceAccess | null, profile?: BusinessProfile) {
  return visibleWorkspaces(role, access, profile)[0]?.href ?? "#guia";
}
