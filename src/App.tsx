import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
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
import { useAuth } from "./auth/AuthProvider";
import { canAccessModule, defaultModuleFor } from "./lib/roleAccess";

const CHUNK_RELOAD_PARAM = "ec-reload";

function refreshApplication() {
  const url = new URL(window.location.href);
  url.searchParams.set(CHUNK_RELOAD_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}

function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  // A lazy chunk can temporarily fail while the browser is in the background
  // or while a deployment is propagating. Reloading here discarded any form
  // being edited, so failures are deliberately delegated to the error boundary.
  // The user can then explicitly choose "Actualizar aplicación" if necessary.
  return lazy(factory);
}

const DashboardPage = lazyWithRetry(() =>
  import("./components/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CustomersPage = lazyWithRetry(() =>
  import("./components/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  })),
);
const SuppliersPage = lazyWithRetry(() =>
  import("./components/SuppliersPage").then((module) => ({
    default: module.SuppliersPage,
  })),
);
const ProductsPage = lazyWithRetry(() =>
  import("./components/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  })),
);
const SalesPage = lazyWithRetry(() =>
  import("./components/SalesPage").then((module) => ({
    default: module.SalesPage,
  })),
);
const QuotesPage = lazyWithRetry(() =>
  import("./components/QuotesPage").then((module) => ({
    default: module.QuotesPage,
  })),
);
const SalesOrdersPage = lazyWithRetry(() =>
  import("./components/SalesOrdersPage").then((module) => ({
    default: module.SalesOrdersPage,
  })),
);
const PurchasesPage = lazyWithRetry(() =>
  import("./components/PurchasesPage").then((module) => ({
    default: module.PurchasesPage,
  })),
);
const PurchaseOrdersPage = lazyWithRetry(() =>
  import("./components/PurchaseOrdersPage").then((module) => ({
    default: module.PurchaseOrdersPage,
  })),
);
const InventoryPage = lazyWithRetry(() =>
  import("./components/InventoryPage").then((module) => ({
    default: module.InventoryPage,
  })),
);
const WarehousesPage = lazyWithRetry(() =>
  import("./components/WarehousesPage").then((module) => ({
    default: module.WarehousesPage,
  })),
);
const InventoryHistoryPage = lazyWithRetry(() =>
  import("./components/InventoryHistoryPage").then((module) => ({
    default: module.InventoryHistoryPage,
  })),
);
const InventoryCountsPage = lazyWithRetry(() => import("./components/InventoryCountsPage").then((module) => ({ default: module.InventoryCountsPage })));
const FinancePage = lazyWithRetry(() =>
  import("./components/FinancePage").then((module) => ({
    default: module.FinancePage,
  })),
);
const AccountsPage = lazyWithRetry(() =>
  import("./components/AccountsPage").then((module) => ({ default: module.AccountsPage })),
);
const ReconciliationPage = lazyWithRetry(() =>
  import("./components/ReconciliationPage").then((module) => ({
    default: module.ReconciliationPage,
  })),
);
const DocumentsPage = lazyWithRetry(() =>
  import("./components/DocumentsPage").then((module) => ({
    default: module.DocumentsPage,
  })),
);
const ReportsPage = lazyWithRetry(() =>
  import("./components/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const AdministrationPage = lazyWithRetry(() =>
  import("./components/AdministrationPage").then((module) => ({
    default: module.AdministrationPage,
  })),
);
const ProfilePage = lazyWithRetry(() =>
  import("./components/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const OperationsPage = lazyWithRetry(() =>
  import("./components/OperationsPage").then((module) => ({
    default: module.OperationsPage,
  })),
);
const ConfigurationPage = lazyWithRetry(() =>
  import("./components/ConfigurationPage").then((module) => ({
    default: module.ConfigurationPage,
  })),
);

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
    label: "Abastecimiento e inventario",
    description: "Compras, proveedores, stock y productos",
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
    label: "Administración",
    description: "Documentos, permisos y configuración",
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
  { label: "Control operativo", icon: BadgeCheck, href: "#control-operativo", category: "finanzas" },
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
  { label: "Administración", icon: BriefcaseBusiness, href: "#administracion", category: "administracion", description: "Usuarios y permisos", tone: "navy" },
  { label: "Documentos", icon: FileText, href: "#documentos", category: "administracion", description: "Archivo empresarial", tone: "slate" },
  { label: "Control operativo", icon: BadgeCheck, href: "#control-operativo", category: "finanzas", description: "Aprobaciones y contabilidad", tone: "indigo" },
];
type BusinessProfile = "retail" | "wholesale" | "hybrid";
const PROFILE_BLOCKED_VIEWS: Record<BusinessProfile, ReadonlySet<string>> = {
  retail: new Set(["#cotizaciones", "#pedidos-de-venta"]),
  wholesale: new Set(["#pos"]),
  hybrid: new Set(),
};
const isProfileModuleAvailable = (profile: BusinessProfile | undefined, href: string) =>
  !PROFILE_BLOCKED_VIEWS[profile ?? "hybrid"].has(href);
const supportedViews = new Set([
  // The launcher is the source of truth. Keeping the recognized hashes in
  // sync with its modules prevents an app from silently falling back to the
  // dashboard when a new card is added (as happened with Documents).
  ...appModules.map((item) => item.href),
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
          {canAccessModule(roleCode, "#dashboard") && (
            <a className={`nav-item ${view === "#dashboard" ? "active" : ""}`} href="#dashboard">
              <Gauge size={18} strokeWidth={view === "#dashboard" ? 2.2 : 1.8} />
              <span>Panel ejecutivo</span>
            </a>
          )}
          {moduleCategories
            .filter((category) => navigation.some((item) => item.category === category.id && item.href !== "#dashboard" && canAccessModule(roleCode, item.href)))
            .map((category) => (
              <div className="nav-category" key={category.id}>
                <p className="nav-caption nav-category-title">{category.label}</p>
                {navigation
                  .filter((item) => item.category === category.id && item.href !== "#dashboard" && canAccessModule(roleCode, item.href))
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
          {canAccessModule(roleCode, "#administracion") && <>
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
            href="https://erp-enterprisecloud-api.onrender.com/docs"
            target="_blank"
            rel="noreferrer"
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
  const visibleModules = appModules.filter(
    (module) =>
      canAccessModule(roleCode, module.href) &&
      isProfileModuleAvailable(businessProfile, module.href) &&
      (!normalizedSearch ||
        `${module.label} ${module.description}`
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch)),
  );

  return (
    <div className="app-launcher-layer" role="presentation">
      <button className="app-launcher-backdrop" aria-label="Cerrar aplicaciones" onClick={onClose} />
      <section className="app-launcher" role="dialog" aria-modal="true" aria-label="Aplicaciones de EnterpriseCloud">
        <DashboardCanvas />
        <header className="app-launcher-heading">
          <div>
            <p className="eyebrow">APLICACIONES</p>
            <h1>Tu espacio de trabajo</h1>
            <p>Aplicaciones ordenadas por área para operar {tenantName}.</p>
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
              placeholder="Buscar aplicaciones y procesos"
              aria-label="Buscar aplicaciones"
            />
            {moduleSearch && (
              <button type="button" onClick={() => setModuleSearch("")} aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </label>
          <span>{visibleModules.length} aplicaciones disponibles</span>
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
                  {modules.map(({ label: moduleLabel, icon: Icon, href, description: moduleDescription, tone }) => (
                    <button className="app-module-card" key={href} onClick={() => openModule(href)}>
                      <span className={`app-module-icon ${tone}`}><Icon size={25} /></span>
                      <span><strong>{moduleLabel}</strong><small>{moduleDescription}</small></span>
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
    isRoleLoading,
    roleError,
    isLoading,
    error,
    selectTenant,
    signOut,
  } = useAuth();
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState(readView);
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
      setView(nextView);
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
    const allowed = view === "#perfil" || (canAccessModule(roleCode, view) && isProfileModuleAvailable(activeTenant?.business_profile, view));
    if (allowed) return;
    const fallback = defaultModuleFor(roleCode);
    if (fallback) window.location.hash = fallback;
  }, [activeTenant?.business_profile, isProviderPortal, isRoleLoading, roleCode, view]);
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
  if (!session) return <LoginPage />;
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
  const allowedNavigation = navigation.filter((item) => canAccessModule(roleCode, item.href) && isProfileModuleAvailable(activeTenant?.business_profile, item.href));
  const allQuickLinks = [
    ...allowedNavigation,
    ...(canAccessModule(roleCode, "#administracion")
      ? [{ label: "Administración", icon: BriefcaseBusiness, href: "#administracion" }]
      : []),
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
      : (allQuickLinks.find((item) => item.href === view)?.label ??
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
            <span>Inicio</span>
            <ChevronRight size={15} />
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
          <ModuleErrorBoundary view={view}>
            <Suspense
              fallback={
                <div className="module-state dashboard-state">
                  <LoaderCircle className="spin" size={24} /> Cargando módulo…
                </div>
              }
            >
              {view !== "#perfil" && (!canAccessModule(roleCode, view) || !isProfileModuleAvailable(activeTenant?.business_profile, view)) ? (
                <section className="module-state dashboard-state">
                  <AlertTriangle size={27} />
                  <strong>No tienes acceso a este módulo</strong>
                  <span>Te redirigiremos a las herramientas asignadas a tu rol.</span>
                </section>
              ) : view === "#perfil" ? (
                <ProfilePage goBack={() => { window.location.hash = "#dashboard"; }} />
              ) : view === "#dashboard" ? (
                <DashboardPage
                  userName={userName}
                  tenantName={activeTenant?.name ?? "tu empresa"}
                />
              ) : (
                <>
                  {view === "#clientes" ? (
                    <CustomersPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#proveedores" ? (
                    <SuppliersPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#productos" ? (
                    <ProductsPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#ventas" || view === "#pos" ? (
                    <SalesPage
                      mode={view === "#pos" ? "pos" : "sales"}
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#cotizaciones" ? (
                    <QuotesPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#pedidos-de-venta" ? (
                    <SalesOrdersPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#ordenes-de-compra" ? (
                    <PurchaseOrdersPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#inventario" ? (
                    <InventoryPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#almacenes" ? (
                    <WarehousesPage
                      goBack={() => {
                        window.location.hash = "#inventario";
                      }}
                    />
                  ) : view === "#kardex" ? (
                    <InventoryHistoryPage
                      goBack={() => {
                        window.location.hash = "#inventario";
                      }}
                    />
                  ) : view === "#inventario-fisico" ? (
                    <InventoryCountsPage goBack={() => { window.location.hash = "#inventario"; }} />
                  ) : view === "#compras" ? (
                    <PurchasesPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#finanzas" ? (
                    <FinancePage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#cuentas" ? (
                    <AccountsPage
                      goBack={() => { window.location.hash = "#finanzas"; }}
                    />
                  ) : view === "#conciliacion" ? (
                    <ReconciliationPage
                      goBack={() => {
                        window.location.hash = "#finanzas";
                      }}
                    />
                  ) : view === "#documentos" ? (
                    <DocumentsPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#reportes" ? (
                    <ReportsPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#configuracion" ? (
                    <ConfigurationPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#administracion" ? (
                    <AdministrationPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
                    />
                  ) : view === "#control-operativo" ? (
                    <OperationsPage
                      goBack={() => {
                        window.location.hash = "#dashboard";
                      }}
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
            </Suspense>
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
