import { apiClient } from "./client";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export const reportsApi = {
  downloadExcel: async () => {
    const response = await apiClient.get<Blob>("/reports/executive.xlsx", { responseType: "blob" });
    saveBlob(response.data, "executive-report.xlsx");
  },
  openPrintable: async () => {
    // پنجره باید در همان لحظه کلیک ساخته شود؛ اگر بعد از await باز شود، بسیاری
    // از مرورگرها آن را به‌عنوان popup مسدود می‌کنند.
    const preview = window.open("about:blank", "_blank");
    if (!preview) throw new Error("مرورگر پنجره گزارش را مسدود کرد");
    preview.opener = null;
    try {
      const response = await apiClient.get<Blob>("/reports/executive.html", { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      preview.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      preview.close();
      throw error;
    }
  },
};
