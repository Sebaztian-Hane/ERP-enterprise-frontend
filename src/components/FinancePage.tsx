import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  Landmark,
  LoaderCircle,
  Plus,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch, postIdempotent } from "../lib/api";

type Receivable = {
  id: string;
  sale_id: string;
  customer_id: string;
  original_amount: string;
  balance_amount: string;
  status: string;
};
type Payable = {
  id: string;
  purchase_id: string;
  supplier_id: string;
  original_amount: string;
  balance_amount: string;
  status: string;
};
type Customer = { id: string; name: string };
type Supplier = { id: string; name: string };
type CashAccount = {
  id: string;
  code: string;
  name: string;
  account_type: "cash" | "bank";
  currency: string;
  is_active: boolean;
};
type PettyCashFund = {
  id: string;
  code: string;
  name: string;
  fixed_amount: string;
  current_balance: string;
  currency: string;
  status: string;
  cash_account_name: string;
  pending_expenses: number;
  pending_replenishments: number;
};
type PettyCashReplenishment = { id: string; number: string; amount: string; status: string; fund_name: string; fund_code: string };
type Payment = {
  id: string;
  number: string;
  payment_type: "receipt" | "payment";
  customer_id: string | null;
  supplier_id: string | null;
  cash_account_id: string;
  amount: string;
  method: string;
  reference: string | null;
  status: string;
  approval_request_id: string | null;
};
type PaymentKind = "receipt" | "payment";
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const paymentNumber = (kind: PaymentKind) =>
  `${kind === "receipt" ? "COB" : "PAG"}-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14)}`;

