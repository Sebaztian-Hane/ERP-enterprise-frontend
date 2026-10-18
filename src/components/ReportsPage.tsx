import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  Download,
  FileDown,
  LoaderCircle,
  PackageSearch,
  Printer,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";

type Period = {
  start_date: string;
  end_date: string;
  sales_total: string;
  purchases_total: string;
  receipts_total: string;
  payments_total: string;
};
type Summary = { current: Period; comparison: Period | null };
type Balance = {
  id: string;
  original_amount: string;
  balance_amount: string;
  status: string;
};
type StockAlert = {
  product_id: string;
  sku: string;
  name: string;
  minimum_stock: string;
  current_stock: string;
};
const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const iso = (value: Date) => value.toISOString().slice(0, 10);
const escapeXml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
const excelColumn = (index: number) => {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
};
const now = new Date(),
  initialEnd = iso(now),
  initialStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));

function Comparison({
  label,
  value,
  previous,
}: {
  label: string;
  value: string;
  previous?: string;
}) {
  const delta = Number(value) - Number(previous ?? 0);
  const positive = delta >= 0;
  return (
    <article className="metric-card live-metric">
      <span className="live-metric-icon blue">
        <BarChart3 size={18} />
      </span>
      <p>{label}</p>
      <strong>{money.format(Number(value))}</strong>
      <span className={`trend ${positive ? "positive" : "negative"}`}>
        {previous === undefined
          ? "Sin comparativo"
          : `${positive ? "+" : ""}${money.format(delta)} vs. periodo anterior`}
      </span>
    </article>
  );
}

