import {
  Component,
  lazy,
  Suspense,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Box,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
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
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { DashboardCanvas } from "./components/DashboardCanvas";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./auth/AuthProvider";

const DashboardPage = lazy(() =>
  import("./components/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const CustomersPage = lazy(() =>
  import("./components/CustomersPage").then((module) => ({
    default: module.CustomersPage,
  })),
);
const ProductsPage = lazy(() =>
  import("./components/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  })),
);
const SalesPage = lazy(() =>
  import("./components/SalesPage").then((module) => ({
    default: module.SalesPage,
  })),
);
const QuotesPage = lazy(() =>
  import("./components/QuotesPage").then((module) => ({
    default: module.QuotesPage,
  })),
);
const SalesOrdersPage = lazy(() =>
  import("./components/SalesOrdersPage").then((module) => ({
    default: module.SalesOrdersPage,
  })),
);
const PurchasesPage = lazy(() =>
  import("./components/PurchasesPage").then((module) => ({
    default: module.PurchasesPage,
  })),
);
const PurchaseOrdersPage = lazy(() =>
  import("./components/PurchaseOrdersPage").then((module) => ({
    default: module.PurchaseOrdersPage,
  })),
);
const InventoryPage = lazy(() =>
  import("./components/InventoryPage").then((module) => ({
    default: module.InventoryPage,
  })),
);
const InventoryHistoryPage = lazy(() =>
  import("./components/InventoryHistoryPage").then((module) => ({
    default: module.InventoryHistoryPage,
  })),
);
const FinancePage = lazy(() =>
  import("./components/FinancePage").then((module) => ({
    default: module.FinancePage,
  })),
);
const ReconciliationPage = lazy(() =>
  import("./components/ReconciliationPage").then((module) => ({
    default: module.ReconciliationPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("./components/DocumentsPage").then((module) => ({
    default: module.DocumentsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("./components/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const AdministrationPage = lazy(() =>
  import("./components/AdministrationPage").then((module) => ({
    default: module.AdministrationPage,
  })),
);

type NavItem = {
  label: string;
  icon: typeof Gauge;
  href: string;
  badge?: string;
};

const navigation: NavItem[] = [
  { label: "Inicio", icon: Gauge, href: "#dashboard" },
  { label: "Ventas", icon: ShoppingCart, href: "#ventas" },
  { label: "Cotizaciones", icon: FileText, href: "#cotizaciones" },
  { label: "Pedidos de venta", icon: ClipboardList, href: "#pedidos-de-venta" },
  { label: "Compras", icon: ClipboardList, href: "#compras" },
  { label: "Órdenes de compra", icon: FileText, href: "#ordenes-de-compra" },
  { label: "Inventario", icon: Box, href: "#inventario" },
  { label: "Kardex", icon: ClipboardList, href: "#kardex" },
  { label: "Productos", icon: PackageSearch, href: "#productos" },
  { label: "Finanzas", icon: WalletCards, href: "#finanzas" },
  { label: "Conciliación", icon: ArrowLeftRight, href: "#conciliacion" },
  { label: "Clientes", icon: UsersRound, href: "#clientes" },
  { label: "Documentos", icon: FileText, href: "#documentos" },
  { label: "Reportes", icon: BarChart3, href: "#reportes" },
];
const supportedViews = new Set([
  ...navigation.map((item) => item.href),
  "#administracion",
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
          <span className="brand-mark">
            <span />
          </span>
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
          {navigation.map(({ label, icon: Icon, href, badge }) => (
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
          <p className="nav-caption lower">CONFIGURACIÓN</p>
          <a className="nav-item" href="#administracion">
            <BriefcaseBusiness size={18} />
            <span>Administración</span>
          </a>
          <a
            className={`nav-item ${view === "#administracion" ? "active" : ""}`}
            href="#administracion"
          >
            <Settings size={18} />
            <span>Configuración</span>
          </a>
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
              onClick={() => window.location.reload()}
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
  const {
    session,
    tenants,
    tenantId,
    isLoading,
    error,
    selectTenant,
    signOut,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [view, setView] = useState(readView);
  useEffect(() => {
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
  }, []);
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
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId);
  const userName = session.user.email?.split("@")[0] ?? "Usuario";
  const allQuickLinks = [
    ...navigation,
    {
      label: "Administración",
      icon: BriefcaseBusiness,
      href: "#administracion",
    },
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
      <Sidebar
        open={menuOpen}
        close={() => setMenuOpen(false)}
        tenantId={tenantId}
        tenantName={activeTenant?.name ?? "Empresa"}
        tenants={tenants}
        userName={userName}
        view={view}
        onTenantChange={selectTenant}
        onLogout={() => void signOut()}
      />
      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>Inicio</span>
            <ChevronRight size={15} />
            <strong>{breadcrumbLabel}</strong>
          </div>
          <div className="search global-search">
            <Search size={18} />
            <input
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
            <a
              className="icon-button"
              href="#reportes"
              aria-label="Ver indicadores y alertas"
              title="Ver indicadores y alertas"
            >
              <Bell size={20} />
              <i />
            </a>
            <span className="avatar top-avatar">SZ</span>
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
              {view === "#dashboard" ? (
                <DashboardPage
                  userName={userName}
                  tenantName={activeTenant?.name ?? "tu empresa"}
                />
              ) : (
                <>
                  {view === "#clientes" ? (
                    <CustomersPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#productos" ? (
                    <ProductsPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#ventas" ? (
                    <SalesPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#cotizaciones" ? (
                    <QuotesPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#pedidos-de-venta" ? (
                    <SalesOrdersPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#ordenes-de-compra" ? (
                    <PurchaseOrdersPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#inventario" ? (
                    <InventoryPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#kardex" ? (
                    <InventoryHistoryPage
                      goBack={() => {
                        window.location.hash = "inventario";
                      }}
                    />
                  ) : view === "#compras" ? (
                    <PurchasesPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#finanzas" ? (
                    <FinancePage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#conciliacion" ? (
                    <ReconciliationPage
                      goBack={() => {
                        window.location.hash = "finanzas";
                      }}
                    />
                  ) : view === "#documentos" ? (
                    <DocumentsPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#reportes" ? (
                    <ReportsPage
                      goBack={() => {
                        window.location.hash = "dashboard";
                      }}
                    />
                  ) : view === "#administracion" ? (
                    <AdministrationPage
                      goBack={() => {
                        window.location.hash = "dashboard";
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
                          value="$1,248,600"
                          delta="12.8%"
                          tone="positive"
                        />
                        <Metric
                          label="Por cobrar"
                          value="$286,420"
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
                          value="$856,910"
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
                              <strong>$1,248,600</strong>
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
                                <small>$86,430 vencidos</small>
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
    </div>
  );
}
