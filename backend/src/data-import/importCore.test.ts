import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareImport } from "./importCore";

describe("prepareImport", () => {
  it("normalizes a valid sales CSV and calculates deterministic derived values", () => {
    const csv = [
      "invoice_no,invoice_date_jalali,item_code,item_name,customer_code,customer_name,visitor_name,sales_center,qty,unit_price,discount_amount,province",
      "INV-9001,1405/07/12,IT-10,محصول آزمایشی,C-10,مشتری آزمایشی,ویزیتور ۱,مرکز تهران,2,150000,10000,تهران",
    ].join("\n");

    const result = prepareImport({ datasetId: "sales", fileName: "sales.csv", content: csv });

    assert.equal(result.validRows.length, 1);
    assert.equal(result.errors.length, 0);
    assert.equal(result.validRows[0].net_amount, 290000);
    assert.equal(result.validRows[0].canonical_customer_code, "C-10");
    assert.equal(result.validRows[0].record_source, "نهایی");
  });

  it("rejects invalid Jalali dates and negative quantities", () => {
    const csv = [
      "invoice_no,invoice_date_jalali,item_code,item_name,customer_code,customer_name,visitor_name,sales_center,qty,unit_price",
      "INV-9002,1405/15/99,IT-10,محصول,C-10,مشتری,ویزیتور,مرکز,-2,150000",
    ].join("\n");

    const result = prepareImport({ datasetId: "sales", fileName: "sales.csv", content: csv });

    assert.equal(result.validRows.length, 0);
    assert.equal(result.errors.some((error) => error.field === "invoice_date_jalali"), true);
    assert.equal(result.errors.some((error) => error.field === "qty"), true);
  });

  it("detects duplicate natural keys before publication", () => {
    const csv = [
      "invoice_no,invoice_date_jalali,item_code,item_name,customer_code,customer_name,visitor_name,sales_center,qty,unit_price",
      "INV-9003,1405/07/12,IT-10,محصول,C-10,مشتری,ویزیتور,مرکز,1,100",
      "INV-9003,1405/07/12,IT-10,محصول,C-10,مشتری,ویزیتور,مرکز,1,100",
    ].join("\n");

    const result = prepareImport({ datasetId: "sales", fileName: "sales.csv", content: csv });

    assert.equal(result.validRows.length, 1);
    assert.equal(result.errors.some((error) => error.code === "duplicate"), true);
  });

  it("prepares inventory rows and derives sellable quantity", () => {
    const csv = [
      "item_code,item_name,warehouse_code,warehouse_name,cost_center,on_hand_qty,reserved_qty",
      "IT-20,محصول انبار,W-01,انبار مرکزی,مرکز تهران,120,20",
    ].join("\n");

    const result = prepareImport({ datasetId: "inventory", fileName: "inventory.csv", content: csv });

    assert.equal(result.errors.length, 0);
    assert.equal(result.validRows[0].sellable_qty, 100);
  });

  it("rejects finance rows with an invalid month", () => {
    const csv = [
      "year_jalali,month_num,cash_balance_rial,budget_target_rial,budget_actual_rial,roi_pct",
      "1405,15,1000000,900000,850000,12",
    ].join("\n");

    const result = prepareImport({ datasetId: "finance", fileName: "finance.csv", content: csv });

    assert.equal(result.validRows.length, 0);
    assert.equal(result.errors.some((error) => error.field === "month_num"), true);
  });
});
