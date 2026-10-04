import ExcelJS from "exceljs";
import type { AnalyticsSnapshot } from "../analytics/presentation";
import type { DataHealthReport } from "../analytics/dataHealth";

const purple = "7900DD";
const dark = "17121F";
const light = "F5F1FA";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character] ?? character));
}

export async function buildExecutiveWorkbook(snapshot: AnalyticsSnapshot, health: DataHealthReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mindway Management Demo";
  workbook.created = new Date(snapshot.generatedAt);
  const summary = workbook.addWorksheet("خلاصه مدیریتی", { views: [{ rightToLeft: true }] });
  summary.columns = [{ width: 30 }, { width: 24 }, { width: 42 }];
  summary.mergeCells("A1:C1");
  summary.getCell("A1").value = "خروجی مدیریتی یکپارچه";
  summary.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${purple}` } };
  summary.getCell("A2").value = "زمان تهیه";
  summary.getCell("B2").value = new Date(snapshot.generatedAt).toLocaleString("fa-IR");
  const rows: Array<[string, number | string, string]> = [
    ["فروش خالص", snapshot.sales.netAmount, "ریال"],
    ["تعداد فاکتور", snapshot.sales.invoiceCount, "عدد"],
    ["مطالبات باز", snapshot.receivables.unpaidAmount, "ریال"],
    ["نرخ وصول", snapshot.receivables.collectionRatePct, "درصد"],
    ["مانده نقد", snapshot.finance.cashBalance, "ریال"],
    ["بازده سرمایه", snapshot.finance.roiPct, "درصد"],
    ["تحقق بودجه", snapshot.finance.budgetAchievementPct, "درصد"],
    ["تعداد کارکنان", snapshot.hr.headcount, "نفر"],
    ["موجودی قابل فروش", snapshot.inventory.sellableQty, "عدد"],
    ["امتیاز سلامت داده", health.score, "از ۱۰۰"],
    ["وضعیت سلامت داده", health.status === "healthy" ? "سالم" : health.status === "warning" ? "نیازمند توجه" : "بحرانی", ""],
  ];
  summary.addRow([]);
  const header = summary.addRow(["شاخص", "مقدار", "واحد"]);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${dark}` } };
  });
  rows.forEach((row) => summary.addRow(row));
  summary.getColumn(2).numFmt = "#,##0.0";
  summary.eachRow((row, index) => {
    row.alignment = { vertical: "middle", horizontal: "right" };
    if (index > 4 && index % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${light}` } }; });
  });

  const dataHealth = workbook.addWorksheet("سلامت داده", { views: [{ rightToLeft: true }] });
  dataHealth.columns = [
    { header: "مجموعه داده", key: "label", width: 24 },
    { header: "منبع", key: "source", width: 34 },
    { header: "تعداد رکورد", key: "rowCount", width: 18 },
    { header: "امتیاز", key: "score", width: 14 },
    { header: "وضعیت", key: "status", width: 16 },
    { header: "آخرین دوره", key: "latestPeriod", width: 18 },
    { header: "ساعت از بروزرسانی", key: "freshnessHours", width: 22 },
  ];
  health.datasets.forEach((dataset) => dataHealth.addRow({
    ...dataset,
    status: dataset.status === "healthy" ? "سالم" : dataset.status === "warning" ? "نیازمند توجه" : "بحرانی",
  }));
  dataHealth.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${purple}` } };
  });
  dataHealth.autoFilter = { from: "A1", to: "G1" };
  dataHealth.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
}

export function buildExecutiveHtml(snapshot: AnalyticsSnapshot, health: DataHealthReport, companyName: string): string {
  const company = escapeHtml(companyName);
  const generatedAt = escapeHtml(new Date(snapshot.generatedAt).toLocaleString("fa-IR"));
  const cards = [
    ["فروش خالص", formatNumber(snapshot.sales.netAmount), "ریال"],
    ["مطالبات باز", formatNumber(snapshot.receivables.unpaidAmount), "ریال"],
    ["نرخ وصول", formatNumber(snapshot.receivables.collectionRatePct), "درصد"],
    ["مانده نقد", formatNumber(snapshot.finance.cashBalance), "ریال"],
    ["تحقق بودجه", formatNumber(snapshot.finance.budgetAchievementPct), "درصد"],
    [`سلامت داده — ${health.status === "healthy" ? "سالم" : health.status === "warning" ? "نیازمند توجه" : "بحرانی"}`, formatNumber(health.score), "از ۱۰۰"],
  ].map(([label, value, unit]) => `<article class="card"><span>${label}</span><strong>${value}</strong><small>${unit}</small></article>`).join("");
  const rows = health.datasets.map((dataset) => `<tr><td>${escapeHtml(dataset.label)}</td><td>${formatNumber(dataset.rowCount)}</td><td>${formatNumber(dataset.score)}</td><td>${dataset.status === "healthy" ? "سالم" : dataset.status === "warning" ? "نیازمند توجه" : "بحرانی"}</td><td>${escapeHtml(dataset.latestPeriod ?? "—")}</td></tr>`).join("");
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>گزارش مدیریتی ${company}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f3f0f7;color:#21182a;font-family:Tahoma,Arial,sans-serif;line-height:1.8}main{max-width:1080px;margin:32px auto;background:white;padding:40px;border-radius:22px;box-shadow:0 12px 40px #32124b1f}header{border-bottom:4px solid #7900dd;padding-bottom:18px;margin-bottom:28px}h1{margin:0;color:#4b008a}p{margin:.25rem 0;color:#665d6e}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{border:1px solid #e1d6ea;border-radius:14px;padding:18px;background:linear-gradient(135deg,#fff,#faf7fd)}.card span,.card small{display:block;color:#706478}.card strong{display:block;font-size:1.55rem;color:#7900dd;margin:.35rem 0}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{text-align:right;border-bottom:1px solid #e8dfef;padding:11px}th{background:#24172e;color:white}.note{margin-top:24px;padding:14px;border-right:4px solid #7900dd;background:#f6effc}@media(max-width:700px){main{margin:0;padding:20px;border-radius:0}.cards{grid-template-columns:1fr 1fr}}@media print{body{background:white}main{box-shadow:none;margin:0;max-width:none}.card{break-inside:avoid}}
  </style></head><body><main><header><h1>گزارش مدیریتی ${company}</h1><p>تصویر یکپارچه عملکرد و اعتمادپذیری داده</p><p>زمان snapshot: ${generatedAt}</p></header><section class="cards">${cards}</section><h2>وضعیت منابع داده</h2><table><thead><tr><th>مجموعه</th><th>رکورد</th><th>امتیاز</th><th>وضعیت</th><th>آخرین دوره</th></tr></thead><tbody>${rows}</tbody></table><div class="note">این گزارش یک snapshot از داده تأییدشده است. برای تصمیم نهایی، فرمول شاخص‌ها و هشدارهای مرکز سلامت داده نیز بررسی شود.</div></main></body></html>`;
}
