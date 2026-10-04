import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid, Paper, Slider, Typography } from "@mui/material";
import { Beaker, Calculator, RotateCcw, ShieldCheck } from "lucide-react";
import { scenarioApi, type ScenarioInputs, type ScenarioResult } from "../../lib/api/scenarioApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import { formatCompactRial, formatPercent } from "../../lib/format";

const defaults: ScenarioInputs = { salesChangePct: 10, targetCollectionRatePct: 80, grossMarginPct: 30 };

export default function ScenarioPlannerPage() {
  const [inputs, setInputs] = useState<ScenarioInputs>(defaults);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (next = inputs) => {
    setLoading(true); setError(null);
    scenarioApi.run(next).then(setResult).catch(() => setError("محاسبه سناریو ناموفق بود.")).finally(() => setLoading(false));
  };
  useEffect(() => { run(defaults); }, []);
  const update = (key: keyof ScenarioInputs, value: number) => setInputs((current) => ({ ...current, [key]: value }));

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}><Beaker size={26} /><Typography variant="h5" fontWeight={900}>تحلیل What-if</Typography></Box><Typography color="text.secondary" sx={{ mt: 1 }}>اثر فرض‌های مدیریتی را بدون تغییر هیچ رکورد واقعی ببینید؛ خروجی‌ها سناریویی‌اند، نه پیش‌بینی قطعی.</Typography></Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5 }}>
            <Typography fontWeight={850} sx={{ mb: 2 }}>اهرم‌های سناریو</Typography>
            <Typography variant="body2">تغییر فروش: {formatPercent(inputs.salesChangePct)}</Typography><Slider value={inputs.salesChangePct} min={-50} max={100} step={1} onChange={(_, value) => update("salesChangePct", value as number)} />
            <Typography variant="body2" sx={{ mt: 1 }}>نرخ وصول هدف: {formatPercent(inputs.targetCollectionRatePct)}</Typography><Slider value={inputs.targetCollectionRatePct} min={0} max={100} step={1} onChange={(_, value) => update("targetCollectionRatePct", value as number)} />
            <Typography variant="body2" sx={{ mt: 1 }}>حاشیه سود فرضی: {formatPercent(inputs.grossMarginPct)}</Typography><Slider value={inputs.grossMarginPct} min={0} max={100} step={1} onChange={(_, value) => update("grossMarginPct", value as number)} />
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}><Button fullWidth variant="contained" disabled={loading} startIcon={<Calculator size={16} />} onClick={() => run()}>محاسبه</Button><Button variant="outlined" aria-label="بازنشانی" onClick={() => { setInputs(defaults); run(defaults); }}><RotateCcw size={17} /></Button></Box>
          </Paper>
          {result && <Paper elevation={0} sx={{ p: 2, mt: 2 }}><Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}><ShieldCheck size={18} /><Typography fontWeight={800}>فرض‌ها و محدودیت‌ها</Typography></Box>{result.assumptions.map((item) => <Typography key={item} variant="caption" color="text.secondary" sx={{ display: "block", mt: .75, lineHeight: 1.7 }}>• {item}</Typography>)}</Paper>}
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          {result && <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><KpiCard title="فروش سناریویی" value={formatCompactRial(result.projected.sales)} trendPct={inputs.salesChangePct} subtitle="نسبت به مبنا" /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><KpiCard title="وصول نقدی برآوردی" value={formatCompactRial(result.projected.collectedCashProxy)} subtitle={`با نرخ وصول ${formatPercent(inputs.targetCollectionRatePct)}`} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><KpiCard title="سود ناخالص برآوردی" value={formatCompactRial(result.projected.grossProfitProxy)} subtitle={`با حاشیه ${formatPercent(inputs.grossMarginPct)}`} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><KpiCard title="مطالبات سناریویی" value={formatCompactRial(result.projected.receivablesProxy)} subtitle={`تغییر ${formatCompactRial(result.deltas.receivables)}`} /></Grid>
            </Grid>
            <Box sx={{ mt: 2 }}><ChartCard title="فروش مبنا در برابر سناریو" height={290}><SimpleBarChart labels={["فروش فعلی", "فروش سناریویی"]} values={[result.baseline.sales, result.projected.sales]} valueFormatter={formatCompactRial} highlightIndex={1} /></ChartCard></Box>
          </>}
        </Grid>
      </Grid>
    </Box>
  );
}
