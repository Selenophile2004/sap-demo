import { financeDb, hrDb, inventoryDb, receivablesDb, salesDb } from "../db";
import type { AnalyticsSnapshot } from "./presentation";

export function gatherAnalyticsSnapshot(): AnalyticsSnapshot {
  const salesMonthly = salesDb().prepare(`
    SELECT substr(invoice_date_jalali, 1, 7) AS label,
           SUM(net_amount) AS value,
           COUNT(DISTINCT invoice_no) AS invoiceCount
    FROM sales_lines WHERE record_source = 'نهایی'
    GROUP BY label ORDER BY label DESC LIMIT 6
  `).all() as { label: string; value: number; invoiceCount: number }[];
  salesMonthly.reverse();
  const currentSales = salesMonthly.at(-1) ?? { label: "—", value: 0, invoiceCount: 0 };
  const previousSales = salesMonthly.at(-2) ?? { label: "—", value: 0, invoiceCount: 0 };

  const receivables = receivablesDb().prepare(`
    SELECT SUM(amount_unpaid) AS unpaid,
           SUM(invoice_net_amount) AS invoiced,
           SUM(amount_paid) AS paid
    FROM receivable_invoices
  `).get() as { unpaid: number | null; invoiced: number | null; paid: number | null };

  const finance = financeDb().prepare(`
    SELECT cash_balance_rial, roi_pct, budget_target_rial, budget_actual_rial
    FROM finance_monthly ORDER BY month_seq DESC LIMIT 1
  `).get() as { cash_balance_rial: number; roi_pct: number; budget_target_rial: number; budget_actual_rial: number } | undefined;

  const hrRows = hrDb().prepare(`
    SELECT year_jalali || '/' || printf('%02d', month_num) AS label, headcount AS value
    FROM headcount_by_month ORDER BY year_jalali DESC, month_num DESC LIMIT 12
  `).all() as { label: string; value: number }[];
  hrRows.reverse();

  const inventory = inventoryDb().prepare(`
    SELECT SUM(sellable_qty) AS sellable, SUM(reserved_qty) AS reserved FROM inventory_lines
  `).get() as { sellable: number | null; reserved: number | null };

  const invoiced = receivables.invoiced ?? 0;
  return {
    generatedAt: new Date().toISOString(),
    sales: {
      netAmount: currentSales.value ?? 0,
      previousNetAmount: previousSales.value ?? 0,
      invoiceCount: currentSales.invoiceCount ?? 0,
      monthly: salesMonthly.map(({ label, value }) => ({ label, value: value ?? 0 })),
    },
    receivables: {
      unpaidAmount: receivables.unpaid ?? 0,
      collectionRatePct: invoiced > 0 ? ((receivables.paid ?? 0) / invoiced) * 100 : 0,
    },
    finance: {
      cashBalance: finance?.cash_balance_rial ?? 0,
      roiPct: finance?.roi_pct ?? 0,
      budgetAchievementPct: (finance?.budget_target_rial ?? 0) > 0 ? ((finance?.budget_actual_rial ?? 0) / finance!.budget_target_rial) * 100 : 0,
    },
    hr: { headcount: hrRows.at(-1)?.value ?? 0, monthly: hrRows },
    inventory: { sellableQty: inventory.sellable ?? 0, reservedQty: inventory.reserved ?? 0 },
  };
}
