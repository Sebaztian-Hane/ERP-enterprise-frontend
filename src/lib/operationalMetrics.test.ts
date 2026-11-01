import { describe, expect, it } from "vitest";
import { agingBuckets, cashTotalsByCurrency, type AgingItem } from "./operationalMetrics";

describe("operational financial reports", () => {
  it("never adds balances of different currencies together", () => {
    const totals = cashTotalsByCurrency([
      { id: "1", code: "PEN-1", name: "Caja", currency: "PEN", balance: "100", month_inflow: "120", month_outflow: "20" },
      { id: "2", code: "USD-1", name: "Banco USD", currency: "USD", balance: "50", month_inflow: "60", month_outflow: "10" },
      { id: "3", code: "PEN-2", name: "Banco PEN", currency: "PEN", balance: "200", month_inflow: "230", month_outflow: "30" },
    ]);
    expect(totals).toEqual([{ currency: "PEN", balance: 300, inflow: 350, outflow: 50 }, { currency: "USD", balance: 50, inflow: 60, outflow: 10 }]);
  });
  it("separates receivables from payables and handles aging boundaries", () => {
    const items: AgingItem[] = [0, 1, 30, 31, 60, 61, 90, 91].map((days) => ({ id: String(days), kind: "receivable", due_date: "2026-01-01", balance_amount: "10", overdue_days: days, aging_status: days ? "overdue" : "current" }));
    items.push({ ...items[0], id: "payable", kind: "payable", balance_amount: "999" });
    expect(agingBuckets(items, "receivable").map((bucket) => bucket.amount)).toEqual([10, 20, 20, 20, 10]);
    expect(agingBuckets(items, "payable")[0].amount).toBe(999);
  });
});
