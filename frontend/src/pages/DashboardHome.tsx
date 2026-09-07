import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Typography, Paper, Chip, Button, ToggleButtonGroup, ToggleButton, LinearProgress } from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Landmark,
  PiggyBank,
  Wallet2,
  ShoppingCart,
  Wallet,
  LineChart,
  Users,
  Trophy,
  Building2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  Users2,
  Clock,
  Maximize2,
  Gem,
  Package,
  Award,
  Compass,
  ArrowLeft,
} from "lucide-react";
import ModuleQuickCard from "../components/common/ModuleQuickCard";
import KpiCard from "../components/common/KpiCard";
import RankedListCard, { type RankedListItem } from "../components/common/RankedListCard";
import ChartCard from "../components/charts/ChartCard";
import YoyMonthlyBarChart, { type YoyMetric } from "../components/charts/YoyMonthlyBarChart";
import SimpleLineChart from "../components/charts/SimpleLineChart";
import HorizontalBarChart from "../components/charts/HorizontalBarChart";
import BudgetVsActualChart from "../components/charts/BudgetVsActualChart";
import DrillDownModal, { type DrillDownRow } from "../components/charts/DrillDownModal";
import CommentThread from "../components/common/CommentThread";
import { useAuthStore } from "../app/store/authStore";
import { salesApi, type SalesKpis } from "../lib/api/salesApi";
import { receivablesApi, type ByBranchRow } from "../lib/api/receivablesApi";
import { pnlApi, type PnlSummary } from "../lib/api/pnlApi";
import { hrApi } from "../lib/api/hrApi";
import { financeApi, type FinanceKpis, type FinanceMonthlyRow, type OkrObjective } from "../lib/api/financeApi";
import {
  homeApi,
  type YoySalesRow,
  type TopVisitorsResponse,
  type NarrativeResponse,
  type NarrativeTone,
  type PnlCoverage,
  type TopProfitableItemRow,
  type TopSellingItemRow,
  type TopProfitableMarketerRow,
  type TopProfitableCustomerRow,
} from "../lib/api/homeApi";
import { alertsApi, type AlertsResponse } from "../lib/api/alertsApi";
import { surface } from "../app/theme/palette";
import { formatCompactRial, formatInt, formatPercent } from "../lib/format";

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

type DrillDownState = { title: string; columns: [string, string] | [string, string, string]; rows: DrillDownRow[] };

const TONE_STYLE: Record<NarrativeTone, { color: string; Icon: typeof Info }> = {
  positive: { color: "#4ADE80", Icon: CheckCircle2 },
  negative: { color: "#F87171", Icon: TrendingDown },
  warning: { color: "#FBBF24", Icon: AlertTriangle },
  neutral: { color: "#94A3B8", Icon: Info },
};

const SEVERITY_LABEL = { critical: "بحرانی", warning: "هشدار", notice: "توجه" } as const;
const SEVERITY_COLOR = { critical: "error", warning: "warning", notice: "default" } as const;

