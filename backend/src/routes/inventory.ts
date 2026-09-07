import { Router } from "express";
import { j2d, d2j } from "jalaali-js";
import { inventoryDb, salesDb } from "../db";

export const inventoryRouter = Router();

/**
 * صفحه‌ی «رسوب انبار» — مستقل از فایل پاور بی‌آی ساخته شده (چون آن گزارش به
 * جدول‌های Target Tolid/انبار وابسته بود که در Data/ نداریم)، اما همان منطق
 * دسته‌بندی «روزهای پوشش موجودی» (DIO) را با داده‌های خودمان بازسازی می‌کند:
 * موجودی فعلی از Data/انبار.xlsx + سرعت فروش ۳۰ روز اخیر از sales.db (هر ۴ منبع؛
 * محدودکردن این پنجره‌ی ۳۰روزه به فقط «نهایی» باعث می‌شد میانگین فروش روزانه
 * همیشه دست‌کم‌گرفته شود — چون ۱۰ تا ۱۵ روز آخر همین بازه معمولاً هنوز نهایی
 * نشده‌اند — و در نتیجه DIO محاسبه‌شده به‌طور سیستماتیک بیشتر از واقعیت نشان
 * داده می‌شد) + سایز کارتن از همان نگاشت Kala که در sales_etl.py ذخیره شده.
 *
 * آستانه‌های دسته‌بندی (همان آستانه‌های پاور بی‌آی):
 *   موجودی=۰ → «بدون موجودی»
 *   بدون فروش در ۳۰ روز اخیر → «رسوب (بدون فروش)»
 *   DIO<=7 → «نیاز به شارژ فوری» | <=15 → «شارژ به‌زودی» | <=30 → «مناسب»
 *   <=60 → «بالا» | <=90 → «خیلی بالا» | else → «رسوب (بیش از ۳ ماه)»
 */

type StockStatus =
  | "بدون موجودی"
  | "رسوب (بدون فروش)"
  | "نیاز به شارژ فوری"
  | "شارژ به‌زودی"
  | "موجودی مناسب"
  | "موجودی بالا"
  | "موجودی خیلی بالا"
  | "رسوب (بیش از ۳ ماه)";

function classify(sellableQty: number, avgDailySales: number): { status: StockStatus; dio: number | null } {
  if (sellableQty <= 0) return { status: "بدون موجودی", dio: null };
  if (avgDailySales <= 0) return { status: "رسوب (بدون فروش)", dio: null };
  const dio = sellableQty / avgDailySales;
  if (dio <= 7) return { status: "نیاز به شارژ فوری", dio };
  if (dio <= 15) return { status: "شارژ به‌زودی", dio };
  if (dio <= 30) return { status: "موجودی مناسب", dio };
  if (dio <= 60) return { status: "موجودی بالا", dio };
  if (dio <= 90) return { status: "موجودی خیلی بالا", dio };
  return { status: "رسوب (بیش از ۳ ماه)", dio };
}

function buildItemAnalysis() {
  const idb = inventoryDb();
  const sdb = salesDb();

  const inventoryByItem = idb
    .prepare(
      `SELECT item_code, MAX(item_name) AS item_name, SUM(sellable_qty) AS sellableQty
       FROM inventory_lines GROUP BY item_code`
    )
    .all() as { item_code: string; item_name: string; sellableQty: number }[];

  const maxDateRow = sdb.prepare("SELECT MAX(invoice_date_jalali) AS maxDate FROM sales_lines").get() as {
    maxDate: string | null;
  };
  const salesByItem = maxDateRow.maxDate
    ? (sdb
        .prepare(
          `SELECT item_code, SUM(qty_normalized_count_signed) AS qty
           FROM sales_lines
           WHERE invoice_date_jalali >= @since AND invoice_date_jalali <= @until
           GROUP BY item_code`
        )
        .all({ since: shiftDateBack(maxDateRow.maxDate, 30), until: maxDateRow.maxDate }) as {
        item_code: string;
        qty: number;
      }[])
    : [];
  const salesMap = new Map(salesByItem.map((r) => [r.item_code, r.qty]));

  const cartonRows = sdb
    .prepare(`SELECT DISTINCT item_code, carton_size FROM sales_lines WHERE carton_size IS NOT NULL`)
    .all() as { item_code: string; carton_size: number }[];
  const cartonMap = new Map(cartonRows.map((r) => [r.item_code, r.carton_size]));

  const avgPriceRows = sdb
    .prepare(
      `SELECT item_code, SUM(net_amount) AS amount, SUM(qty_normalized_count_signed) AS qty
       FROM sales_lines GROUP BY item_code`
    )
    .all() as { item_code: string; amount: number; qty: number }[];
  const avgPriceMap = new Map(avgPriceRows.filter((r) => r.qty > 0).map((r) => [r.item_code, r.amount / r.qty]));

  return inventoryByItem.map((r) => {
    const avgDailySales = (salesMap.get(r.item_code) ?? 0) / 30;
    const { status, dio } = classify(r.sellableQty, avgDailySales);
    const cartonSize = cartonMap.get(r.item_code);
    const avgPrice = avgPriceMap.get(r.item_code) ?? 0;
    return {
      itemCode: r.item_code,
      itemName: r.item_name,
      sellableQty: r.sellableQty,
      sellableCartons: cartonSize ? r.sellableQty / cartonSize : null,
      avgDailySales,
      dio,
      status,
      estimatedValue: r.sellableQty * avgPrice,
    };
  });
}

function shiftDateBack(jalaliDate: string, days: number): string {
  const [y, m, d] = jalaliDate.split("/").map(Number);
  const jdn = j2d(y, m, d) - days;
  const { jy, jm, jd } = d2j(jdn);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

inventoryRouter.get("/summary", (_req, res) => {
  const items = buildItemAnalysis();
  const byStatus = new Map<string, { count: number; estimatedValue: number }>();
  for (const it of items) {
    const e = byStatus.get(it.status) ?? { count: 0, estimatedValue: 0 };
    e.count += 1;
    e.estimatedValue += it.estimatedValue;
    byStatus.set(it.status, e);
  }

  const idb = inventoryDb();
  const byWarehouse = idb
    .prepare(
      `SELECT warehouse_name, COUNT(DISTINCT item_code) AS itemCount, SUM(sellable_qty) AS totalQty
       FROM inventory_lines WHERE sellable_qty > 0 GROUP BY warehouse_name ORDER BY totalQty DESC`
    )
    .all();

  const stagnant = [...items]
    .filter((i) => i.status === "رسوب (بیش از ۳ ماه)" || i.status === "رسوب (بدون فروش)")
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 20);

  const urgentRecharge = [...items]
    .filter((i) => i.status === "نیاز به شارژ فوری")
    .sort((a, b) => (b.avgDailySales ?? 0) - (a.avgDailySales ?? 0))
    .slice(0, 20);

  res.json({
    totalSkus: items.length,
    totalEstimatedValue: items.reduce((s, i) => s + i.estimatedValue, 0),
    byStatus: Array.from(byStatus.entries()).map(([status, v]) => ({ status, ...v })),
    byWarehouse,
    stagnant,
    urgentRecharge,
  });
});

inventoryRouter.get("/items", (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.toLowerCase() : undefined;
  let items = buildItemAnalysis();
  if (search) {
    items = items.filter((i) => i.itemName.toLowerCase().includes(search) || i.itemCode.includes(search));
  }
  res.json(items.sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 200));
});
