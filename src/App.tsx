import {
  Component,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Box,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  Factory,
  Gauge,
  LayoutGrid,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sun,
  Moon,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { DashboardCanvas } from "./components/DashboardCanvas";
import { AssistantChat } from "./components/AssistantChat";
import { LoginPage } from "./components/LoginPage";
import { NotificationsMenu } from "./components/NotificationsMenu";
import { UserAvatar } from "./components/UserAvatar";
import { ProviderPortal } from "./components/ProviderPortal";
import { DashboardPage } from "./components/DashboardPage";
import { CustomersPage } from "./components/CustomersPage";
import { SuppliersPage } from "./components/SuppliersPage";
import { ProductsPage } from "./components/ProductsPage";
import { SalesPage } from "./components/SalesPage";
import { QuotesPage } from "./components/QuotesPage";
import { SalesOrdersPage } from "./components/SalesOrdersPage";
import { PurchasesPage } from "./components/PurchasesPage";
import { PurchaseOrdersPage } from "./components/PurchaseOrdersPage";
import { InventoryPage } from "./components/InventoryPage";
import { WarehousesPage } from "./components/WarehousesPage";
import { InventoryHistoryPage } from "./components/InventoryHistoryPage";
import { InventoryCountsPage } from "./components/InventoryCountsPage";
import { FinancePage } from "./components/FinancePage";
import { AccountsPage } from "./components/AccountsPage";
import { ReconciliationPage } from "./components/ReconciliationPage";
import { DocumentsPage } from "./components/DocumentsPage";
import { ReportsPage } from "./components/ReportsPage";
import { AdministrationPage } from "./components/AdministrationPage";
import { ProfilePage } from "./components/ProfilePage";
import { OperationsPage } from "./components/OperationsPage";
import { ConfigurationPage } from "./components/ConfigurationPage";
import { DataCenterPage } from "./components/DataCenterPage";
import { CashFlowPage } from "./components/CashFlowPage";
import { InventoryPlanningPage } from "./components/InventoryPlanningPage";
import { HelpPage } from "./components/HelpPage";
import { EnterprisePage } from "./components/EnterprisePage";
import { ModuleWorkspace } from "./components/ModuleWorkspace";
import { WORKSPACE_MODULES, WORKSPACE_TRANSACTIONS, transactionFor, workspaceFor } from "./lib/workspaceCatalog";
import { defaultWorkspace, routeAllowed, routeWorkspace, visibleWorkspaces, workspaceTransactions } from "./lib/workspaceNavigation";
import { ENTERPRISE_AREAS, ENTERPRISE_SUMMARIES } from "./lib/enterprise";
import { useAuth } from "./auth/AuthProvider";
import { canAccessModule, defaultModuleFor, isProfileModuleAvailable } from "./lib/roleAccess";

const CHUNK_RELOAD_PARAM = "ec-reload";

function refreshApplication() {
  const url = new URL(window.location.href);
  url.searchParams.set(CHUNK_RELOAD_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}


type NavItem = {
  label: string;
  icon: typeof Gauge;
  href: string;
  category: ModuleCategory;
  badge?: string;
};
type AppModule = NavItem & { description: string; tone: string };

type ModuleCategory =
  | "comercial"
  | "abastecimiento"
  | "finanzas"
  | "administracion";

const moduleCategories: Array<{
  id: ModuleCategory;
  label: string;
  description: string;
  icon: typeof Gauge;
}> = [
  {
    id: "comercial",
    label: "Comercial",
    description: "Clientes, cotizaciones y ventas",
    icon: ShoppingCart,
  },
  {
    id: "abastecimiento",
    label: "Operaciones y cadena de suministro",
    description: "Compras, inventario, producción, mantenimiento y transporte",
    icon: Box,
  },
  {
    id: "finanzas",
    label: "Finanzas y control",
    description: "Caja, conciliación, análisis y seguimiento",
    icon: WalletCards,
  },
  {
    id: "administracion",
    label: "Personas, proyectos y administración",
    description: "Personas, proyectos, documentos, permisos y configuración",
    icon: SlidersHorizontal,
  },
];

const navigation: NavItem[] = [
  { label: "Inicio", icon: Gauge, href: "#dashboard", category: "administracion" },
  { label: "Ventas", icon: ShoppingCart, href: "#ventas", category: "comercial" },
  { label: "Punto de venta", icon: ShoppingCart, href: "#pos", category: "comercial" },
  { label: "Cotizaciones", icon: FileText, href: "#cotizaciones", category: "comercial" },
  { label: "Pedidos de venta", icon: ClipboardList, href: "#pedidos-de-venta", category: "comercial" },
  { label: "Clientes", icon: UsersRound, href: "#clientes", category: "comercial" },
  { label: "Compras", icon: ClipboardList, href: "#compras", category: "abastecimiento" },
  { label: "Proveedores", icon: Factory, href: "#proveedores", category: "abastecimiento" },
  { label: "Órdenes de compra", icon: FileText, href: "#ordenes-de-compra", category: "abastecimiento" },
  { label: "Inventario", icon: Box, href: "#inventario", category: "abastecimiento" },
  { label: "Almacenes", icon: Factory, href: "#almacenes", category: "abastecimiento" },
  { label: "Kardex", icon: ClipboardList, href: "#kardex", category: "abastecimiento" },
  { label: "Inventario físico", icon: ClipboardList, href: "#inventario-fisico", category: "abastecimiento" },
  { label: "Productos", icon: PackageSearch, href: "#productos", category: "abastecimiento" },
  { label: "Finanzas", icon: WalletCards, href: "#finanzas", category: "finanzas" },
  { label: "Cuentas por cobrar y pagar", icon: BriefcaseBusiness, href: "#cuentas", category: "finanzas" },
  { label: "Conciliación", icon: ArrowLeftRight, href: "#conciliacion", category: "finanzas" },
  { label: "Reportes", icon: BarChart3, href: "#reportes", category: "finanzas" },
  { label: "Configuración", icon: Settings, href: "#configuracion", category: "administracion" },
  { label: "Centro de migraciones", icon: ArrowLeftRight, href: "#centro-de-datos", category: "administracion" },
  { label: "Control operativo", icon: BadgeCheck, href: "#control-operativo", category: "finanzas" },
  { label: "Contabilidad financiera", icon: BriefcaseBusiness, href: "#contabilidad", category: "finanzas" },
  { label: "Aprobaciones", icon: BadgeCheck, href: "#aprobaciones", category: "administracion" },
  { label: "Flujo de caja", icon: WalletCards, href: "#flujo-de-caja", category: "finanzas" },
  { label: "Disponibilidad y reservas", icon: PackageSearch, href: "#disponibilidad", category: "abastecimiento" },
  { label: "Valoración de inventario", icon: BarChart3, href: "#valoracion", category: "abastecimiento" },
  { label: "Guía de uso", icon: CircleHelp, href: "#guia", category: "administracion" },
  ...ENTERPRISE_AREAS.map((area) => ({ label: `${area.short} · ${area.label}`, icon: area.code === "hcm" ? UsersRound : area.category === "finanzas" ? BriefcaseBusiness : area.category === "comercial" ? ShoppingCart : Factory, href: area.href, category: area.category })),
];
const appModules: AppModule[] = [
  { label: "Panel ejecutivo", icon: Gauge, href: "#dashboard", category: "administracion", description: "Indicadores de tu operación", tone: "sky" },
  { label: "Ventas", icon: ShoppingCart, href: "#ventas", category: "comercial", description: "Facturación y registro comercial", tone: "blue" },
  { label: "Punto de venta", icon: ShoppingCart, href: "#pos", category: "comercial", description: "Venta rápida para mostrador", tone: "emerald" },
  { label: "Cotizaciones", icon: FileText, href: "#cotizaciones", category: "comercial", description: "Propuestas para tus clientes", tone: "violet" },
  { label: "Pedidos de venta", icon: ClipboardList, href: "#pedidos-de-venta", category: "comercial", description: "Seguimiento de pedidos", tone: "indigo" },
  { label: "Clientes", icon: UsersRound, href: "#clientes", category: "comercial", description: "Relaciones comerciales", tone: "purple" },
  { label: "Compras", icon: ClipboardList, href: "#compras", category: "abastecimiento", description: "Registro de adquisiciones", tone: "orange" },
  { label: "Proveedores", icon: Factory, href: "#proveedores", category: "abastecimiento", description: "RUC, contactos y abastecimiento", tone: "teal" },
  { label: "Órdenes de compra", icon: FileText, href: "#ordenes-de-compra", category: "abastecimiento", description: "Solicitudes y aprobaciones", tone: "amber" },
  { label: "Inventario", icon: Box, href: "#inventario", category: "abastecimiento", description: "Existencias, trazabilidad y transferencias", tone: "teal" },
  { label: "Almacenes", icon: Factory, href: "#almacenes", category: "abastecimiento", description: "Ubicaciones y capacidad logística", tone: "cyan" },
  { label: "Kardex", icon: ArrowLeftRight, href: "#kardex", category: "abastecimiento", description: "Trazabilidad de movimientos", tone: "cyan" },
  { label: "Inventario físico", icon: ClipboardList, href: "#inventario-fisico", category: "abastecimiento", description: "Conteos y conciliación de stock", tone: "amber" },
  { label: "Productos", icon: PackageSearch, href: "#productos", category: "abastecimiento", description: "Catálogo y precios", tone: "lime" },
  { label: "Finanzas", icon: WalletCards, href: "#finanzas", category: "finanzas", description: "Cobros, pagos y caja", tone: "emerald" },
  { label: "Cuentas por cobrar y pagar", icon: BriefcaseBusiness, href: "#cuentas", category: "finanzas", description: "Cartera, vencimientos y mora", tone: "amber" },
  { label: "Conciliación", icon: ArrowLeftRight, href: "#conciliacion", category: "finanzas", description: "Movimientos bancarios", tone: "rose" },
  { label: "Reportes", icon: BarChart3, href: "#reportes", category: "finanzas", description: "Análisis y exportación", tone: "pink" },
  { label: "Configuración", icon: Settings, href: "#configuracion", category: "administracion", description: "Impuestos, monedas y maestros", tone: "slate" },
  { label: "Centro de migraciones", icon: ArrowLeftRight, href: "#centro-de-datos", category: "administracion", description: "Grupos, plantillas, simulación y carga completa", tone: "teal" },
  { label: "Administración", icon: BriefcaseBusiness, href: "#administracion", category: "administracion", description: "Usuarios y permisos", tone: "navy" },
  { label: "Documentos", icon: FileText, href: "#documentos", category: "administracion", description: "Archivo empresarial", tone: "slate" },
  { label: "Control operativo", icon: BadgeCheck, href: "#control-operativo", category: "finanzas", description: "Aprobaciones y contabilidad", tone: "indigo" },
  { label: "Contabilidad financiera", icon: BriefcaseBusiness, href: "#contabilidad", category: "finanzas", description: "Libro diario y balance de comprobación", tone: "navy" },
  { label: "Aprobaciones", icon: BadgeCheck, href: "#aprobaciones", category: "administracion", description: "Solicitudes, decisiones y evidencia de aprobación", tone: "indigo" },
  { label: "Flujo de caja", icon: WalletCards, href: "#flujo-de-caja", category: "finanzas", description: "Saldos por moneda y antigüedad de cartera", tone: "emerald" },
  { label: "Disponibilidad y reservas", icon: PackageSearch, href: "#disponibilidad", category: "abastecimiento", description: "Existencias, compromisos y reserva manual", tone: "teal" },
  { label: "Valoración de inventario", icon: BarChart3, href: "#valoracion", category: "abastecimiento", description: "Valor de referencia al costo promedio", tone: "amber" },
  { label: "Guía de uso", icon: CircleHelp, href: "#guia", category: "administracion", description: "Recorridos de trabajo y responsabilidades por rol", tone: "sky" },
  ...ENTERPRISE_AREAS.map((area) => ({ label: `${area.short} · ${area.label}`, icon: area.code === "hcm" ? UsersRound : area.category === "finanzas" ? BriefcaseBusiness : area.category === "comercial" ? ShoppingCart : Factory, href: area.href, category: area.category, description: ENTERPRISE_SUMMARIES[area.code], tone: area.category === "finanzas" ? "navy" : area.category === "comercial" ? "blue" : area.code === "hcm" ? "purple" : "teal" })),
];
type BusinessProfile = "retail" | "wholesale" | "hybrid";
const supportedViews = new Set([
  // The launcher is the source of truth. Keeping the recognized hashes in
  // sync with its modules prevents an app from silently falling back to the
  // dashboard when a new card is added (as happened with Documents).
  ...appModules.map((item) => item.href),
  ...WORKSPACE_MODULES.map((item) => item.href),
  ...WORKSPACE_TRANSACTIONS.map((item) => item.href),
  "#perfil",
]);
const readView = () => {
  const requested = window.location.hash || "#dashboard";
  return supportedViews.has(requested) ? requested : "#dashboard";
};

const activity = [
  [
    "SO-1048",
    "Cotización aprobada",
    "Comercial Norte",
    "hace 12 min",
    "success",
  ],
  [
    "PO-0793",
    "Orden de compra pendiente",
    "Papelera del Centro",
    "hace 38 min",
    "warning",
  ],
  ["FAC-2031", "Factura emitida", "Grupo Delta", "hace 1 h", "info"],
  [
    "INV-0408",
    "Ajuste de inventario",
    "Almacén principal",
    "hace 2 h",
    "neutral",
  ],
];

function Sidebar({
  open,
  close,
  tenantId,
  tenantName,
  tenants,
  userName,
  view,
  roleCode,
  onLauncher,
  onTenantChange,
  onLogout,
}: {
  open: boolean;
  close: () => void;
  tenantId: string;
  tenantName: string;
  tenants: { id: string; name: string }[];
  userName: string;
  view: string;
  roleCode: string | null;
  onLauncher: () => void;
  onTenantChange: (id: string) => void;
  onLogout: () => void;
}) {
  const { access } = useAuth();
  return (
    <>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={close}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand">
          <button className="brand-mark app-switcher" onClick={onLauncher} aria-label="Abrir aplicaciones">
            <span />
          </button>
          <span>
            enterprise<span>cloud</span>
          </span>
          <button
            className="close-menu"
            onClick={close}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <label className="workspace-switcher">
          <span className="workspace-icon">GN</span>
          <span>
            <strong>{tenantName}</strong>
            <small>Organización</small>
          </span>
          <select
            aria-label="Empresa activa"
            value={tenantId}
            onChange={(event) => onTenantChange(event.target.value)}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Navegación principal">
          <p className="nav-caption">ESPACIO DE TRABAJO</p>
          {canAccessModule(roleCode, "#dashboard", access) && (
            <a className={`nav-item ${view === "#dashboard" ? "active" : ""}`} href="#dashboard">
              <Gauge size={18} strokeWidth={view === "#dashboard" ? 2.2 : 1.8} />
              <span>Panel ejecutivo</span>
            </a>
          )}
          {moduleCategories
            .filter((category) => navigation.some((item) => item.category === category.id && item.href !== "#dashboard" && canAccessModule(roleCode, item.href, access)))
            .map((category) => (
              <div className="nav-category" key={category.id}>
                <p className="nav-caption nav-category-title">{category.label}</p>
                {navigation
                  .filter((item) => item.category === category.id && item.href !== "#dashboard" && canAccessModule(roleCode, item.href, access))
                  .map(({ label, icon: Icon, href, badge }) => (
                    <a
                      className={`nav-item ${view === href ? "active" : ""}`}
                      key={label}
                      href={href}
                    >
                      <Icon size={18} strokeWidth={view === href ? 2.2 : 1.8} />
                      <span>{label}</span>
                      {badge && <b>{badge}</b>}
                    </a>
                  ))}
              </div>
            ))}
          {canAccessModule(roleCode, "#administracion", access) && <>
            <p className="nav-caption lower">CONFIGURACIÓN</p>
            <a className={`nav-item ${view === "#administracion" ? "active" : ""}`} href="#administracion">
              <Settings size={18} />
              <span>Administración</span>
            </a>
          </>}
        </nav>
        <div className="sidebar-footer">
          <a
            className="nav-item"
            href="#guia"
          >
            <CircleHelp size={18} />
            <span>Centro de ayuda</span>
          </a>
          <div className="profile-mini">
            <span className="avatar">{userName.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{userName}</strong>
              <button onClick={onLogout}>Cerrar sesión</button>
            </span>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
    </>
  );
}

function ModuleLauncher({
  onClose,
  tenantName,
  roleCode,
  businessProfile,
}: {
  onClose: () => void;
  tenantName: string;
  roleCode: string | null;
  businessProfile: BusinessProfile | undefined;
}) {
  const { access } = useAuth();
  const [moduleSearch, setModuleSearch] = useState("");
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const openModule = (href: string) => {
    window.location.hash = href;
    onClose();
  };
  const normalizedSearch = moduleSearch.trim().toLocaleLowerCase("es-MX");
  const visibleModules = visibleWorkspaces(roleCode, access, businessProfile).map(module => ({
    ...module, label: `${module.short} · ${module.label}`, icon: module.id === "hcm" ? UsersRound : module.category === "comercial" ? ShoppingCart : module.category === "finanzas" ? WalletCards : module.id === "governance" ? Settings : Factory,
    tone: module.category === "comercial" ? "blue" : module.category === "finanzas" ? "emerald" : "teal",
    transactions: workspaceTransactions(module, roleCode, access, businessProfile),
  })).filter(module => !normalizedSearch || `${module.label} ${module.description} ${module.transactions.map(item => item.label).join(" ")}`.toLocaleLowerCase("es-MX").includes(normalizedSearch));

  return (
    <div className="app-launcher-layer" role="presentation">
      <button className="app-launcher-backdrop" aria-label="Cerrar aplicaciones" onClick={onClose} />
      <section className="app-launcher" role="dialog" aria-modal="true" aria-label="Aplicaciones de EnterpriseCloud">
        <DashboardCanvas />
        <header className="app-launcher-heading">
          <div>
            <p className="eyebrow">MÓDULOS EMPRESARIALES</p>
            <h1>Tu espacio de trabajo</h1>
            <p>Selecciona un módulo para ver sus áreas de trabajo y transacciones en {tenantName}.</p>
          </div>
          <button className="icon-button launcher-close" onClick={onClose} aria-label="Cerrar aplicaciones">
            <X size={20} />
          </button>
        </header>
        <div className="app-launcher-toolbar">
          <label className="app-launcher-search">
            <Search size={17} />
            <input
              autoFocus
              value={moduleSearch}
              onChange={(event) => setModuleSearch(event.target.value)}
              placeholder="Buscar módulos o transacciones"
              aria-label="Buscar aplicaciones"
            />
            {moduleSearch && (
              <button type="button" onClick={() => setModuleSearch("")} aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </label>
          <span>{visibleModules.length} módulos asignados</span>
        </div>
        <div className="app-module-sections">
          {moduleCategories.map(({ id, label, description, icon: CategoryIcon }) => {
            const modules = visibleModules.filter((module) => module.category === id);
            if (!modules.length) return null;
            return (
              <section className="app-module-section" key={id} aria-labelledby={`module-category-${id}`}>
                <header>
                  <span className="app-category-icon"><CategoryIcon size={18} /></span>
                  <div>
                    <h2 id={`module-category-${id}`}>{label}</h2>
                    <p>{description}</p>
                  </div>
                  <small>{modules.length}</small>
                </header>
                <div className="app-module-grid">
                  {modules.map(({ label: moduleLabel, icon: Icon, href, description: moduleDescription, tone, transactions }) => (
                    <button className="app-module-card" key={href} onClick={() => openModule(href)}>
                      <span className={`app-module-icon ${tone}`}><Icon size={25} /></span>
                      <span><strong>{moduleLabel}</strong><small>{moduleDescription}</small><small className="module-transaction-count">{transactions.length} transacciones</small></span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          {!visibleModules.length && (
            <div className="app-module-empty">
              <Search size={20} />
              <strong>No encontramos una aplicación con ese nombre.</strong>
              <button type="button" onClick={() => setModuleSearch("")}>Restablecer búsqueda</button>
            </div>
          )}
        </div>
        <footer className="workspace-launcher-footer"><button className="secondary-button" onClick={() => openModule("#guia")}><CircleHelp size={17} /> Guía de uso</button><span>Se muestran los módulos permitidos por tu rol y asignación.</span></footer>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "neutral" | "negative";
}) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span className={`trend ${tone}`}>
        {tone === "positive" ? "↑" : tone === "negative" ? "↓" : "•"} {delta}{" "}
        <small>vs. mes anterior</small>
      </span>
    </article>
  );
}

class ModuleErrorBoundary extends Component<
  { children: ReactNode; view: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: { view: string }) {
    if (previousProps.view !== this.props.view && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="module-state dashboard-state">
          <AlertTriangle size={27} />
          <strong>No se pudo abrir este módulo</strong>
          <span>
            Actualiza la aplicación o vuelve al panel e inténtalo de nuevo.
          </span>
          <div className="module-recovery-actions">
            <a className="secondary-button" href="#dashboard">
              Volver al panel
            </a>
            <button
              className="primary-button"
              onClick={refreshApplication}
            >
              Actualizar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const isProviderPortal = window.location.pathname.replace(/\/+$/, "") === "/oreo";
  const {
    session,
    tenants,
    tenantId,
    roleCode,
    access,
    isRoleLoading,
    roleError,
    isLoading,
    error,
    mfaRequired,
    selectTenant,
    signOut,
  } = useAuth();
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const [route, setRoute] = useState(readView);
  const transaction = transactionFor(route);
  const view = transaction?.view ?? route;
  const activeWorkspace = routeWorkspace(route, roleCode, access, activeTenant?.business_profile);
  const workspaceHome = workspaceFor(route);
  const backToWorkspace = () => {
    if (activeWorkspace && activeWorkspace.href !== route) window.location.hash = activeWorkspace.href;
    else setLauncherOpen(true);
  };
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("enterprisecloud.theme") === "dark" ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("enterprisecloud.theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101a22" : "#123047");
  }, [theme]);
  useEffect(() => {
    if (isProviderPortal) return;
    const syncView = () => {
      const nextView = readView();
      if (nextView !== window.location.hash) {
        window.history.replaceState(null, "", nextView);
      }
      setRoute(nextView);
    };
    syncView();
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, [isProviderPortal]);
  useEffect(() => {
    if (isProviderPortal) return;
    const focusGlobalSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusGlobalSearch);
    return () => window.removeEventListener("keydown", focusGlobalSearch);
  }, [isProviderPortal]);
  useEffect(() => {
    if (isProviderPortal) return;
    if (isRoleLoading || !roleCode) return;
    const allowed = routeAllowed(route, roleCode, access, activeTenant?.business_profile);
    if (allowed) return;
    const fallback = defaultWorkspace(roleCode, access, activeTenant?.business_profile);
    if (fallback) window.location.hash = fallback;
  }, [access, activeTenant?.business_profile, isProviderPortal, isRoleLoading, roleCode, route]);
  if (isProviderPortal) return <ProviderPortal />;
  if (isLoading)
    return (
      <main className="session-loading">
        <span className="brand-mark">
          <span />
        </span>
        <p>Preparando EnterpriseCloud…</p>
      </main>
    );
  if (!session || mfaRequired) return <LoginPage />;
  if (!tenantId)
    return (
      <main className="session-loading">
        <div>
          <span className="brand-mark">
            <span />
          </span>
          <h1>Acceso sin empresa asignada</h1>
          <p>
            {error ??
              "Tu usuario no tiene una empresa activa. Solicita acceso a un administrador."}
          </p>
          <button className="primary-button" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  if (isRoleLoading)
    return <main className="session-loading"><p>Configurando tu espacio de trabajo…</p></main>;
  if (!roleCode)
    return <main className="session-loading"><div><h1>No se pudo validar tu acceso</h1><p>{roleError ?? "Tu cuenta no tiene un rol operativo válido."}</p><button className="primary-button" onClick={() => void signOut()}>Cerrar sesión</button></div></main>;
  const profileName = typeof session.user.user_metadata.full_name === "string" ? session.user.user_metadata.full_name.trim() : "";
  const userName = profileName || (session.user.email?.split("@")[0] ?? "Usuario");
  const avatarPath = typeof session.user.user_metadata.avatar_path === "string" ? session.user.user_metadata.avatar_path : null;
  const allowedNavigation = visibleWorkspaces(roleCode, access, activeTenant?.business_profile).flatMap(module => [
    { label: `${module.short} · ${module.label}`, href: module.href, icon: LayoutGrid },
    ...workspaceTransactions(module, roleCode, access, activeTenant?.business_profile).map(item => ({ label: `${module.short} · ${item.label}`, href: item.href, icon: FileText })),
  ]);
  const allQuickLinks = [
    ...allowedNavigation,
    { label: "Guía de uso", icon: CircleHelp, href: "#guia" },
    { label: "Mi perfil", icon: UsersRound, href: "#perfil" },
  ];
  const quickLinks = allQuickLinks.filter((item) =>
    item.label
      .toLocaleLowerCase("es-MX")
      .includes(quickQuery.toLocaleLowerCase("es-MX")),
  );
  const breadcrumbLabel =
    view === "#dashboard"
      ? "Panel general"
      : (transaction?.label ?? allQuickLinks.find((item) => item.href === route)?.label ??
        "Panel general");
  const openQuickLink = (href: string) => {
    window.location.hash = href;
    setQuickQuery("");
  };
  return (
    <div className="app-shell">
      <main className="main-content">
        <header className="topbar workspace-topbar">
          <button className="top-brand" onClick={() => setLauncherOpen(true)} aria-label="Abrir aplicaciones">
            <span className="brand-mark"><span /></span>
            <span>enterprise<span>cloud</span></span>
          </button>
          <label className="top-workspace">
            <span className="workspace-icon">GN</span>
            <select aria-label="Empresa activa" value={tenantId} onChange={(event) => selectTenant(event.target.value)}>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <div className="breadcrumb">
            <button className="breadcrumb-link" onClick={() => setLauncherOpen(true)}>Módulos</button>
            <ChevronRight size={15} />
            {activeWorkspace && !workspaceHome && <><a href={activeWorkspace.href}>{activeWorkspace.short}</a><ChevronRight size={15} /></>}
            <strong>{breadcrumbLabel}</strong>
          </div>
          <button className="app-launcher-button" onClick={() => setLauncherOpen(true)}>
            <LayoutGrid size={18} /> Aplicaciones
          </button>
          <div className="search global-search">
            <Search size={18} />
            <input
              ref={globalSearchRef}
              aria-label="Buscar"
              placeholder="Buscar en EnterpriseCloud"
              value={quickQuery}
              onChange={(event) => setQuickQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && quickLinks[0]) {
                  event.preventDefault();
                  openQuickLink(quickLinks[0].href);
                }
                if (event.key === "Escape") setQuickQuery("");
              }}
              aria-expanded={Boolean(quickQuery)}
              aria-controls="global-search-results"
            />
            <kbd>⌘ K</kbd>
            {quickQuery && (
              <div id="global-search-results" className="global-search-results">
                {quickLinks.length ? (
                  quickLinks.map(({ label, icon: Icon, href }) => (
                    <button
                      key={href}
                      type="button"
                      onClick={() => openQuickLink(href)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))
                ) : (
                  <p>No se encontró un módulo con ese nombre.</p>
                )}
              </div>
            )}
          </div>
          <div className="top-actions">
            <button
              className={`icon-button assistant-trigger ${assistantOpen ? "is-active" : ""}`}
              type="button"
              onClick={() => setAssistantOpen((current) => !current)}
              aria-label="Abrir asistente EnterpriseCloud"
              aria-expanded={assistantOpen}
              aria-controls="erp-assistant"
              title="Asistente EnterpriseCloud"
            >
              <Bot size={20} />
            </button>
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo noche"}
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Modo noche activo" : "Modo claro activo"}
            >
              {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <NotificationsMenu />
            <button className="top-profile-trigger" type="button" onClick={() => { window.location.hash = "#perfil"; }} aria-label="Abrir mi perfil" title="Mi perfil">
              <UserAvatar name={userName} avatarPath={avatarPath} className="top-avatar" />
            </button>
          </div>
        </header>
        <div className="content-wrap">
          <ModuleErrorBoundary view={route}>
            {!routeAllowed(route, roleCode, access, activeTenant?.business_profile) ? (
                <section className="module-state dashboard-state">
                  <AlertTriangle size={27} />
                  <strong>No tienes acceso a este módulo</strong>
                  <span>Te redirigiremos a las herramientas asignadas a tu rol.</span>
                </section>
              ) : workspaceHome ? (
                <ModuleWorkspace module={workspaceHome} onModules={() => setLauncherOpen(true)} />
              ) : view === "#perfil" ? (
                <ProfilePage goBack={backToWorkspace} />
              ) : ENTERPRISE_AREAS.some((area) => area.href === view) ? (
                <EnterprisePage key={`${tenantId}:${route}`} view={view} resourceCode={transaction?.resource} goBack={backToWorkspace} />
              ) : view === "#guia" ? (
                <HelpPage goBack={backToWorkspace} />
              ) : view === "#contabilidad" ? (
                <OperationsPage key="accounting" section="accounting" goBack={backToWorkspace} />
              ) : view === "#aprobaciones" ? (
                <OperationsPage key="approvals" section="approvals" goBack={backToWorkspace} />
              ) : view === "#flujo-de-caja" ? (
                <CashFlowPage goBack={backToWorkspace} />
              ) : view === "#disponibilidad" || view === "#valoracion" ? (
                <InventoryPlanningPage key={view} mode={view === "#valoracion" ? "valuation" : "availability"} goBack={backToWorkspace} />
              ) : view === "#dashboard" ? (
                <DashboardPage
                  userName={userName}
                  tenantName={activeTenant?.name ?? "tu empresa"}
                />
              ) : (
                <>
                  {view === "#clientes" ? (
                    <CustomersPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#proveedores" ? (
                    <SuppliersPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#productos" ? (
                    <ProductsPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#ventas" || view === "#pos" ? (
                    <SalesPage
                      mode={view === "#pos" ? "pos" : "sales"}
                      goBack={backToWorkspace}
                    />
                  ) : view === "#cotizaciones" ? (
                    <QuotesPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#pedidos-de-venta" ? (
                    <SalesOrdersPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#ordenes-de-compra" ? (
                    <PurchaseOrdersPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#inventario" ? (
                    <InventoryPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#almacenes" ? (
                    <WarehousesPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#kardex" ? (
                    <InventoryHistoryPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#inventario-fisico" ? (
                    <InventoryCountsPage goBack={backToWorkspace} />
                  ) : view === "#compras" ? (
                    <PurchasesPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#finanzas" ? (
                    <FinancePage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#cuentas" ? (
                    <AccountsPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#conciliacion" ? (
                    <ReconciliationPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#documentos" ? (
                    <DocumentsPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#reportes" ? (
                    <ReportsPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#centro-de-datos" ? (
                    <DataCenterPage key={`${tenantId}:${session?.user.id}`} goBack={backToWorkspace} />
                  ) : view === "#configuracion" ? (
                    <ConfigurationPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#administracion" ? (
                    <AdministrationPage
                      goBack={backToWorkspace}
                    />
                  ) : view === "#control-operativo" ? (
                    <OperationsPage key="operations"
                      goBack={backToWorkspace}
                    />
                  ) : (
                    <>
                      <section className="page-heading">
                        <div>
                          <p className="eyebrow">VIERNES, 17 DE OCTUBRE</p>
                          <h1>Buen día, {userName}</h1>
                          <p className="subtitle">
                            Aquí tienes una visión de la operación de{" "}
                            {activeTenant?.name ?? "tu empresa"}.
                          </p>
                        </div>
                        <button className="primary-button">
                          <Plus size={18} /> Crear nuevo{" "}
                          <ChevronDown size={16} />
                        </button>
                      </section>
                      <section
                        className="metric-grid"
                        aria-label="Indicadores del negocio"
                      >
                        <Metric
                          label="Ventas del mes"
                          value="S/ 1,248,600"
                          delta="12.8%"
                          tone="positive"
                        />
                        <Metric
                          label="Por cobrar"
                          value="S/ 286,420"
                          delta="8 documentos vencidos"
                          tone="negative"
                        />
                        <Metric
                          label="Órdenes activas"
                          value="42"
                          delta="6 por entregar esta semana"
                          tone="neutral"
                        />
                        <Metric
                          label="Valor de inventario"
                          value="S/ 856,910"
                          delta="2.4%"
                          tone="positive"
                        />
                      </section>
                      <section className="dashboard-grid">
                        <article className="revenue-card">
                          <DashboardCanvas />
                          <div className="revenue-content">
                            <div>
                              <p className="card-label">
                                RENDIMIENTO COMERCIAL
                              </p>
                              <h2>Ventas netas</h2>
                              <strong>S/ 1,248,600</strong>
                              <span className="revenue-trend">
                                ↑ 12.8% <small>respecto a septiembre</small>
                              </span>
                            </div>
                            <button className="period-button">
                              Últimos 6 meses <ChevronDown size={15} />
                            </button>
                          </div>
                          <div
                            className="chart"
                            aria-label="Ventas netas de mayo a octubre"
                          >
                            <div className="chart-lines">
                              <i />
                              <i />
                              <i />
                              <i />
                            </div>
                            <svg
                              viewBox="0 0 700 170"
                              role="img"
                              aria-hidden="true"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient
                                  id="chart-fill"
                                  x1="0"
                                  x2="0"
                                  y1="0"
                                  y2="1"
                                >
                                  <stop stopColor="#57c7f3" stopOpacity=".42" />
                                  <stop
                                    offset="1"
                                    stopColor="#57c7f3"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                              </defs>
                              <path
                                d="M0 130 C50 121 76 105 115 113 S185 138 235 102 S305 100 350 81 S410 94 462 65 S540 75 576 43 S650 58 700 13 L700 170 L0 170Z"
                                fill="url(#chart-fill)"
                              />
                              <path
                                d="M0 130 C50 121 76 105 115 113 S185 138 235 102 S305 100 350 81 S410 94 462 65 S540 75 576 43 S650 58 700 13"
                                fill="none"
                                stroke="#9ae2ff"
                                strokeWidth="3"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                            <div className="chart-labels">
                              <span>May</span>
                              <span>Jun</span>
                              <span>Jul</span>
                              <span>Ago</span>
                              <span>Sep</span>
                              <span>Oct</span>
                            </div>
                          </div>
                        </article>
                        <article className="tasks-card panel">
                          <div className="panel-header">
                            <div>
                              <p className="card-label">TU ATENCIÓN</p>
                              <h2>Por resolver</h2>
                            </div>
                            <button className="text-button">Ver todo</button>
                          </div>
                          <div className="task-list">
                            <div className="task">
                              <span className="task-icon amber">
                                <FileText size={18} />
                              </span>
                              <span>
                                <strong>8 facturas por cobrar</strong>
                                <small>S/ 86,430 vencidos</small>
                              </span>
                              <ChevronRight size={18} />
                            </div>
                            <div className="task">
                              <span className="task-icon blue">
                                <PackageSearch size={18} />
                              </span>
                              <span>
                                <strong>3 alertas de inventario</strong>
                                <small>Stock mínimo alcanzado</small>
                              </span>
                              <ChevronRight size={18} />
                            </div>
                            <div className="task">
                              <span className="task-icon purple">
                                <ClipboardList size={18} />
                              </span>
                              <span>
                                <strong>5 órdenes por aprobar</strong>
                                <small>Compras y gastos</small>
                              </span>
                              <ChevronRight size={18} />
                            </div>
                          </div>
                        </article>
                      </section>
                      <section className="lower-grid">
                        <article className="panel activity-panel">
                          <div className="panel-header">
                            <div>
                              <p className="card-label">OPERACIÓN</p>
                              <h2>Actividad reciente</h2>
                            </div>
                            <button
                              className="icon-button muted"
                              aria-label="Más opciones"
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </div>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>DOCUMENTO</th>
                                  <th>ACTIVIDAD</th>
                                  <th>ORIGEN</th>
                                  <th>CUÁNDO</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activity.map(
                                  ([code, detail, origin, time, state]) => (
                                    <tr key={code}>
                                      <td>
                                        <span
                                          className={`status-dot ${state}`}
                                        />{" "}
                                        <strong>{code}</strong>
                                      </td>
                                      <td>{detail}</td>
                                      <td>{origin}</td>
                                      <td className="time">{time}</td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                          <button className="table-footer">
                            Ver historial de actividad{" "}
                            <ChevronRight size={16} />
                          </button>
                        </article>
                        <article className="panel modules-panel">
                          <div className="panel-header">
                            <div>
                              <p className="card-label">ACCESOS RÁPIDOS</p>
                              <h2>Módulos clave</h2>
                            </div>
                            <LayoutGrid size={20} className="muted-icon" />
                          </div>
                          <div className="module-grid">
                            <a href="#ventas">
                              <span className="module-icon sales">
                                <ShoppingCart size={20} />
                              </span>
                              <span>Ventas</span>
                            </a>
                            <a href="#inventario">
                              <span className="module-icon inventory">
                                <Box size={20} />
                              </span>
                              <span>Inventario</span>
                            </a>
                            <a href="#finanzas">
                              <span className="module-icon finance">
                                <WalletCards size={20} />
                              </span>
                              <span>Finanzas</span>
                            </a>
                            <a href="#clientes">
                              <span className="module-icon customers">
                                <UsersRound size={20} />
                              </span>
                              <span>Clientes</span>
                            </a>
                          </div>
                        </article>
                      </section>
                    </>
                  )}
                </>
            )}
          </ModuleErrorBoundary>
        </div>
      </main>
      <AssistantChat
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        tenantName={activeTenant?.name ?? "tu empresa"}
        roleCode={roleCode}
      />
      {launcherOpen && (
        <ModuleLauncher
          tenantName={activeTenant?.name ?? "tu empresa"}
          roleCode={roleCode}
          businessProfile={activeTenant?.business_profile}
          onClose={() => {
            setLauncherOpen(false);
          }}
        />
      )}
    </div>
  );
}
