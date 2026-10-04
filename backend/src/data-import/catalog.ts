import type { DatasetId } from "./importCore";

export interface DatasetDescriptor {
  id: DatasetId;
  title: string;
  description: string;
  targetTable: string;
  acceptedFormats: string[];
  requiredColumns: { key: string; label: string }[];
  templateCsv: string;
}

export const DATASET_CATALOG: readonly DatasetDescriptor[] = Object.freeze([
  {
    id: "sales",
    title: "فروش و فاکتورها",
    description: "افزودن یا اصلاح ردیف‌های فروش بر اساس شماره فاکتور و کد کالا",
    targetTable: "sales_lines",
    acceptedFormats: ["csv", "xlsx"],
    requiredColumns: [
      ["invoice_no", "شماره فاکتور"], ["invoice_date_jalali", "تاریخ شمسی"], ["item_code", "کد کالا"],
      ["item_name", "نام کالا"], ["customer_code", "کد مشتری"], ["customer_name", "نام مشتری"],
      ["visitor_name", "بازاریاب"], ["sales_center", "مرکز فروش"], ["qty", "تعداد"], ["unit_price", "قیمت واحد"],
    ].map(([key, label]) => ({ key, label })),
    templateCsv: "invoice_no,invoice_date_jalali,item_code,item_name,customer_code,customer_name,visitor_name,sales_center,qty,unit_price,discount_amount,province\nINV-DEMO-001,1405/07/12,ITEM-001,محصول نمونه,CUST-001,مشتری نمونه,بازاریاب نمونه,مرکز تهران,10,250000,0,تهران\n",
  },
  {
    id: "inventory",
    title: "موجودی انبار",
    description: "به‌روزرسانی موجودی بر اساس کد کالا و کد انبار",
    targetTable: "inventory_lines",
    acceptedFormats: ["csv", "xlsx"],
    requiredColumns: [
      ["item_code", "کد کالا"], ["item_name", "نام کالا"], ["warehouse_code", "کد انبار"],
      ["warehouse_name", "نام انبار"], ["on_hand_qty", "موجودی"], ["reserved_qty", "رزرو"],
    ].map(([key, label]) => ({ key, label })),
    templateCsv: "item_code,item_name,warehouse_code,warehouse_name,cost_center,on_hand_qty,reserved_qty\nITEM-001,محصول نمونه,W-01,انبار مرکزی,مرکز تهران,120,20\n",
  },
  {
    id: "finance",
    title: "مالی و بودجه",
    description: "ثبت دوره مالی ماهانه بر اساس سال و ماه شمسی",
    targetTable: "finance_monthly",
    acceptedFormats: ["csv", "xlsx"],
    requiredColumns: [
      ["year_jalali", "سال"], ["month_num", "ماه"], ["cash_balance_rial", "موجودی نقد"],
      ["budget_target_rial", "بودجه هدف"], ["budget_actual_rial", "بودجه واقعی"], ["roi_pct", "ROI"],
    ].map(([key, label]) => ({ key, label })),
    templateCsv: "year_jalali,month_num,cash_balance_rial,budget_target_rial,budget_actual_rial,roi_pct,total_assets_rial,total_liabilities_rial,company_value_rial\n1405,7,3500000000,5000000000,4600000000,18.4,12000000000,4300000000,18000000000\n",
  },
]);

export function getDatasetDescriptor(id: string): DatasetDescriptor | null {
  return DATASET_CATALOG.find((dataset) => dataset.id === id) ?? null;
}
