import { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, Slider, TextField, MenuItem, Chip, Divider } from "@mui/material";
import { TrendingUp, Percent, Users2, LineChart as LineChartIcon, Info } from "lucide-react";
import { forecastApi, type ForecastOverview, type ForecastWeights } from "../../lib/api/forecastApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import ForecastBandChart from "../../components/charts/ForecastBandChart";
import HealthRadarChart from "../../components/charts/HealthRadarChart";
import CommentThread from "../../components/common/CommentThread";
import { formatCompactRial, formatPercent, formatInt } from "../../lib/format";

const DEFAULT_WEIGHTS: ForecastWeights = {
  recencyWeight: 50,
  categoryWeight: 50,
  concentrationWeight: 50,
  inflationPct: 60,
  horizonMonths: 3,
};

export default function ForecastPage() {
  const [weights, setWeights] = useState<ForecastWeights>(DEFAULT_WEIGHTS);
  const [data, setData] = useState<ForecastOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      forecastApi
        .overview(weights)
        .then(setData)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [weights]);

  const nextMonth = data?.sales.forecast[0];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          چشم‌انداز آینده
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          پیش‌بینی‌ها فقط بر پایه‌ی داده‌های فعال شرکت (فروش نهایی، مانده مطالبات، سود و زیان) محاسبه می‌شوند. با
          فعال شدن ماژول‌های دیگر (انبار، تولید، تامین) و افزایش تاریخچه‌ی داده، تحلیل‌های دقیق‌تر و بیشتری به این
          بخش اضافه خواهد شد.
        </Typography>
      </Box>

      {/* پنل مفروضات کلان اقتصادی */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 1, mb: 2, borderColor: "rgba(96,165,250,0.25)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Info size={16} color="#60A5FA" />
          <Typography variant="subtitle2" fontWeight={700}>
            مفروضات کلان اقتصادی ایران (قابل تغییر)
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          تاریخ به‌روزرسانی: {data?.meta.macroAssumptions.asOf ?? "—"} — منابع:{" "}
          {data?.meta.macroAssumptions.sources.join("، ")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          چون منابع رسمی ایران (بانک مرکزی و مرکز آمار) گاهی اعداد متفاوتی گزارش می‌کنند و شرایط به‌سرعت تغییر
          می‌کند، این عدد صرفاً یک نقطه‌ی شروع است — از کادر «نرخ تورم فرضی» پایین همین صفحه هر عددی که خودتان
          واقعی‌تر می‌دانید را جایگزین کنید.
        </Typography>
      </Paper>

      {/* پنل وزن‌دهی */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
          وزن‌دهی محورهای تحلیل
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              وزن روند اخیر (۳ ماه) در برابر میانگین کل تاریخچه: {weights.recencyWeight}٪
            </Typography>
            <Slider
              size="small"
              value={weights.recencyWeight}
              onChange={(_, v) => setWeights((w) => ({ ...w, recencyWeight: v as number }))}
              min={0}
              max={100}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              وزن برآورد پایین‌به‌بالا (مجموع مراکز فروش): {weights.categoryWeight}٪
            </Typography>
            <Slider
              size="small"
              value={weights.categoryWeight}
              onChange={(_, v) => setWeights((w) => ({ ...w, categoryWeight: v as number }))}
              min={0}
              max={100}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              حساسیت امتیاز سلامت به ریسک تمرکز مشتریان: {weights.concentrationWeight}٪
            </Typography>
            <Slider
              size="small"
              value={weights.concentrationWeight}
              onChange={(_, v) => setWeights((w) => ({ ...w, concentrationWeight: v as number }))}
              min={0}
              max={100}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              size="small"
              type="number"
              label="نرخ تورم فرضی سالانه (٪)"
              value={weights.inflationPct}
              onChange={(e) => setWeights((w) => ({ ...w, inflationPct: Number(e.target.value) || 0 }))}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              size="small"
              select
              label="افق پیش‌بینی"
              value={weights.horizonMonths}
              onChange={(e) => setWeights((w) => ({ ...w, horizonMonths: Number(e.target.value) }))}
              fullWidth
            >
              {[1, 2, 3, 4, 5, 6].map((m) => (
                <MenuItem key={m} value={m}>
                  {m} ماه آینده
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="پیش‌بینی فروش ماه آینده (اسمی)"
            value={formatCompactRial(nextMonth?.nominal)}
            subtitle={nextMonth ? `بازه: ${formatCompactRial(nextMonth.nominalLow)} تا ${formatCompactRial(nextMonth.nominalHigh)}` : undefined}
            icon={TrendingUp}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="رشد واقعی ماهانه (تعدیل‌شده با تورم)"
            value={formatPercent(data?.sales.blendedRealGrowthPctMonthly)}
            subtitle="پس از کسر اثر تورم فرضی"
            icon={Percent}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="سهم ۵ مشتری برتر از فروش"
            value={formatPercent(data?.concentration.top5SharePct)}
            subtitle={`۱۰ مشتری برتر: ${formatPercent(data?.concentration.top10SharePct)}`}
            icon={Users2}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="روند حاشیه سود (ماهانه)"
            value={`${(data?.margin.trendPctPerMonth ?? 0) >= 0 ? "+" : ""}${formatPercent(data?.margin.trendPctPerMonth)}`}
            subtitle="واحد درصد به ازای هر ماه"
            icon={LineChartIcon}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard title="روند فروش و پیش‌بینی (با بازه‌ی عدم‌قطعیت)" height={360} loading={loading}>
            {data && <ForecastBandChart history={data.sales.history} forecast={data.sales.forecast} />}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="امتیاز سلامت کسب‌وکار" height={360} loading={loading}>
            {data && (
              <HealthRadarChart
                salesMomentum={data.healthScore.salesMomentum}
                receivablesHealth={data.healthScore.receivablesHealth}
                marginTrend={data.healthScore.marginTrend}
                customerConcentration={data.healthScore.customerConcentration}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              روند مراکز فروش (۳ ماه اخیر در برابر ۳ ماه قبل‌تر)
            </Typography>
            <Divider sx={{ mb: 1.5, opacity: 0.3 }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {data?.byCenter.slice(0, 8).map((c) => (
                <Box key={c.center} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="body2">{c.center}</Typography>
                  <Chip
                    size="small"
                    label={c.recentGrowthPct === null ? "—" : formatPercent(c.recentGrowthPct)}
                    color={c.recentGrowthPct === null ? "default" : c.recentGrowthPct >= 0 ? "success" : "error"}
                    sx={{ fontWeight: 700, minWidth: 76 }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              گروه‌های کالایی پررشد و روبه‌افت
            </Typography>
            <Divider sx={{ mb: 1.5, opacity: 0.3 }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {data?.byProductGroup.slice(0, 8).map((g) => (
                <Box key={g.group} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="body2">{g.group}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ direction: "ltr" }}>
                      {formatCompactRial(g.recentAmount)}
                    </Typography>
                    <Chip
                      size="small"
                      label={g.growthPct === null ? "—" : formatPercent(g.growthPct)}
                      color={g.growthPct === null ? "default" : g.growthPct >= 0 ? "success" : "error"}
                      sx={{ fontWeight: 700, minWidth: 76 }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 1, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          روند وصول مطالبات: {formatPercent(data?.receivables.collectionRateTrendPctPerMonth)} تغییر در ماه (
          {formatInt(data?.receivables.history.length)} ماه اخیر بررسی شد)
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          یادداشت‌های مدیریتی درباره‌ی این چشم‌انداز
        </Typography>
        <CommentThread targetType="forecast" targetId="overview" targetLabel="چشم‌انداز آینده" />
      </Paper>
    </Box>
  );
}