// آستانه‌ی رنگ نوار پیشرفت OKR — سبز نزدیک/فراتر از هدف، زرد در راه، قرمز عقب‌افتاده.
function okrProgressColor(pct: number) {
  if (pct >= 90) return "#4ADE80";
  if (pct >= 60) return "#FBBF24";
  return "#F87171";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 20) return "عصر بخیر";
  return "شب بخیر";
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [salesKpis, setSalesKpis] = useState<SalesKpis | null>(null);
  const [recvKpis, setRecvKpis] = useState<Awaited<ReturnType<typeof receivablesApi.kpis>> | null>(null);
  const [pnlSummary, setPnlSummary] = useState<PnlSummary | null>(null);
  const [headcount, setHeadcount] = useState<string | null>(null);
  const [yoySales, setYoySales] = useState<YoySalesRow[]>([]);
  const [yoyLoading, setYoyLoading] = useState(true);
  const [yoyMetric, setYoyMetric] = useState<YoyMetric>("amount");
  const [topVisitors, setTopVisitors] = useState<TopVisitorsResponse | null>(null);
  const [topReceivables, setTopReceivables] = useState<ByBranchRow[]>([]);
  const [narrative, setNarrative] = useState<NarrativeResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [profitableItems, setProfitableItems] = useState<TopProfitableItemRow[] | null>(null);
  const [sellingItems, setSellingItems] = useState<TopSellingItemRow[] | null>(null);
  const [profitableMarketers, setProfitableMarketers] = useState<TopProfitableMarketerRow[] | null>(null);
  const [profitableCustomers, setProfitableCustomers] = useState<TopProfitableCustomerRow[] | null>(null);
  const [pnlCoverage, setPnlCoverage] = useState<PnlCoverage | null>(null);
  const [sellingCoverage, setSellingCoverage] = useState<PnlCoverage | null>(null);

  const [financeKpis, setFinanceKpis] = useState<FinanceKpis | null>(null);
  const [financeMonthly, setFinanceMonthly] = useState<FinanceMonthlyRow[]>([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [okrObjectives, setOkrObjectives] = useState<OkrObjective[] | null>(null);

  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  useEffect(() => {
    salesApi.kpis({}).then(setSalesKpis);
    receivablesApi.kpis({}).then(setRecvKpis);
    pnlApi.summary().then(setPnlSummary);
    hrApi.kpis().then((k) => setHeadcount(formatInt(k.headcount)));
    homeApi.yoySalesByMonth().then(setYoySales).finally(() => setYoyLoading(false));
    homeApi.topVisitors(20).then(setTopVisitors);
    receivablesApi.byBranch({}).then(setTopReceivables);
    homeApi.narrative().then(setNarrative);
    homeApi.topProfitableItems(20).then((r) => {
      setProfitableItems(r.items);
      setPnlCoverage(r.coverage);
    });
    homeApi.topSellingItems(20).then((r) => {
      setSellingItems(r.items);
      setSellingCoverage(r.coverage);
    });
    homeApi.topProfitableMarketers(20).then((r) => setProfitableMarketers(r.items));
    homeApi.topProfitableCustomers(20).then((r) => setProfitableCustomers(r.items));
    alertsApi.list().then(setAlerts).finally(() => setLoading(false));
    financeApi.kpis().then(setFinanceKpis);
    financeApi.monthly(24).then(setFinanceMonthly).finally(() => setFinanceLoading(false));
    financeApi.okr().then(setOkrObjectives);
  }, []);

  const staleModules = narrative?.freshness.filter((f) => f.stale) ?? [];
  const topAlerts = alerts?.alerts.slice(0, 5) ?? [];

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 1.25,
          position: "relative",
          overflow: "hidden",
          backgroundImage:
            "radial-gradient(circle at 15% 30%, rgba(234,34,40,0.14), transparent 55%), radial-gradient(circle at 90% 20%, rgba(248,177,123,0.12), transparent 50%)",
        }}
      >
        <Typography variant="h5" fontWeight={800} gutterBottom>
          {greeting()}، {user?.displayName?.split(" ")[0] ?? ""} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          عکس فوری وضعیت فعلی سازمان — برای گزارش‌های تفصیلی و فیلترپذیر هر بخش، از منوی سمت راست استفاده کنید.
        </Typography>
      </Paper>

      {/* ---------- تحلیل کلی روند سازمان ---------- */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Target size={18} />
          <Typography variant="subtitle1" fontWeight={800}>
            تحلیل کلی روند سازمان
          </Typography>
        </Box>

        {staleModules.length > 0 && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1.25,
              bgcolor: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Clock size={15} color="#FBBF24" />
              <Typography variant="caption" fontWeight={700} sx={{ color: "#FBBF24" }}>
                برخی داده‌ها نیاز به به‌روزرسانی دارند
              </Typography>
            </Box>
            {staleModules.map((f) => (
              <Typography key={f.module} variant="caption" color="text.secondary">
                {f.text}
              </Typography>
            ))}
          </Box>
        )}

        {!narrative && (
          <Typography variant="body2" color="text.secondary">
            در حال محاسبه‌ی تحلیل...
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {narrative?.bullets.map((b, i) => {
            const { color, Icon } = TONE_STYLE[b.tone];
            return (
              <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ mt: 0.2, color, flexShrink: 0 }}>
                  <Icon size={15} />
                </Box>
                <Typography variant="body2">{b.text}</Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ---------- کارت‌های ماژول‌ها ---------- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ModuleQuickCard
            title="جمع فروش خالص"
            value={salesKpis ? formatCompactRial(salesKpis.totalNetAmount) : null}
            subtitle="ماژول فروش"
            icon={ShoppingCart}
            color="#EA2228"
            to="/sales"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ModuleQuickCard
            title="مانده پرداخت‌نشده"
            value={recvKpis ? formatCompactRial(recvKpis.totalUnpaid) : null}
            subtitle="ماژول مانده مطالبات"
            icon={Wallet}
            color="#F8B17B"
            to="/receivables"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ModuleQuickCard
            title="سود و زیان خالص (آخرین ماه)"
            value={pnlSummary ? formatCompactRial(pnlSummary.netProfit) : null}
            subtitle="ماژول سود و زیان"
            icon={LineChart}
            color="#4ADE80"
            to="/pnl"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ModuleQuickCard title="تعداد پرسنل فعال" value={headcount} subtitle="ماژول پرسنل" icon={Users} color="#60A5FA" to="/hr" />
        </Grid>
      </Grid>

      {/* ---------- سود و زیان به‌صورت KPI ---------- */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        سود و زیان ({pnlSummary?.period ? `${pnlSummary.period.month_name} ${pnlSummary.period.year_jalali}` : "آخرین ماه"})
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="فروش خالص" value={pnlSummary ? formatCompactRial(pnlSummary.netSales) : "—"} trendPct={pnlSummary?.netSalesGrowthPct ?? undefined} loading={!pnlSummary} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="سود خالص" value={pnlSummary ? formatCompactRial(pnlSummary.netProfit) : "—"} trendPct={pnlSummary?.netProfitGrowthPct ?? undefined} loading={!pnlSummary} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="حاشیه سود خالص" value={pnlSummary ? formatPercent(pnlSummary.netProfitMarginPct) : "—"} loading={!pnlSummary} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="جمع هزینه‌ها" value={pnlSummary ? formatCompactRial(pnlSummary.totalExpenses) : "—"} loading={!pnlSummary} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="بهای تمام‌شده به فروش" value={pnlSummary ? formatPercent(pnlSummary.cogsToSalesPct) : "—"} loading={!pnlSummary} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="رشد سود نسبت به ماه قبل" value={pnlSummary?.netProfitGrowthPct != null ? formatPercent(pnlSummary.netProfitGrowthPct) : "—"} loading={!pnlSummary} />
        </Grid>
      </Grid>

      {/* ---------- شاخص‌های کلیدی مدیریتی ---------- */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        شاخص‌های کلیدی مدیریتی
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="میانگین ارزش فاکتور (AOV)" value={salesKpis ? formatCompactRial(salesKpis.avgInvoiceAmount) : "—"} loading={!salesKpis} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="سرانه فروش هر ویزیتور" value={salesKpis ? formatCompactRial(salesKpis.salesPerVisitor) : "—"} loading={!salesKpis} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard
            title="وابستگی به ۵ مشتری برتر"
            value={narrative?.topCustomerConcentrationPct != null ? formatPercent(narrative.topCustomerConcentrationPct) : "—"}
            loading={!narrative}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="میانگین سن بدهی (DSO)" value={recvKpis ? `${formatInt(recvKpis.avgDebtAgeDays)} روز` : "—"} loading={!recvKpis} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="نرخ وصول مطالبات" value={recvKpis ? formatPercent(recvKpis.collectionRatePct) : "—"} loading={!recvKpis} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
          <KpiCard title="نرخ حفظ مشتری" value={narrative?.retentionRatePct != null ? formatPercent(narrative.retentionRatePct) : "—"} loading={!narrative} />
        </Grid>
      </Grid>

      {/* ---------- شاخص‌های مالی و ترازنامه ---------- */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        شاخص‌های مالی و ترازنامه {financeKpis?.period ? `(${financeKpis.period.month_name} ${financeKpis.period.year_jalali})` : ""}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="درصد تحقق بودجه سال"
            value={financeKpis?.budgetRealizationPct != null ? formatPercent(financeKpis.budgetRealizationPct) : "—"}
            subtitle="از ابتدای سال (YTD)"
            icon={Percent}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="بدهی و تعهدات"
            value={financeKpis ? formatCompactRial(financeKpis.totalLiabilitiesRial) : "—"}
            icon={Landmark}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="نسبت بدهی به دارایی"
            value={financeKpis?.debtToAssetPct != null ? formatPercent(financeKpis.debtToAssetPct) : "—"}
            icon={Percent}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="ارزش شرکت"
            value={financeKpis ? formatCompactRial(financeKpis.companyValueRial) : "—"}
            icon={TrendingUp}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="جمع کل دارایی‌ها"
            value={financeKpis ? formatCompactRial(financeKpis.totalAssetsRial) : "—"}
            icon={PiggyBank}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="مانده نقدینگی"
            value={financeKpis ? formatCompactRial(financeKpis.cashBalanceRial) : "—"}
            icon={Wallet2}
            loading={!financeKpis}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="بازده سرمایه (ROI)"
            value={financeKpis ? formatPercent(financeKpis.roiPct) : "—"}
            icon={TrendingUp}
            loading={!financeKpis}
          />
        </Grid>
      </Grid>

      {/* ---------- گزارش‌های مالی تکمیلی ---------- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Landmark size={17} color="#60A5FA" />
        <Typography variant="subtitle1" fontWeight={800}>
          گزارش‌های مالی تکمیلی
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard
            title="بودجه سالانه: هدف در مقابل تحقق ماهانه"
            loading={financeLoading}
            empty={!financeLoading && financeMonthly.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "بودجه ماهانه: هدف در مقابل تحقق — جزئیات",
                columns: ["ماه", "هدف بودجه", "تحقق واقعی"],
                rows: [...financeMonthly].reverse().map((f) => ({
                  label: `${f.month_name} ${f.year_jalali}`,
                  value: formatCompactRial(f.budget_target_rial),
                  secondary: formatCompactRial(f.budget_actual_rial),
                })),
              })
            }
          >
            <BudgetVsActualChart data={financeMonthly} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard
            title="خلاصه ترازنامه (آخرین ماه)"
            loading={!financeKpis}
            empty={!financeKpis}
            onDrillDown={
              financeKpis
                ? () =>
                    setDrillDown({
                      title: "خلاصه ترازنامه — جزئیات",
                      columns: ["مورد", "مبلغ"],
                      rows: [
                        { label: "جمع کل دارایی‌ها", value: formatCompactRial(financeKpis.totalAssetsRial) },
                        { label: "بدهی و تعهدات", value: formatCompactRial(financeKpis.totalLiabilitiesRial) },
                        { label: "حقوق صاحبان سهام", value: formatCompactRial(financeKpis.totalEquityRial) },
                      ],
                    })
                : undefined
            }
          >
            <HorizontalBarChart
              labels={["دارایی‌ها", "بدهی‌ها", "حقوق صاحبان سهام"]}
              values={[
                financeKpis?.totalAssetsRial ?? 0,
                financeKpis?.totalLiabilitiesRial ?? 0,
                financeKpis?.totalEquityRial ?? 0,
              ]}
            />
          </ChartCard>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard
            title="روند مانده نقدینگی"
            loading={financeLoading}
            empty={!financeLoading && financeMonthly.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "روند مانده نقدینگی — جزئیات",
                columns: ["ماه", "مانده نقدینگی"],
                rows: [...financeMonthly].reverse().map((f) => ({
                  label: `${f.month_name} ${f.year_jalali}`,
                  value: formatCompactRial(f.cash_balance_rial),
                })),
              })
            }
          >
            <SimpleLineChart
              labels={financeMonthly.map((f) => `${f.month_name} ${f.year_jalali}`)}
              values={financeMonthly.map((f) => f.cash_balance_rial)}
              valueFormatter={(v) => formatCompactRial(v)}
              color="#60A5FA"
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard
            title="روند بازده سرمایه (ROI)"
            loading={financeLoading}
            empty={!financeLoading && financeMonthly.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "روند بازده سرمایه (ROI) — جزئیات",
                columns: ["ماه", "ROI"],
                rows: [...financeMonthly].reverse().map((f) => ({
                  label: `${f.month_name} ${f.year_jalali}`,
                  value: formatPercent(f.roi_pct),
                })),
              })
            }
          >
            <SimpleLineChart
              labels={financeMonthly.map((f) => `${f.month_name} ${f.year_jalali}`)}
              values={financeMonthly.map((f) => f.roi_pct)}
              valueFormatter={(v) => formatPercent(v)}
              color="#4ADE80"
            />
          </ChartCard>
        </Grid>
      </Grid>

      {/* ---------- نمودار فروش ---------- */}
      <Box sx={{ mb: 3 }}>
        <ChartCard
          title="فروش: مقایسه سال‌های مختلف در ماه‌های مختلف"
          height={360}
          loading={yoyLoading}
          empty={!yoyLoading && yoySales.length === 0}
          onDrillDown={() =>
            setDrillDown({
              title: "فروش ماهانه به تفکیک سال — جزئیات",
              columns: ["ماه", "فروش خالص", "تعداد"],
              rows: [...yoySales]
                .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year.localeCompare(b.year)))
                .map((r) => ({
                  label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
                  value: formatCompactRial(r.netAmount),
                  secondary: `${formatInt(r.netQty)} عدد`,
                })),
            })
          }
          action={
            <ToggleButtonGroup
              size="small"
              exclusive
              value={yoyMetric}
              onChange={(_e, v: YoyMetric | null) => v && setYoyMetric(v)}
              onClick={(e) => e.stopPropagation()}
              sx={{
                "& .MuiToggleButton-root": {
                  py: 0.25,
                  px: 1.25,
                  fontSize: 12,
                  border: `1px solid ${surface.border}`,
                },
              }}
            >
              <ToggleButton value="amount">ریالی</ToggleButton>
              <ToggleButton value="qty">تعدادی</ToggleButton>
            </ToggleButtonGroup>
          }
        >
          <YoyMonthlyBarChart data={yoySales} metric={yoyMetric} />
        </ChartCard>
      </Box>

      {/* ---------- ۵ ویزیتور برتر / ۵ مرکز با بیشترین مانده مطالبات ---------- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.25, height: "100%", "&:hover .drilldown-hint": { opacity: 1 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Trophy size={17} color="#FBBF24" />
                <Typography variant="subtitle1" fontWeight={800}>
                  ۵ ویزیتور برتر {topVisitors ? `(${topVisitors.period.monthLabel} ${topVisitors.period.year})` : ""}
                </Typography>
              </Box>
              {topVisitors && topVisitors.visitors.length > 0 && (
                <Chip
                  className="drilldown-hint"
                  size="small"
                  icon={<Maximize2 size={12} />}
                  label="جزئیات"
                  onClick={() =>
                    setDrillDown({
                      title: "ویزیتورها بر اساس درصد تحقق تارگت — جزئیات",
                      columns: ["ویزیتور", "درصد تحقق", "فروش خالص"],
                      rows: topVisitors.visitors.map((v) => ({
                        label: v.visitorName,
                        value: v.achievementPct != null ? formatPercent(v.achievementPct) : "—",
                        secondary: formatCompactRial(v.netAmount),
                      })),
                    })
                  }
                  sx={{
                    opacity: 0,
                    transition: "opacity .18s ease",
                    cursor: "pointer",
                    height: 22,
                    fontSize: 11,
                    bgcolor: surface.glassHover,
                    "&:hover": { bgcolor: "rgba(248,177,123,0.25)" },
                  }}
                />
              )}
            </Box>
            {!topVisitors && (
              <Typography variant="body2" color="text.secondary">
                در حال بارگذاری...
              </Typography>
            )}
            {topVisitors?.visitors.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                داده‌ی تحقق تارگتی برای ماه جاری موجود نیست.
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {topVisitors?.visitors.slice(0, 5).map((v, i) => (
                <Box
                  key={v.visitorName}
                  onClick={() => navigate(`/marketer-scorecard?visitor=${encodeURIComponent(v.visitorName)}`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1,
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": { bgcolor: surface.glassHover },
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                      bgcolor: i === 0 ? "rgba(251,191,36,0.2)" : surface.glassHover,
                      color: i === 0 ? "#FBBF24" : "text.secondary",
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {v.visitorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCompactRial(v.netAmount)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={formatPercent(v.achievementPct)}
                    sx={{
                      fontWeight: 700,
                      bgcolor: "rgba(74,222,128,0.15)",
                      color: "#4ADE80",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.25, height: "100%", "&:hover .drilldown-hint": { opacity: 1 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Building2 size={17} color="#F87171" />
                <Typography variant="subtitle1" fontWeight={800}>
                  ۵ مرکز با بیشترین مانده مطالبات
                </Typography>
              </Box>
              {topReceivables.length > 0 && (
                <Chip
                  className="drilldown-hint"
                  size="small"
                  icon={<Maximize2 size={12} />}
                  label="جزئیات"
                  onClick={() =>
                    setDrillDown({
                      title: "مانده مطالبات به تفکیک مرکز — جزئیات",
                      columns: ["مرکز", "مانده پرداخت‌نشده", "سهم از کل"],
                      rows: topReceivables.map((r) => ({
                        label: r.branch,
                        value: formatCompactRial(r.totalUnpaid),
                        secondary: formatPercent(r.sharePct),
                      })),
                    })
                  }
                  sx={{
                    opacity: 0,
                    transition: "opacity .18s ease",
                    cursor: "pointer",
                    height: 22,
                    fontSize: 11,
                    bgcolor: surface.glassHover,
                    "&:hover": { bgcolor: "rgba(248,177,123,0.25)" },
                  }}
                />
              )}
            </Box>
            {topReceivables.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                در حال بارگذاری...
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {topReceivables.slice(0, 5).map((r, i) => (
                <Box
                  key={r.branch}
                  onClick={() => navigate("/receivables")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1,
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": { bgcolor: surface.glassHover },
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      flexShrink: 0,
                      bgcolor: i === 0 ? "rgba(248,113,113,0.2)" : surface.glassHover,
                      color: i === 0 ? "#F87171" : "text.secondary",
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {r.branch}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatPercent(r.sharePct)} از کل مانده
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} sx={{ direction: "ltr" }}>
                    {formatCompactRial(r.totalUnpaid)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ---------- سودآوری محصول و بازاریاب ---------- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Gem size={17} color="#C084FC" />
        <Typography variant="subtitle1" fontWeight={800}>
          سودآوری بر اساس گزارش سود و زیان محصول و بازاریاب
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        {pnlCoverage?.minDate && pnlCoverage?.maxDate
          ? `این بخش از منبعی جدا و مستقل می‌آید که فقط از ${pnlCoverage.minDate} تا ${pnlCoverage.maxDate} به‌روز است — ممکن است با بقیه‌ی این صفحه هم‌زمان نباشد.`
          : "این بخش از یک منبع داده‌ی جدا و مستقل (سود و زیان محصول و بازاریاب) می‌آید."}{" "}
        دو باکس کالا فقط بر اساس «سبد فعال» محاسبه شده‌اند.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RankedListCard
            title="۱۰ کالای پرسود"
            icon={Gem}
            iconColor="#C084FC"
            loading={!profitableItems}
            emptyText="داده‌ای موجود نیست."
            onDrillDown={() =>
              setDrillDown({
                title: "کالای پرسود — جزئیات",
                columns: ["کالا", "سود/زیان", "فروش خالص"],
                rows: (profitableItems ?? []).map((r) => ({
                  label: r.item_name,
                  value: formatCompactRial(r.profitLoss),
                  secondary: formatCompactRial(r.netSales),
                })),
              })
            }
            items={(profitableItems ?? []).slice(0, 10).map(
              (r): RankedListItem => ({
                key: r.item_name,
                name: r.item_name,
                subtitle: `فروش خالص: ${formatCompactRial(r.netSales)}`,
                value: formatCompactRial(r.profitLoss),
              })
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RankedListCard
            title="۱۰ کالای پرفروش"
            icon={Package}
            iconColor="#60A5FA"
            loading={!sellingItems}
            emptyText="داده‌ای موجود نیست."
            caption={
              sellingCoverage?.maxDate
                ? `برخلاف بقیه‌ی این بخش، مستقیماً از فایل فروش می‌آید — تا ${sellingCoverage.maxDate} به‌روز است.`
                : undefined
            }
            onDrillDown={() =>
              setDrillDown({
                title: "کالای پرفروش — جزئیات",
                columns: ["کالا", "تعداد", "فروش خالص"],
                rows: (sellingItems ?? []).map((r) => ({
                  label: r.item_name,
                  value: `${formatInt(r.qty)} عدد`,
                  secondary: formatCompactRial(r.netSales),
                })),
              })
            }
            items={(sellingItems ?? []).slice(0, 10).map(
              (r): RankedListItem => ({
                key: r.item_name,
                name: r.item_name,
                subtitle: `فروش خالص: ${formatCompactRial(r.netSales)}`,
                value: `${formatInt(r.qty)} عدد`,
              })
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RankedListCard
            title="۱۰ ویزیتور پرسود"
            icon={Award}
            iconColor="#4ADE80"
            loading={!profitableMarketers}
            emptyText="داده‌ای موجود نیست."
            onDrillDown={() =>
              setDrillDown({
                title: "ویزیتور پرسود — جزئیات",
                columns: ["ویزیتور", "سود/زیان", "فروش خالص"],
                rows: (profitableMarketers ?? []).map((r) => ({
                  label: r.employee_name,
                  value: formatCompactRial(r.profitLoss),
                  secondary: formatCompactRial(r.netSales),
                })),
              })
            }
            items={(profitableMarketers ?? []).slice(0, 10).map(
              (r): RankedListItem => ({
                key: r.employee_name,
                name: r.employee_name,
                subtitle: `فروش خالص: ${formatCompactRial(r.netSales)}`,
                value: formatCompactRial(r.profitLoss),
                onClick: () => navigate(`/marketer-scorecard?visitor=${encodeURIComponent(r.employee_name)}`),
              })
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RankedListCard
            title="۱۰ مشتری پرسود"
            icon={Users2}
            iconColor="#F8B17B"
            loading={!profitableCustomers}
            emptyText="داده‌ای موجود نیست."
            onDrillDown={() =>
              setDrillDown({
                title: "مشتری پرسود — جزئیات",
                columns: ["مشتری", "سود/زیان", "فروش خالص"],
                rows: (profitableCustomers ?? []).map((r) => ({
                  label: r.customer_name,
                  value: formatCompactRial(r.profitLoss),
                  secondary: formatCompactRial(r.netSales),
                })),
              })
            }
            items={(profitableCustomers ?? []).slice(0, 10).map(
              (r): RankedListItem => ({
                key: r.customer_name,
                name: r.customer_name,
                subtitle: `فروش خالص: ${formatCompactRial(r.netSales)}`,
                value: formatCompactRial(r.profitLoss),
              })
            )}
          />
        </Grid>
      </Grid>

      {/* ---------- چشم‌انداز و OKR ---------- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Compass size={17} color="#4ADE80" />
        <Typography variant="subtitle1" fontWeight={800}>
          چشم‌انداز و OKR {okrObjectives?.[0]?.quarterLabel ? `(${okrObjectives[0].quarterLabel})` : ""}
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {!okrObjectives && (
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary">
              در حال بارگذاری...
            </Typography>
          </Grid>
        )}
        {okrObjectives?.map((obj) => (
          <Grid key={obj.id} size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.25, height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>
                  {obj.title}
                </Typography>
                <Chip size="small" label={obj.owner} sx={{ fontWeight: 700, flexShrink: 0, bgcolor: surface.glassHover }} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
                {obj.keyResults.map((kr) => (
                  <Box key={kr.id}>
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                      <Typography variant="body2">{kr.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ direction: "ltr", flexShrink: 0 }}>
                        {formatInt(kr.actualValue)} / {formatInt(kr.targetValue)} {kr.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, kr.progressPct)}
                      sx={{
                        height: 6,
                        borderRadius: 999,
                        bgcolor: surface.glassHover,
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          bgcolor: okrProgressColor(kr.progressPct),
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ---------- مهم‌ترین هشدارها ---------- */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1.25, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldAlert size={17} color="#F87171" />
            <Typography variant="subtitle1" fontWeight={800}>
              مهم‌ترین هشدارها
            </Typography>
            {alerts && (
              <Chip
                size="small"
                label={`${alerts.summary.critical + alerts.summary.warning} فعال`}
                color={alerts.summary.critical > 0 ? "error" : alerts.summary.warning > 0 ? "warning" : "default"}
                sx={{ fontWeight: 700 }}
              />
            )}
          </Box>
          <Button size="small" endIcon={<ArrowLeft size={14} />} onClick={() => navigate("/alerts")}>
            مشاهده همه
          </Button>
        </Box>

        {!loading && topAlerts.length === 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#4ADE80" }}>
            <CheckCircle2 size={18} />
            <Typography variant="body2">هیچ هشدار فعالی وجود ندارد.</Typography>
          </Box>
        )}

        <Grid container spacing={1.5}>
          {topAlerts.map((a) => (
            <Grid key={a.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1.25,
                  height: "100%",
                  bgcolor: surface.glassHover,
                  borderInlineStart: `3px solid ${
                    a.severity === "critical" ? "#F87171" : a.severity === "warning" ? "#FBBF24" : surface.borderStrong
                  }`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {a.title}
                  </Typography>
                  <Chip size="small" label={SEVERITY_LABEL[a.severity]} color={SEVERITY_COLOR[a.severity]} sx={{ fontWeight: 700, flexShrink: 0 }} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {a.description}
                </Typography>
                <CommentThread targetType="alert" targetId={a.id} targetLabel={a.title} collapsible />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <DrillDownModal
        open={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? ""}
        columns={drillDown?.columns ?? ["", ""]}
        rows={drillDown?.rows ?? []}
      />
    </Box>
  );
}
