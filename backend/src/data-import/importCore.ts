export type DatasetId = "sales" | "inventory" | "finance";

export interface ImportInput {
  datasetId: DatasetId;
  fileName: string;
  content: string;
}

export interface ImportValidationError {
  row: number;
  field: string;
  code: "required" | "invalid" | "duplicate";
  message: string;
}

export interface PreparedImport {
  datasetId: DatasetId;
  fileName: string;
  headers: string[];
  validRows: Record<string, string | number | null>[];
  errors: ImportValidationError[];
  totalRows: number;
  duplicateRows: number;
}

const HEADER_ALIASES: Record<string, string> = {
  "شماره فاکتور": "invoice_no",
  "تاریخ فاکتور": "invoice_date_jalali",
  "کد کالا": "item_code",
  "نام کالا": "item_name",
  "کد مشتری": "customer_code",
  "نام مشتری": "customer_name",
  "بازاریاب": "visitor_name",
  "مرکز فروش": "sales_center",
  "تعداد": "qty",
  "قیمت واحد": "unit_price",
  "تخفیف": "discount_amount",
  "استان": "province",
  "کد انبار": "warehouse_code",
  "نام انبار": "warehouse_name",
  "مرکز هزینه": "cost_center",
  "موجودی": "on_hand_qty",
  "رزرو": "reserved_qty",
  "سال": "year_jalali",
  "ماه": "month_num",
  "موجودی نقد": "cash_balance_rial",
  "بودجه هدف": "budget_target_rial",
  "بودجه واقعی": "budget_actual_rial",
  "نرخ بازگشت سرمایه": "roi_pct",
};

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeHeader(value: string): string {
  const clean = value.replace(/^\uFEFF/, "").trim();
  return HEADER_ALIASES[clean] ?? clean.toLowerCase().replace(/[\s-]+/g, "_");
}