export function ReportsPage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null),
    [receivables, setReceivables] = useState<Balance[]>([]),
    [payables, setPayables] = useState<Balance[]>([]),
    [lowStock, setLowStock] = useState<StockAlert[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(initialStart),
    [endDate, setEndDate] = useState(initialEnd),
    [compare, setCompare] = useState(true);
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const query = () => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (compare) {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      start.setDate(start.getDate() - days);
      end.setDate(end.getDate() - days);
      params.set("compare_start_date", iso(start));
      params.set("compare_end_date", iso(end));
    }
    return params.toString();
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [period, ar, ap, stock] = await Promise.all([
        apiFetch<Summary>("/reports/summary?" + query(), options),
        apiFetch<Balance[]>("/reports/receivables", options),
        apiFetch<Balance[]>("/reports/payables", options),
        apiFetch<StockAlert[]>("/reports/low-stock", options),
      ]);
      setSummary(period);
      setReceivables(ar);
      setPayables(ap);
      setLowStock(stock);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los reportes.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const receivableTotal = useMemo(
    () =>
      receivables.reduce(
        (total, item) => total + Number(item.balance_amount),
        0,
      ),
    [receivables],
  );
  const payableTotal = useMemo(
    () =>
      payables.reduce((total, item) => total + Number(item.balance_amount), 0),
    [payables],
  );
  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };
  const reportRows = () => {
    if (!summary) return;
    const p = summary.current,
      prior = summary.comparison;
    return [
      [
        startDate + " a " + endDate,
        "Ventas",
        p.sales_total,
        prior?.sales_total ?? "—",
      ],
      [
        startDate + " a " + endDate,
        "Compras",
        p.purchases_total,
        prior?.purchases_total ?? "—",
      ],
      [
        startDate + " a " + endDate,
        "Cobros",
        p.receipts_total,
        prior?.receipts_total ?? "—",
      ],
      [
        startDate + " a " + endDate,
        "Pagos",
        p.payments_total,
        prior?.payments_total ?? "—",
      ],
      [startDate + " a " + endDate, "Por cobrar", receivableTotal, "—"],
      [startDate + " a " + endDate, "Por pagar", payableTotal, "—"],
      [startDate + " a " + endDate, "Stock bajo", lowStock.length, "—"],
    ];
  };
  const exportExcel = async () => {
    const rows = reportRows();
    if (!rows) return;
    const { strToU8, zipSync } = await import("fflate");
    const table = [
      ["Periodo", "Indicador", "Valor actual", "Valor previo"],
      ...rows,
    ];
    const sheetRows = table
      .map(
        (row, rowIndex) =>
          `<row r="${rowIndex + 1}">${row
            .map(
              (cell, columnIndex) =>
                `<c r="${excelColumn(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`,
            )
            .join("")}</row>`,
      )
      .join("");
    const files = {
      "[Content_Types].xml": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
      "_rels/.rels": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
      "xl/workbook.xml": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
      "xl/_rels/workbook.xml.rels": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
      "xl/worksheets/sheet1.xml": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="4" width="18" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`,
      ),
    };
    const blob = new Blob([zipSync(files)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `erp-reporte-${startDate}-${endDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = async () => {
    const rows = reportRows();
    if (!rows) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("ERP EnterpriseCloud", 15, 18);
    pdf.setFontSize(12);
    pdf.text("Reporte operativo · " + startDate + " a " + endDate, 15, 27);
    let y = 39;
    rows.forEach((row) => {
      pdf.setFontSize(10);
      pdf.text(String(row[1]), 15, y);
      pdf.text(String(row[2]), 105, y, { align: "right" });
      pdf.text(String(row[3]), 185, y, { align: "right" });
      y += 8;
    });
    pdf.setDrawColor(210);
    pdf.line(15, 32, 195, 32);
    pdf.setFontSize(8);
    pdf.text("Valor actual", 105, 35, { align: "right" });
    pdf.text("Periodo previo", 185, 35, { align: "right" });
    pdf.save("erp-reporte-" + startDate + "-" + endDate + ".pdf");
  };
  const p = summary?.current,
    previous = summary?.comparison;
  return (
    <section className="module-page report-print">
      <div className="module-heading">
        <div>
          <button className="back-link no-print" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">ANÁLISIS Y CONTROL</p>
          <h1>Reportes</h1>
          <p className="subtitle">
            Indicadores por periodo, comparativos y exportación para análisis
            ejecutivo.
          </p>
        </div>
        <div className="heading-actions no-print">
          <button
            className="secondary-button"
            onClick={() => void exportPdf()}
            disabled={!summary}
          >
            <Printer size={17} /> Exportar PDF
          </button>
          <button
            className="primary-button"
            onClick={() => void exportExcel()}
            disabled={!summary}
          >
            <Download size={18} /> Excel
          </button>
        </div>
      </div>
      <form
        className="panel customers-toolbar no-print"
        onSubmit={applyFilters}
      >
        <label>
          Desde
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="check-control">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
          />{" "}
          Comparar periodo anterior
        </label>
        <button className="secondary-button">
          <FileDown size={16} /> Aplicar
        </button>
      </form>
      {error && (
        <div className="module-error">
          {error}
          <button onClick={() => void load()}>Reintentar</button>
        </div>
      )}
      {loading || !p ? (
        <div className="module-state">
          <LoaderCircle className="spin" size={24} /> Cargando indicadores…
        </div>
      ) : (
        <>
          <p className="report-period">
            Periodo: <strong>{p.start_date}</strong> a{" "}
            <strong>{p.end_date}</strong>
            {previous
              ? ` · comparación: ${previous.start_date} a ${previous.end_date}`
              : ""}
          </p>
          <section className="metric-grid">
            <Comparison
              label="Ventas del periodo"
              value={p.sales_total}
              previous={previous?.sales_total}
            />
            <Comparison
              label="Compras del periodo"
              value={p.purchases_total}
              previous={previous?.purchases_total}
            />
            <Comparison
              label="Cobros del periodo"
              value={p.receipts_total}
              previous={previous?.receipts_total}
            />
            <Comparison
              label="Pagos del periodo"
              value={p.payments_total}
              previous={previous?.payments_total}
            />
          </section>
          <section className="finance-grid">
            <BalancePanel
              title="CUENTAS POR COBRAR"
              total={receivableTotal}
              balances={receivables}
            />
            <BalancePanel
              title="CUENTAS POR PAGAR"
              total={payableTotal}
              balances={payables}
            />
          </section>
          <article className="panel customers-panel">
            <div className="panel-header">
              <div>
                <p className="card-label">INVENTARIO</p>
                <h2>Productos bajo mínimo</h2>
              </div>
              <span className="table-count">{lowStock.length} alertas</span>
            </div>
            {lowStock.length === 0 ? (
              <div className="module-state compact">
                <PackageSearch size={24} /> No hay productos por debajo de su
                mínimo.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>PRODUCTO</th>
                      <th>ACTUAL</th>
                      <th>MÍNIMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item.product_id}>
                        <td>
                          <strong>{item.sku}</strong>
                        </td>
                        <td>{item.name}</td>
                        <td className="stock-zero">
                          {Number(item.current_stock).toLocaleString("es-MX")}
                        </td>
                        <td>
                          {Number(item.minimum_stock).toLocaleString("es-MX")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}

function BalancePanel({
  title,
  total,
  balances,
}: {
  title: string;
  total: number;
  balances: Balance[];
}) {
  return (
    <article className="panel finance-panel">
      <div className="panel-header">
        <div>
          <p className="card-label">{title}</p>
          <h2>Saldo pendiente</h2>
        </div>
        <strong>{money.format(total)}</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ESTADO</th>
              <th>ORIGINAL</th>
              <th>SALDO</th>
            </tr>
          </thead>
          <tbody>
            {balances.slice(0, 8).map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="status-pill active">{item.status}</span>
                </td>
                <td>{money.format(Number(item.original_amount))}</td>
                <td>
                  <strong>{money.format(Number(item.balance_amount))}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