export function FinancePage({ goBack }: { goBack: () => void }) {
  const { session, tenantId } = useAuth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pettyCashFunds, setPettyCashFunds] = useState<PettyCashFund[]>([]);
  const [approvedReplenishments, setApprovedReplenishments] = useState<PettyCashReplenishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pettyCashOpen, setPettyCashOpen] = useState(false);
  const [expenseFund, setExpenseFund] = useState<PettyCashFund | null>(null);
  const [paymentOpen, setPaymentOpen] = useState<PaymentKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({
    code: "",
    name: "",
    account_type: "bank",
    currency: "PEN",
  });
  const [pettyCashForm, setPettyCashForm] = useState({
    code: "",
    name: "",
    cash_account_id: "",
    funding_cash_account_id: "",
    fixed_amount: "",
  });
  const [expenseForm, setExpenseForm] = useState({ number: "", description: "", merchant_name: "", receipt_number: "", amount: "", expense_account_code: "6590" });
  const [paymentForm, setPaymentForm] = useState({
    number: paymentNumber("receipt"),
    documentId: "",
    cashAccountId: "",
    amount: "",
    method: "transferencia",
    reference: "",
    note: "",
  });
  const options = {
    accessToken: session?.access_token,
    tenantId: tenantId ?? undefined,
  };
  const load = async () => {
    if (!session || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [ar, ap, customersData, suppliersData, accountsData, paymentsData] =
        await Promise.all([
          apiFetch<Receivable[]>("/accounts/receivable", options),
          apiFetch<Payable[]>("/accounts/payable", options),
          apiFetch<Customer[]>("/customers", options),
          apiFetch<Supplier[]>("/suppliers", options),
          apiFetch<CashAccount[]>("/treasury/accounts", options),
          apiFetch<Payment[]>("/payments", options),
        ]);
      // Caja chica es una extensión de tesorería. Su indisponibilidad no debe
      // ocultar saldos, cuentas ni cobros de toda la pantalla financiera.
      const [fundsResult, replenishmentsResult] = await Promise.allSettled([
          apiFetch<PettyCashFund[]>("/treasury/petty-cash/funds", options),
          apiFetch<PettyCashReplenishment[]>("/treasury/petty-cash/replenishments?status_filter=approved", options),
        ]);
      setReceivables(ar);
      setPayables(ap);
      setCustomers(customersData);
      setSuppliers(suppliersData);
      setAccounts(accountsData);
      setPayments(paymentsData);
      setPettyCashFunds(fundsResult.status === "fulfilled" ? fundsResult.value : []);
      setApprovedReplenishments(replenishmentsResult.status === "fulfilled" ? replenishmentsResult.value : []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar información financiera.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session?.access_token, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dueReceivable = useMemo(
    () =>
      receivables
        .filter((item) => item.status !== "paid" && item.status !== "cancelled")
        .reduce((sum, item) => sum + Number(item.balance_amount), 0),
    [receivables],
  );
  const duePayable = useMemo(
    () =>
      payables
        .filter((item) => item.status !== "paid" && item.status !== "cancelled")
        .reduce((sum, item) => sum + Number(item.balance_amount), 0),
    [payables],
  );
  const customerName = (id: string) =>
    customers.find((item) => item.id === id)?.name ?? "Cliente";
  const supplierName = (id: string) =>
    suppliers.find((item) => item.id === id)?.name ?? "Proveedor";
  const openPayment = (kind: PaymentKind) => {
    setError(null);
    setPaymentForm({
      number: paymentNumber(kind),
      documentId: "",
      cashAccountId: accounts.find((account) => account.is_active)?.id ?? "",
      amount: "",
      method: "transferencia",
      reference: "",
      note: "",
    });
    setPaymentOpen(kind);
  };
  const selectedDocument =
    paymentOpen === "receipt"
      ? receivables.find((item) => item.id === paymentForm.documentId)
      : payables.find((item) => item.id === paymentForm.documentId);
  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await apiFetch<CashAccount>("/treasury/accounts", {
        ...options,
        method: "POST",
        body: JSON.stringify(accountForm),
      });
      setAccounts((current) => [...current, created]);
      setAccountOpen(false);
      setAccountForm({
        code: "",
        name: "",
        account_type: "bank",
        currency: "PEN",
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible crear la cuenta.",
      );
    } finally {
      setSaving(false);
    }
  };
  const savePettyCashFund = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.user.id) return;
    setSaving(true); setError(null);
    try {
      await postIdempotent("/treasury/petty-cash/funds", { ...options, body: JSON.stringify({ ...pettyCashForm, fixed_amount: Number(pettyCashForm.fixed_amount), custodian_user_id: session.user.id }) });
      setPettyCashOpen(false);
      setPettyCashForm({ code: "", name: "", cash_account_id: "", funding_cash_account_id: "", fixed_amount: "" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible constituir la caja chica.");
    } finally { setSaving(false); }
  };
  const savePettyCashExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!expenseFund) return;
    setSaving(true); setError(null);
    try {
      const expense = await postIdempotent<{ id: string }>(`/treasury/petty-cash/funds/${expenseFund.id}/expenses`, { ...options, body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }) });
      await postIdempotent(`/treasury/petty-cash/expenses/${expense.id}/submit`, { ...options, body: JSON.stringify({}) });
      setExpenseFund(null); setExpenseForm({ number: "", description: "", merchant_name: "", receipt_number: "", amount: "", expense_account_code: "6590" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible enviar el vale a aprobación."); } finally { setSaving(false); }
  };
  const requestPettyCashReplenishment = async (fund: PettyCashFund) => {
    const amount = Number(fund.fixed_amount) - Number(fund.current_balance);
    if (amount <= 0) { setError("Este fondo ya está completamente repuesto."); return; }
    setSaving(true); setError(null);
    try {
      const number = `RC-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
      await postIdempotent(`/treasury/petty-cash/funds/${fund.id}/replenishments`, { ...options, body: JSON.stringify({ number, amount }) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible solicitar la reposición."); } finally { setSaving(false); }
  };
  const executePettyCashReplenishment = async (replenishment: PettyCashReplenishment) => {
    setSaving(true); setError(null);
    try {
      await postIdempotent(`/treasury/petty-cash/replenishments/${replenishment.id}/execute`, { ...options, body: JSON.stringify({}) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible ejecutar la reposición."); } finally { setSaving(false); }
  };
  const executeSupplierPayment = async (payment: Payment) => {
    setSaving(true); setError(null);
    try {
      await postIdempotent(`/payments/${payment.id}/execute`, { ...options, body: JSON.stringify({}) });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible ejecutar el pago aprobado."); } finally { setSaving(false); }
  };
  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentOpen || !selectedDocument) {
      setError("Selecciona un documento pendiente.");
      return;
    }
    const amount = Number(paymentForm.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > Number(selectedDocument.balance_amount)
    ) {
      setError(
        "El importe debe ser mayor a cero y no superar el saldo pendiente.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        number: paymentForm.number,
        payment_type: paymentOpen,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference || null,
        note: paymentForm.note || null,
        cash_account_id: paymentForm.cashAccountId,
        ...(paymentOpen === "receipt"
          ? {
              customer_id: (selectedDocument as Receivable).customer_id,
              allocations: [{ receivable_id: selectedDocument.id, amount }],
            }
          : {
              supplier_id: (selectedDocument as Payable).supplier_id,
              allocations: [{ payable_id: selectedDocument.id, amount }],
            }),
      };
      await postIdempotent<Payment>("/payments", {
        ...options,
        body: JSON.stringify(body),
      });
      setPaymentOpen(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar la operación.",
      );
    } finally {
      setSaving(false);
    }
  };
  const pendingDocuments =
    paymentOpen === "receipt"
      ? receivables.filter(
          (item) => item.status !== "paid" && Number(item.balance_amount) > 0,
        )
      : payables.filter(
          (item) => item.status !== "paid" && Number(item.balance_amount) > 0,
        );
  return (
    <section className="module-page">
      <div className="module-heading">
        <div>
          <button className="back-link" onClick={goBack}>
            <ChevronLeft size={16} /> Panel general
          </button>
          <p className="eyebrow">CONTROL FINANCIERO</p>
          <h1>Finanzas</h1>
          <p className="subtitle">
            Supervisa saldos pendientes y administra cuentas de caja y banco.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button finance-action"
            onClick={() => openPayment("payment")}
          >
            <ReceiptText size={16} /> Registrar pago
          </button>
          <button
            className="primary-button finance-action"
            onClick={() => openPayment("receipt")}
          >
            <Plus size={18} /> Registrar cobro
          </button>
        </div>
      </div>
      <section className="metric-grid finance-metrics">
        <article className="metric-card">
          <p>Por cobrar</p>
          <strong>{money.format(dueReceivable)}</strong>
          <span className="trend neutral">
            {receivables.length} documentos registrados
          </span>
        </article>
        <article className="metric-card">
          <p>Por pagar</p>
          <strong>{money.format(duePayable)}</strong>
          <span className="trend neutral">
            {payables.length} documentos registrados
          </span>
        </article>
        <article className="metric-card">
          <p>Movimientos registrados</p>
          <strong>{payments.length}</strong>
          <span className="trend positive">Cobros y pagos de la empresa</span>
        </article>
      </section>
      {error && !accountOpen && !paymentOpen && (
        <div className="module-error">
          {error}
          <button onClick={() => void load()}>Reintentar</button>
        </div>
      )}
      <section className="finance-grid">
        {loading ? (
          <article className="panel finance-panel">
            <div className="module-state">
              <LoaderCircle className="spin" size={22} /> Cargando saldos…
            </div>
          </article>
        ) : (
          <>
            <AccountTable
              title="Cuentas por cobrar"
              label="CLIENTE"
              rows={receivables}
              nameFor={customerName}
            />
            <AccountTable
              title="Cuentas por pagar"
              label="PROVEEDOR"
              rows={payables}
              nameFor={supplierName}
            />
          </>
        )}
      </section>
      <article className="panel treasury-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">TESORERÍA</p>
            <h2>Caja y bancos</h2>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setError(null);
              setAccountOpen(true);
            }}
          >
            Nueva cuenta
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="module-state compact">
            <WalletCards size={26} />
            <strong>Aún no hay cuentas de tesorería</strong>
            <span>Crea una cuenta para registrar cobros y pagos.</span>
          </div>
        ) : (
          <div className="treasury-cards">
            {accounts.map((account) => (
              <div key={account.id}>
                <span className="treasury-icon">
                  <Landmark size={18} />
                </span>
                <span>
                  <strong>{account.name}</strong>
                  <small>
                    {account.code} · {account.currency}
                  </small>
                </span>
                <span
                  className={`status-pill ${account.is_active ? "active" : "inactive"}`}
                >
                  {account.account_type === "bank" ? "Banco" : "Caja"}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
      <article className="panel treasury-panel">
        <div className="panel-header">
          <div>
            <p className="card-label">TESORERÍA CONTROLADA</p>
            <h2>Caja chica</h2>
          </div>
          <button className="text-button" onClick={() => { setError(null); setPettyCashOpen(true); }}>Constituir fondo</button>
        </div>
        {pettyCashFunds.length === 0 ? (
          <div className="module-state compact">
            <WalletCards size={26} />
            <strong>Aún no hay fondos de caja chica</strong>
            <span>Los fondos operan con vales, reposiciones, documentos y separación de funciones.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="finance-table">
              <thead><tr><th>FONDO</th><th>CUENTA</th><th>FIJO</th><th>SALDO</th><th>PENDIENTES</th><th>ESTADO</th><th></th></tr></thead>
              <tbody>{pettyCashFunds.map((fund) => <tr key={fund.id}>
                <td><strong>{fund.name}</strong><br /><small>{fund.code}</small></td>
                <td>{fund.cash_account_name}</td>
                <td>{money.format(Number(fund.fixed_amount))}</td>
                <td><strong>{money.format(Number(fund.current_balance))}</strong></td>
                <td>{Number(fund.pending_expenses) + Number(fund.pending_replenishments)}</td>
                <td><span className={`status-pill ${fund.status === "active" ? "active" : "inactive"}`}>{fund.status}</span></td>
                <td><button className="text-button" disabled={fund.status !== "active"} onClick={() => { setError(null); setExpenseFund(fund); }}>Nuevo vale</button><button className="text-button" disabled={saving || fund.status !== "active" || Number(fund.current_balance) >= Number(fund.fixed_amount)} onClick={() => void requestPettyCashReplenishment(fund)}>Reponer</button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </article>
      {approvedReplenishments.length > 0 && <article className="panel treasury-panel">
        <div className="panel-header"><div><p className="card-label">EJECUCIÓN PENDIENTE</p><h2>Reposiciones aprobadas</h2></div></div>
        <div className="table-wrap"><table className="finance-table"><thead><tr><th>FONDO</th><th>NÚMERO</th><th>IMPORTE</th><th></th></tr></thead><tbody>
          {approvedReplenishments.map((replenishment) => <tr key={replenishment.id}><td><strong>{replenishment.fund_name}</strong><br /><small>{replenishment.fund_code}</small></td><td>{replenishment.number}</td><td>{money.format(Number(replenishment.amount))}</td><td><button className="primary-button" disabled={saving} onClick={() => void executePettyCashReplenishment(replenishment)}>Ejecutar reposición</button></td></tr>)}
        </tbody></table></div>
      </article>}
      <PaymentTable
        payments={payments}
        customerName={customerName}
        supplierName={supplierName}
        saving={saving}
        onExecute={executeSupplierPayment}
      />
      {accountOpen && (
        <Modal
          title="Nueva cuenta"
          eyebrow="TESORERÍA"
          onClose={() => setAccountOpen(false)}
        >
          <form className="customer-form" onSubmit={saveAccount}>
            <div className="form-grid">
              <label>
                Código
                <input
                  required
                  value={accountForm.code}
                  onChange={(e) =>
                    setAccountForm((current) => ({
                      ...current,
                      code: e.target.value,
                    }))
                  }
                  placeholder="BAN-001"
                />
              </label>
              <label>
                Tipo
                <select
                  value={accountForm.account_type}
                  onChange={(e) =>
                    setAccountForm((current) => ({
                      ...current,
                      account_type: e.target.value,
                    }))
                  }
                >
                  <option value="bank">Banco</option>
                  <option value="cash">Caja</option>
                </select>
              </label>
            </div>
            <label>
              Nombre
              <input
                required
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
                placeholder="Cuenta principal"
              />
            </label>
            <label>
              Moneda
              <input
                required
                maxLength={3}
                value={accountForm.currency}
                onChange={(e) =>
                  setAccountForm((current) => ({
                    ...current,
                    currency: e.target.value.toUpperCase(),
                  }))
                }
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAccountOpen(false)}
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cuenta"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {pettyCashOpen && (
        <Modal title="Constituir caja chica" eyebrow="TESORERÍA CONTROLADA" onClose={() => setPettyCashOpen(false)}>
          <form className="customer-form" onSubmit={savePettyCashFund}>
            <div className="form-grid"><label>Código<input required value={pettyCashForm.code} onChange={(e) => setPettyCashForm((v) => ({ ...v, code: e.target.value }))} placeholder="CC-001" /></label><label>Fondo fijo<input required type="number" min="0.01" step="0.01" value={pettyCashForm.fixed_amount} onChange={(e) => setPettyCashForm((v) => ({ ...v, fixed_amount: e.target.value }))} /></label></div>
            <label>Nombre<input required value={pettyCashForm.name} onChange={(e) => setPettyCashForm((v) => ({ ...v, name: e.target.value }))} placeholder="Caja chica administrativa" /></label>
            <label>Cuenta de caja chica<select required value={pettyCashForm.cash_account_id} onChange={(e) => setPettyCashForm((v) => ({ ...v, cash_account_id: e.target.value }))}><option value="">Selecciona una caja</option>{accounts.filter((a) => a.account_type === "cash" && a.is_active).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
            <label>Cuenta que financia<select required value={pettyCashForm.funding_cash_account_id} onChange={(e) => setPettyCashForm((v) => ({ ...v, funding_cash_account_id: e.target.value }))}><option value="">Selecciona origen</option>{accounts.filter((a) => a.is_active && a.id !== pettyCashForm.cash_account_id).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></label>
            <p className="form-help">El usuario actual quedará como custodio. La constitución crea movimientos y un asiento contable.</p>
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPettyCashOpen(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Constituyendo…" : "Constituir fondo"}</button></div>
          </form>
        </Modal>
      )}
      {expenseFund && (
        <Modal title="Vale de caja chica" eyebrow={expenseFund.name} onClose={() => setExpenseFund(null)}>
          <form className="customer-form" onSubmit={savePettyCashExpense}>
            <div className="form-grid"><label>Número del vale<input required value={expenseForm.number} onChange={(e) => setExpenseForm((v) => ({ ...v, number: e.target.value }))} placeholder="VC-0001" /></label><label>Importe<input required type="number" min="0.01" max={expenseFund.current_balance} step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((v) => ({ ...v, amount: e.target.value }))} /></label></div>
            <label>Descripción<input required value={expenseForm.description} onChange={(e) => setExpenseForm((v) => ({ ...v, description: e.target.value }))} placeholder="Movilidad, suministros u otro gasto" /></label>
            <div className="form-grid"><label>Proveedor o comercio<input value={expenseForm.merchant_name} onChange={(e) => setExpenseForm((v) => ({ ...v, merchant_name: e.target.value }))} /></label><label>Comprobante<input value={expenseForm.receipt_number} onChange={(e) => setExpenseForm((v) => ({ ...v, receipt_number: e.target.value }))} /></label></div>
            <label>Cuenta de gasto<input required value={expenseForm.expense_account_code} onChange={(e) => setExpenseForm((v) => ({ ...v, expense_account_code: e.target.value }))} /></label>
            <p className="form-help">Al enviar, el vale quedará pendiente de aprobación. Aún no descuenta saldo ni contabiliza el gasto.</p>
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setExpenseFund(null)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Enviando…" : "Enviar a aprobación"}</button></div>
          </form>
        </Modal>
      )}
      {paymentOpen && (
        <Modal
          title={
            paymentOpen === "receipt" ? "Registrar cobro" : "Registrar pago"
          }
          eyebrow={
            paymentOpen === "receipt"
              ? "CUENTAS POR COBRAR"
              : "CUENTAS POR PAGAR"
          }
          onClose={() => setPaymentOpen(null)}
        >
          <form className="customer-form" onSubmit={savePayment}>
            <label>
              Documento pendiente
              <select
                required
                value={paymentForm.documentId}
                onChange={(e) => {
                  const document = (
                    paymentOpen === "receipt" ? receivables : payables
                  ).find((item) => item.id === e.target.value);
                  setPaymentForm((current) => ({
                    ...current,
                    documentId: e.target.value,
                    amount: document?.balance_amount ?? "",
                  }));
                }}
              >
                <option value="">Selecciona un documento</option>
                {pendingDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {paymentOpen === "receipt"
                      ? customerName((document as Receivable).customer_id)
                      : supplierName((document as Payable).supplier_id)}{" "}
                    · {money.format(Number(document.balance_amount))}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Cuenta de origen
                <select
                  required
                  value={paymentForm.cashAccountId}
                  onChange={(e) =>
                    setPaymentForm((current) => ({
                      ...current,
                      cashAccountId: e.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona una cuenta</option>
                  {accounts
                    .filter((account) => account.is_active)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currency}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Método
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((current) => ({
                      ...current,
                      method: e.target.value,
                    }))
                  }
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Número
                <input
                  required
                  value={paymentForm.number}
                  onChange={(e) =>
                    setPaymentForm((current) => ({
                      ...current,
                      number: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Importe
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedDocument?.balance_amount}
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((current) => ({
                      ...current,
                      amount: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label>
              Referencia
              <input
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    reference: e.target.value,
                  }))
                }
                placeholder="Folio bancario o referencia"
              />
            </label>
            <label>
              Nota
              <input
                value={paymentForm.note}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    note: e.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPaymentOpen(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={saving || !selectedDocument}
              >
                {saving
                  ? "Registrando…"
                  : paymentOpen === "receipt"
                    ? "Registrar cobro"
                    : "Registrar pago"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function AccountTable({
  title,
  label,
  rows,
  nameFor,
}: {
  title: string;
  label: string;
  rows: (Receivable | Payable)[];
  nameFor: (id: string) => string;
}) {
  return (
    <article className="panel finance-panel">
      <div className="panel-header">
        <div>
          <p className="card-label">CARTERA</p>
          <h2>{title}</h2>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="module-state compact">
          <Building2 size={24} />
          <span>Sin documentos pendientes.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="finance-table">
            <thead>
              <tr>
                <th>{label}</th>
                <th>ORIGINAL</th>
                <th>SALDO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {nameFor(
                      "customer_id" in row ? row.customer_id : row.supplier_id,
                    )}
                  </td>
                  <td>{money.format(Number(row.original_amount))}</td>
                  <td>
                    <strong>{money.format(Number(row.balance_amount))}</strong>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${row.status === "paid" ? "active" : "inactive"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
function PaymentTable({
  payments,
  customerName,
  supplierName,
  saving,
  onExecute,
}: {
  payments: Payment[];
  customerName: (id: string) => string;
  supplierName: (id: string) => string;
  saving: boolean;
  onExecute: (payment: Payment) => void;
}) {
  return (
    <article className="panel payments-panel">
      <div className="panel-header">
        <div>
          <p className="card-label">MOVIMIENTOS</p>
          <h2>Últimos cobros y pagos</h2>
        </div>
        <ReceiptText size={20} className="muted-icon" />
      </div>
      {payments.length === 0 ? (
        <div className="module-state compact">
          <ReceiptText size={24} />
          <span>Aún no se han registrado cobros o pagos.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="finance-table payments-table">
            <thead>
              <tr>
                <th>NÚMERO</th>
                <th>TIPO</th>
                <th>CONTRAPARTE</th>
                <th>MÉTODO</th>
                <th>IMPORTE</th>
                <th>ESTADO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 8).map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.number}</strong>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${payment.payment_type === "receipt" ? "active" : "inactive"}`}
                    >
                      {payment.payment_type === "receipt" ? "Cobro" : "Pago"}
                    </span>
                  </td>
                  <td>
                    {payment.customer_id
                      ? customerName(payment.customer_id)
                      : payment.supplier_id
                        ? supplierName(payment.supplier_id)
                        : "—"}
                  </td>
                  <td>{payment.method}</td>
                  <td>
                    <strong>{money.format(Number(payment.amount))}</strong>
                  </td>
                  <td><span className={`status-pill ${payment.status === "posted" ? "active" : "inactive"}`}>{payment.status === "submitted" ? "Pendiente aprobación" : payment.status === "approved" ? "Aprobado" : payment.status}</span></td>
                  <td>{payment.payment_type === "payment" && payment.status === "approved" && <button className="primary-button" disabled={saving} onClick={() => onExecute(payment)}>Ejecutar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
function Modal({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-layer">
      <section
        className="customer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
