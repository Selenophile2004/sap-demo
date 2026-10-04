import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { uploadedFileToCsv } from "./fileParser";

describe("uploadedFileToCsv", () => {
  it("converts the first Excel sheet into CSV for deterministic validation", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("فروش");
    sheet.addRow(["invoice_no", "item_name", "qty"]);
    sheet.addRow(["INV-1", "محصول، ویژه", 4]);
    const buffer = await workbook.xlsx.writeBuffer();

    const csv = await uploadedFileToCsv({ fileName: "sales.xlsx", contentBase64: Buffer.from(buffer).toString("base64") });

    assert.match(csv, /invoice_no,item_name,qty/);
    assert.match(csv, /INV-1/);
    assert.match(csv, /محصول، ویژه/);
  });
});
