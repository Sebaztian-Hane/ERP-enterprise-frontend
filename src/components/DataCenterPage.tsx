import { useState } from "react";
import { ChevronLeft, Database, ExternalLink, Route } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { DataMigrationPanel, type ImportModule } from "./DataMigrationPanel";

const objects: { module: ImportModule; label: string; origin: string; destination: string; href: string }[] = [
  { module: "products", label: "1. Materiales", origin: "Unidades y clasificación", destination: "Catálogo de materiales; después, existencias por almacén", href: "#productos" },
  { module: "customers", label: "2. Clientes", origin: "Identidad y datos comerciales", destination: "Cotizaciones, pedidos, ventas y cuentas por cobrar", href: "#clientes" },
  { module: "suppliers", label: "3. Proveedores", origin: "Identidad fiscal y contacto", destination: "Órdenes, compras y cuentas por pagar", href: "#proveedores" },
  { module: "warehouses", label: "4. Almacenes", origin: "Ubicación logística", destination: "Existencias y movimientos por almacén", href: "#almacenes" },
  { module: "inventory", label: "5. Existencias", origin: "Material + almacén + cantidad + motivo", destination: "Ajuste de stock y trazabilidad en el kardex", href: "#inventario" },
  { module: "purchases", label: "6. Compras", origin: "Proveedor + materiales + almacén", destination: "Recepción, cuenta por pagar y registro contable", href: "#compras" },
  { module: "sales", label: "7. Ventas", origin: "Cliente + materiales + almacén", destination: "Movimiento de stock, cuenta por cobrar y registro contable", href: "#ventas" },
];
const flows = [
  { name: "De la necesidad al pago", owner: "Compras · Almacén · Finanzas", steps: [{ label: "Proveedor", href: "#proveedores" }, { label: "Orden y aprobación", href: "#ordenes-de-compra" }, { label: "Compra / recepción", href: "#compras" }, { label: "Cuenta por pagar", href: "#cuentas" }, { label: "Pago", href: "#finanzas" }, { label: "Conciliación", href: "#conciliacion" }], closure: "Cierre: recepción verificada, obligación pagada y movimiento conciliado." },
  { name: "De la oportunidad al cobro", owner: "Comercial · Almacén · Finanzas", steps: [{ label: "Cliente", href: "#clientes" }, { label: "Cotización", href: "#cotizaciones" }, { label: "Pedido", href: "#pedidos-de-venta" }, { label: "Venta y entrega", href: "#ventas" }, { label: "Cuenta por cobrar", href: "#cuentas" }, { label: "Cobro", href: "#finanzas" }], closure: "Cierre: entrega comprobada, comprobante revisado y saldo cobrado. En mostrador, la venta inicia en Punto de venta." },
  { name: "Del material al control", owner: "Maestros · Inventario · Control", steps: [{ label: "Unidades", href: "#configuracion" }, { label: "Materiales", href: "#productos" }, { label: "Almacenes", href: "#almacenes" }, { label: "Movimientos", href: "#inventario" }, { label: "Kardex", href: "#kardex" }, { label: "Conteo", href: "#inventario-fisico" }], closure: "Cierre: existencia física conciliada, diferencias justificadas y movimientos trazables." },
  { name: "Del documento al control financiero", owner: "Responsable del proceso · Aprobador · Contabilidad", steps: [{ label: "Documentos", href: "#documentos" }, { label: "Aprobaciones y asientos", href: "#control-operativo" }, { label: "Tesorería", href: "#finanzas" }, { label: "Reportes", href: "#reportes" }], closure: "Cierre: evidencia archivada, aprobación registrada y saldos revisados." },
];

export function DataCenterPage({ goBack }: { goBack: () => void }) {
  const { tenants, tenantId } = useAuth();
  const profile = tenants.find((tenant) => tenant.id === tenantId)?.business_profile;
  const [module, setModule] = useState<ImportModule>("products");
  const available = objects.filter((item) => !(profile === "retail" && item.module === "sales"));
  const selected = available.find((item) => item.module === module) ?? available[0];
  return <section className="module-page data-center-page">
    <div className="module-heading"><div><button className="back-link" onClick={goBack}><ChevronLeft size={16} /> Panel general</button><p className="eyebrow">ADMINISTRACIÓN DE DATOS</p><h1><Database size={25} /> Centro de datos</h1><p className="subtitle">Carga y exportación por objeto, con un origen y un resultado definidos.</p></div></div>
    <div className="data-object-tabs" role="group" aria-label="Objeto de carga">{available.map((item) => <button key={item.module} type="button" className={selected.module === item.module ? "selected" : ""} aria-pressed={selected.module === item.module} onClick={() => setModule(item.module)}>{item.label}</button>)}</div>
    <article className="panel data-flow-intro"><div><small>ORIGEN</small><strong>{selected.origin}</strong></div><span aria-hidden="true">→</span><div><small>RESULTADO</small><strong>{selected.destination}</strong></div><a className="secondary-button" href={selected.href}>Abrir módulo <ExternalLink size={14} /></a></article>
    <DataMigrationPanel key={`${tenantId}:${selected.module}`} module={selected.module} expanded onImported={() => undefined} />
    <div className="data-flows-heading"><Route size={20} /><div><h2>Rutas de la operación</h2><p>Responsables y criterios de cierre para seguir cada proceso entre módulos.</p></div></div>
    <div className="data-flows">{flows.map((flow) => <article key={flow.name} className="panel data-flow-card"><small>{flow.owner}</small><h3>{flow.name}</h3><ol>{flow.steps.filter((step) => !(profile === "retail" && ["#cotizaciones", "#pedidos-de-venta"].includes(step.href))).map((step) => <li key={step.href}><a href={step.href}>{step.label}</a></li>)}</ol><p>{flow.closure}</p></article>)}</div>
  </section>;
}
