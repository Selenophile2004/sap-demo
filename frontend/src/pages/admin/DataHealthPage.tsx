import { useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Grid, LinearProgress, Paper, Typography } from "@mui/material";
import { Activity, ChevronDown, Download, FileText, RefreshCw, Rows3, ShieldCheck, TimerReset } from "lucide-react";
import { dataHealthApi, type DataHealthReport, type DataHealthStatus } from "../../lib/api/dataHealthApi";
import { reportsApi } from "../../lib/api/reportsApi";
import { formatInt } from "../../lib/format";
import { surface } from "../../app/theme/palette";

const statusLabel: Record<DataHealthStatus, string> = { healthy: "سالم", warning: "نیازمند توجه", critical: "بحرانی" };
const statusColor: Record<DataHealthStatus, "success" | "warning" | "error"> = { healthy: "success", warning: "warning", critical: "error" };

export default function DataHealthPage() {
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setLoading(true); setError(null);
    dataHealthApi.get().then(setReport).catch(() => setError("خواندن وضعیت منابع داده ناموفق بود.")).finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}><Activity size={26} /><Typography variant="h5" fontWeight={900}>مرکز سلامت داده</Typography></Box>
          <Typography color="text.secondary" sx={{ mt: 1 }}>کنترل قابل ردیابی کامل‌بودن، یکتایی، اعتبار و تازگی همه منابع تصمیم‌گیری.</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={load}>بازبینی</Button>
          <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => reportsApi.downloadExcel()}>Excel مدیریتی</Button>
          <Button variant="contained" startIcon={<FileText size={16} />} onClick={() => reportsApi.openPrintable()}>چاپ / PDF</Button>
        </Box>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !report ? <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : report && <>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}><Paper elevation={0} sx={{ p: 2.5 }}><ShieldCheck size={22} /><Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>{report.score.toLocaleString("fa-IR")}</Typography><Typography color="text.secondary">امتیاز اعتماد از ۱۰۰</Typography><LinearProgress variant="determinate" value={report.score} color={statusColor[report.status]} sx={{ mt: 1.5, height: 7, borderRadius: 5 }} /></Paper></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><Paper elevation={0} sx={{ p: 2.5 }}><Rows3 size={22} /><Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>{formatInt(report.totalRows)}</Typography><Typography color="text.secondary">رکورد پایش‌شده</Typography></Paper></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><Paper elevation={0} sx={{ p: 2.5 }}><TimerReset size={22} /><Typography variant="h4" fontWeight={900} sx={{ mt: 1 }}>{formatInt(report.staleDatasetCount)}</Typography><Typography color="text.secondary">منبع خارج از چرخه بروزرسانی</Typography></Paper></Grid>
        </Grid>
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {report.datasets.map((dataset) => (
            <Accordion key={dataset.id} disableGutters elevation={0} sx={{ border: `1px solid ${surface.border}`, "&::before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: { xs: "1fr auto", md: "1.4fr .7fr .7fr .8fr" }, gap: 1.5, alignItems: "center", pr: 1 }}>
                  <Box><Typography fontWeight={800}>{dataset.label}</Typography><Typography variant="caption" color="text.secondary">{dataset.source}</Typography></Box>
                  <Chip size="small" color={statusColor[dataset.status]} label={statusLabel[dataset.status]} />
                  <Typography variant="body2" sx={{ display: { xs: "none", md: "block" } }}>{formatInt(dataset.rowCount)} رکورد</Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ display: { xs: "none", md: "block" } }}>امتیاز {dataset.score.toLocaleString("fa-IR")}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={1.5}>
                  {dataset.checks.map((check) => <Grid key={check.id} size={{ xs: 12, sm: 6, lg: 3 }}><Paper variant="outlined" sx={{ p: 1.75 }}><Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}><Typography fontWeight={750}>{check.label}</Typography><Chip size="small" color={statusColor[check.status]} label={check.score.toLocaleString("fa-IR")} /></Box><Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.7 }}>{check.detail}</Typography></Paper></Grid>)}
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>آخرین دوره داده: {dataset.latestPeriod ?? "فاقد ستون تاریخ"} — تاریخ مبنای تازگی: {new Date(dataset.updatedAt).toLocaleString("fa-IR")}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </>}
    </Box>
  );
}