/** RFC-4180-compatible enough for spreadsheet exports, including quoted commas and newlines. */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function numberValue(value: string): number | null {
  const normalized = normalizeDigits(value).replace(/[٬,\s]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidJalaliDate(value: string): boolean {
  const normalized = normalizeDigits(value).replace(/-/g, "/");
  const match = /^(13|14)\d{2}\/(0[1-9]|1[0-2])\/([0-2]\d|3[01])$/.exec(normalized);
  if (!match) return false;
  const month = Number(normalized.slice(5, 7));
  const day = Number(normalized.slice(8, 10));
  if (day < 1) return false;
  return month <= 6 ? day <= 31 : month <= 11 ? day <= 30 : day <= 30;
}

const SALES_REQUIRED = [
  "invoice_no",
  "invoice_date_jalali",
  "item_code",
  "item_name",
  "customer_code",
  "customer_name",
  "visitor_name",
  "sales_center",
  "qty",
  "unit_price",
] as const;

function prepareSalesRow(raw: Record<string, string>, rowNumber: number): {
  row: Record<string, string | number | null> | null;
  errors: ImportValidationError[];
  key: string;
} {
  const errors: ImportValidationError[] = [];
  for (const field of SALES_REQUIRED) {
    if (!raw[field]?.trim()) {
      errors.push({ row: rowNumber, field, code: "required", message: `مقدار ${field} الزامی است.` });
    }
  }

  const qty = numberValue(raw.qty ?? "");
  const unitPrice = numberValue(raw.unit_price ?? "");
  const discount = numberValue(raw.discount_amount ?? "") ?? 0;
  if (qty === null || qty < 0) {
    errors.push({ row: rowNumber, field: "qty", code: "invalid", message: "تعداد باید عددی نامنفی باشد." });
  }
  if (unitPrice === null || unitPrice < 0) {
    errors.push({ row: rowNumber, field: "unit_price", code: "invalid", message: "قیمت واحد باید عددی نامنفی باشد." });
  }
  if (!isValidJalaliDate(raw.invoice_date_jalali ?? "")) {
    errors.push({ row: rowNumber, field: "invoice_date_jalali", code: "invalid", message: "تاریخ شمسی معتبر نیست." });
  }

  const key = `${raw.invoice_no ?? ""}|${raw.item_code ?? ""}`;
  if (errors.length > 0 || qty === null || unitPrice === null) return { row: null, errors, key };
  const amount = qty * unitPrice;
  const netAmount = amount - discount;
  return {
    key,
    errors,
    row: {
      record_source: "نهایی",
      invoice_type: "فروش",
      item_code: raw.item_code.trim(),
      item_name: raw.item_name.trim(),
      unit_raw: "عدد",
      qty_raw: qty,
      sales_center: raw.sales_center.trim(),
      customer_code: raw.customer_code.trim(),
      customer_name: raw.customer_name.trim(),
      canonical_customer_code: raw.customer_code.trim(),
      visitor_name: raw.visitor_name.trim(),
      invoice_no: raw.invoice_no.trim(),
      invoice_date_jalali: normalizeDigits(raw.invoice_date_jalali).replace(/-/g, "/"),
      erp_base_unit_UNRELIABLE: null,
      erp_base_qty_UNRELIABLE: null,
      erp_base_unit_price_UNRELIABLE: null,
      unit_price: unitPrice,
      amount,
      vat_amount: 0,
      discount_amount: discount,
      sign: 1,
      net_amount: netAmount,
      unit_family: "count",
      unit_conversion_ratio: 1,
      qty_normalized_count: qty,
      qty_normalized_kg: 0,
      qty_normalized_count_signed: qty,
      qty_normalized_kg_signed: 0,
      carton_size: null,
      qty_normalized_carton_signed: null,
      item_group: raw.item_group?.trim() || null,
      is_active_basket: 1,
      province: raw.province?.trim() || null,
    },
  };
}

const INVENTORY_REQUIRED = ["item_code", "item_name", "warehouse_code", "warehouse_name", "on_hand_qty", "reserved_qty"] as const;

function prepareInventoryRow(raw: Record<string, string>, rowNumber: number) {
  const errors: ImportValidationError[] = [];
  for (const field of INVENTORY_REQUIRED) {
    if (!raw[field]?.trim()) errors.push({ row: rowNumber, field, code: "required", message: `مقدار ${field} الزامی است.` });
  }
  const onHand = numberValue(raw.on_hand_qty ?? "");
  const reserved = numberValue(raw.reserved_qty ?? "");
  if (onHand === null || onHand < 0) errors.push({ row: rowNumber, field: "on_hand_qty", code: "invalid", message: "موجودی باید عددی نامنفی باشد." });
  if (reserved === null || reserved < 0) errors.push({ row: rowNumber, field: "reserved_qty", code: "invalid", message: "رزرو باید عددی نامنفی باشد." });
  const key = `${raw.item_code ?? ""}|${raw.warehouse_code ?? ""}`;
  if (errors.length > 0 || onHand === null || reserved === null) return { row: null, errors, key };
  return {
    key,
    errors,
    row: {
      item_code: raw.item_code.trim(),
      item_name: raw.item_name.trim(),
      cost_center: raw.cost_center?.trim() || null,
      warehouse_code: raw.warehouse_code.trim(),
      warehouse_name: raw.warehouse_name.trim(),
      on_hand_qty: onHand,
      reserved_qty: reserved,
      sellable_qty: Math.max(0, onHand - reserved),
    } as Record<string, string | number | null>,
  };
}

const PERSIAN_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const FINANCE_REQUIRED = ["year_jalali", "month_num", "cash_balance_rial", "budget_target_rial", "budget_actual_rial", "roi_pct"] as const;

function prepareFinanceRow(raw: Record<string, string>, rowNumber: number) {
  const errors: ImportValidationError[] = [];
  for (const field of FINANCE_REQUIRED) {
    if (!raw[field]?.trim()) errors.push({ row: rowNumber, field, code: "required", message: `مقدار ${field} الزامی است.` });
  }
  const year = numberValue(raw.year_jalali ?? "");
  const month = numberValue(raw.month_num ?? "");
  const cash = numberValue(raw.cash_balance_rial ?? "");
  const budgetTarget = numberValue(raw.budget_target_rial ?? "");
  const budgetActual = numberValue(raw.budget_actual_rial ?? "");
  const roi = numberValue(raw.roi_pct ?? "");
  if (year === null || year < 1300 || year > 1500) errors.push({ row: rowNumber, field: "year_jalali", code: "invalid", message: "سال شمسی معتبر نیست." });
  if (month === null || !Number.isInteger(month) || month < 1 || month > 12) errors.push({ row: rowNumber, field: "month_num", code: "invalid", message: "ماه باید عددی بین ۱ تا ۱۲ باشد." });
  for (const [field, value] of [["cash_balance_rial", cash], ["budget_target_rial", budgetTarget], ["budget_actual_rial", budgetActual], ["roi_pct", roi]] as const) {
    if (value === null) errors.push({ row: rowNumber, field, code: "invalid", message: `${field} باید عددی باشد.` });
  }
  const key = `${year ?? ""}|${month ?? ""}`;
  if (errors.length > 0 || year === null || month === null || cash === null || budgetTarget === null || budgetActual === null || roi === null) return { row: null, errors, key };
  return {
    key,
    errors,
    row: {
      year_jalali: year,
      month_num: month,
      month_name: PERSIAN_MONTHS[month - 1],
      month_seq: year * 12 + month,
      total_assets_rial: numberValue(raw.total_assets_rial ?? ""),
      total_liabilities_rial: numberValue(raw.total_liabilities_rial ?? ""),
      cash_balance_rial: cash,
      company_value_rial: numberValue(raw.company_value_rial ?? ""),
      budget_target_rial: budgetTarget,
      budget_actual_rial: budgetActual,
      roi_pct: roi,
    } as Record<string, string | number | null>,
  };
}

export function prepareImport(input: ImportInput): PreparedImport {
  const parsed = parseCsv(input.content);
  if (parsed.length === 0) {
    return {
      datasetId: input.datasetId,
      fileName: input.fileName,
      headers: [],
      validRows: [],
      errors: [{ row: 1, field: "file", code: "required", message: "فایل خالی است." }],
      totalRows: 0,
      duplicateRows: 0,
    };
  }
  const headers = parsed[0].map(normalizeHeader);
  const validRows: Record<string, string | number | null>[] = [];
  const errors: ImportValidationError[] = [];
  const keys = new Set<string>();
  let duplicateRows = 0;

  parsed.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2;
    const raw = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
    const prepared = input.datasetId === "sales"
      ? prepareSalesRow(raw, rowNumber)
      : input.datasetId === "inventory"
        ? prepareInventoryRow(raw, rowNumber)
        : prepareFinanceRow(raw, rowNumber);
    errors.push(...prepared.errors);
    if (!prepared.row) return;
    if (keys.has(prepared.key)) {
      duplicateRows += 1;
      errors.push({ row: rowNumber, field: "invoice_no", code: "duplicate", message: "این ردیف در همین فایل تکراری است." });
      return;
    }
    keys.add(prepared.key);
    validRows.push(prepared.row);
  });

  return { datasetId: input.datasetId, fileName: input.fileName, headers, validRows, errors, totalRows: parsed.length - 1, duplicateRows };
}
