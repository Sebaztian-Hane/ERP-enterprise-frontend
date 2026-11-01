export type CashFlowAccount = { id: string; code: string; name: string; currency: string; balance: string; month_inflow: string; month_outflow: string };
export type AgingItem = { id: string; kind: "receivable" | "payable"; due_date: string | null; balance_amount: string; overdue_days: number; aging_status: string };

export function cashTotalsByCurrency(accounts: CashFlowAccount[]) {
  const groups = new Map<string, { currency: string; balance: number; inflow: number; outflow: number }>();
  for (const account of accounts) {
    const group = groups.get(account.currency) ?? { currency: account.currency, balance: 0, inflow: 0, outflow: 0 };
    group.balance += Number(account.balance);
    group.inflow += Number(account.month_inflow);
    group.outflow += Number(account.month_outflow);
    groups.set(account.currency, group);
  }
  return [...groups.values()];
}

export function agingBuckets(items: AgingItem[], kind: AgingItem["kind"]) {
  const buckets = [
    { label: "Por vencer / sin fecha", amount: 0 }, { label: "1–30 días", amount: 0 },
    { label: "31–60 días", amount: 0 }, { label: "61–90 días", amount: 0 }, { label: "Más de 90 días", amount: 0 },
  ];
  for (const item of items.filter((entry) => entry.kind === kind)) {
    const days = Number(item.overdue_days);
    const index = !item.due_date || days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    buckets[index].amount += Number(item.balance_amount);
  }
  return buckets;
}

export const operationalMoney = (value: string | number, currency = "PEN") => new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value));
