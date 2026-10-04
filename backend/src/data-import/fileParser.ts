import ExcelJS from "exceljs";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function uploadedFileToCsv(input: { fileName: string; content?: string; contentBase64?: string }): Promise<string> {
  const extension = input.fileName.toLowerCase().split(".").pop();
  if (extension === "csv") {
    if (typeof input.content !== "string") throw new Error("محتوای CSV ارسال نشده است.");
    return input.content;
  }
  if (extension !== "xlsx") throw new Error("فقط فایل CSV یا XLSX پذیرفته می‌شود.");
  if (!input.contentBase64) throw new Error("محتوای فایل Excel ارسال نشده است.");
  const buffer = Buffer.from(input.contentBase64, "base64");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("فایل Excel هیچ Sheet قابل خواندنی ندارد.");
  const rows: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1).map((value) => {
      if (value && typeof value === "object" && "text" in value) return csvCell((value as { text: string }).text);
      if (value instanceof Date) return csvCell(value.toISOString().slice(0, 10));
      return csvCell(value);
    });
    rows.push(values.join(","));
  });
  return rows.join("\n");
}
