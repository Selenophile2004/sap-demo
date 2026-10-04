import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { buildExecutiveHtml, buildExecutiveWorkbook } from "./executiveReport";
import type { AnalyticsSnapshot } from "../analytics/presentation";
import type { DataHealthReport } from "../analytics/dataHealth";

const snapshot: AnalyticsSnapshot = {
  generatedAt: "2026-10-04T10:00:00.000Z",
  sales: { netAmount: 1_000, previousNetAmount: 900, invoiceCount: 10, monthly: [] },
  receivables: { unpaidAmount: 300, collectionRatePct: 70 },
  finance: { cashBalance: 500, roiPct: 12, budgetAchievementPct: 90 },
  hr: { headcount: 20, monthly: [] },
  inventory: { sellableQty: 100, reservedQty: 25 },
};
const health: DataHealthReport = {
  generatedAt: snapshot.generatedAt,
  score: 92,
  status: "healthy",
  totalRows: 100,
  staleDatasetCount: 0,
  datasets: [],
};

describe("executive output", () => {
  it("creates an Excel workbook with summary and data-health sheets", async () => {
    const buffer = await buildExecutiveWorkbook(snapshot, health);
    const workbook = new ExcelJS.Workbook();
    // ExcelJS types هنوز Buffer جنریک Node 22 را نمی‌شناسند؛ داده در زمان اجرا
    // همان Buffer معتبر است و این cast فقط شکاف تایپی کتابخانه را پوشش می‌دهد.
    await workbook.xlsx.load(buffer as never);
    assert.ok(workbook.getWorksheet("خلاصه مدیریتی"));
    assert.ok(workbook.getWorksheet("سلامت داده"));
  });

  it("creates a printable RTL report and escapes company labels", () => {
    const html = buildExecutiveHtml(snapshot, health, "<شرکت>");
    assert.match(html, /dir="rtl"/);
    assert.match(html, /&lt;شرکت&gt;/);
    assert.doesNotMatch(html, /<شرکت>/);
  });
});
