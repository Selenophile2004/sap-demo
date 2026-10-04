import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Grid, Paper, Typography } from "@mui/material";
import { Download, FileBarChart, FileSpreadsheet, FileText, Printer, ShieldCheck } from "lucide-react";
import { reportsApi } from "../../lib/api/reportsApi";
import { dataHealthApi, type DataHealthReport } from "../../lib/api/dataHealthApi";
import { formatInt } from "../../lib/format";
import { surface } from "../../app/theme/palette";

export default function ExecutiveOutputPage() {
  const [health, setHealth] = useState<DataHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"excel" | "print" | null>(null);
  useEffect(() => { dataHealthApi.get().then(setHealth).catch(() => setError("وضعیت آمادگی گزارش قابل دریافت نیست.")); }, []);
  const execute = async (kind: "excel" | "print") => {
    setBusy(kind); setError(null);
    try { if (kind === "excel") await reportsApi.downloadExcel(); else await reportsApi.openPrintable(); }
    catch { setError("ساخت خروجی مدیریتی ناموفق بود."); }
    finally { setBusy(null); }
  };
  const healthLabel = health?.status === "healthy" ? "سالم" : health?.status === "warning" ? "نیازمند توجه" : "بحرانی";
  return (
    <Box>
      <Box sx={{ mb: 3 }}><Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}><FileBarChart size={27} /><Typography variant="h5" fontWeight={900}>خروجی مدیریتی</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }}>یک snapshot یکپارچه و آماده جلسه از KPIهای قطعی و وضعیت اعتمادپذیری داده.</Typography></Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><Paper elevation={0} sx={{ p: 3, height: "100%", borderTop: "3px solid #7900DD" }}><FileSpreadsheet size={30} /><Typography variant="h6" fontWeight={850} sx={{ mt: 1.5 }}>فایل Excel مدیریتی</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 1, lineHeight: 1.9 }}>شامل شیت خلاصه KPIها و شیت سلامت منابع با امکان مرتب‌سازی و استفاده در جلسه.</Typography><Button sx={{ mt: 2 }} variant="contained" disabled={busy !== null} startIcon={<Download size={17} />} onClick={() => execute("excel")}>دریافت Excel</Button></Paper></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Paper elevation={0} sx={{ p: 3, height: "100%", borderTop: "3px solid #F8B17B" }}><FileText size={30} /><Typography variant="h6" fontWeight={850} sx={{ mt: 1.5 }}>نسخه چاپ و PDF</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 1, lineHeight: 1.9 }}>گزارش RTL واکنش‌گرا و print-friendly؛ در پنجره جدید باز می‌شود و از Print مرورگر به PDF ذخیره می‌شود.</Typography><Button sx={{ mt: 2 }} variant="outlined" disabled={busy !== null} startIcon={<Printer size={17} />} onClick={() => execute("print")}>بازکردن نسخه چاپ</Button></Paper></Grid>
      </Grid>
      <Paper elevation={0} sx={{ p: 2.5, mt: 2, bgcolor: surface.glassHover }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><ShieldCheck size={20} /><Box><Typography fontWeight={800}>کنترل آمادگی خروجی</Typography><Typography variant="caption" color="text.secondary">گزارش مستقیماً از همان snapshot داشبورد ساخته می‌شود؛ نه از متن تولیدی AI.</Typography></Box></Box>{health && <Box sx={{ display: "flex", gap: 1 }}><Chip color={health.status === "healthy" ? "success" : health.status === "warning" ? "warning" : "error"} label={`سلامت داده: ${healthLabel} — ${health.score.toLocaleString("fa-IR")}/۱۰۰`} /><Chip variant="outlined" label={`${formatInt(health.totalRows)} رکورد`} /></Box>}</Box>
      </Paper>
    </Box>
  );
}
