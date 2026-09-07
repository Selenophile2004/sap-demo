import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Grid, Button, Chip } from "@mui/material";
import { Wallet, Receipt, Users, Calendar, Repeat, ReceiptText, LayoutGrid, BadgeDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  salesApi,
  type SalesKpis,
  type MonthlyTrendRow,
  type ByCenterRow,
  type ByProvinceRow,
  type TopCustomerRow,
  type MarketerScoreRow,
  type DailyRow,
  type CustomerScatterRow,
  type SalesFilterOptions,
} from "../../lib/api/salesApi";
import { itemGroupsApi, type GroupDistributionRow } from "../../lib/api/itemGroupsApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import MonthlyTrendChart from "../../components/charts/MonthlyTrendChart";
import ByCenterChart from "../../components/charts/ByCenterChart";
import IranSalesMap from "../../components/charts/IranSalesMap";
import CustomerStatusDonut from "../../components/charts/CustomerStatusDonut";
import DailySalesChart from "../../components/charts/DailySalesChart";
import GroupDistributionTreemap from "../../components/charts/GroupDistributionTreemap";
import CustomerScatterChart from "../../components/charts/CustomerScatterChart";
import TopCustomersTable from "../../components/sales/TopCustomersTable";
import MarketerScorecardTable from "../../components/sales/MarketerScorecardTable";
import SalesFiltersBar from "../../components/sales/SalesFiltersBar";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import { useGlobalFilters } from "../../app/store/filtersStore";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";

export default function SalesPage() {
  const navigate = useNavigate();
  const { dateFrom, dateTo, years, months } = useGlobalFilters();
  const [valueMode, setValueMode] = useState<"rial" | "quantity">("rial");
  const [centers, setCenters] = useState<string[]>([]);
  const [visitors, setVisitors] = useState<string[]>([]);
  const [activeBasketOnly, setActiveBasketOnly] = useState(false);
  const [filterOptions, setFilterOptions] = useState<SalesFilterOptions | null>(null);

  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [trend, setTrend] = useState<MonthlyTrendRow[]>([]);
  const [byCenter, setByCenter] = useState<ByCenterRow[]>([]);
  const [byProvince, setByProvince] = useState<ByProvinceRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerRow[]>([]);
  const [scorecard, setScorecard] = useState<MarketerScoreRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [scatter, setScatter] = useState<CustomerScatterRow[]>([]);
  const [groupDistribution, setGroupDistribution] = useState<GroupDistributionRow[]>([]);
  const [categorizedPct, setCategorizedPct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{
    title: string;
    columns: [string, string] | [string, string, string];
    rows: DrillDownRow[];
  } | null>(null);

  useEffect(() => {
    salesApi.filters().then(setFilterOptions);
    itemGroupsApi.distribution().then(setGroupDistribution);
    itemGroupsApi.summary().then((s) => setCategorizedPct(s.categorizedPct));
  }, []);

  const filters = {
    center: centers,
    visitor: visitors,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    years,
    months,
    activeBasketOnly,
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, t, bc, bp, tc, sc, d, sct] = await Promise.all([
        salesApi.kpis(filters),
        salesApi.monthlyTrend(filters),
        salesApi.byCenter(filters),
        salesApi.byProvince(filters),
        salesApi.topCustomers(filters, 15),
        salesApi.marketerScorecard(filters),
        salesApi.daily({ center: centers, visitor: visitors, activeBasketOnly }),
        salesApi.customerScatter(filters),
      ]);
      setKpis(k);
      setTrend(t);
      setByCenter(bc);
      setByProvince(bp);
      setTopCustomers(tc);
      setScorecard(sc);
      setDaily(d);
      setScatter(sct);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(centers),
    JSON.stringify(visitors),
    activeBasketOnly,
    dateFrom,
    dateTo,
    JSON.stringify(years),
    JSON.stringify(months),
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const dailyTotal = daily.reduce((sum, d) => sum + d.netAmount, 0);
  const todayRow = daily.at(-1);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          فروش
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LayoutGrid size={16} />}
          onClick={() => navigate("/sales/product-groups")}
        >
          مدیریت گروه‌بندی کالا
        </Button>
      </Box>

      <SalesFiltersBar
        options={filterOptions}
        selectedCenters={centers}
        selectedVisitors={visitors}
        onCentersChange={setCenters}
        onVisitorsChange={setVisitors}
        valueMode={valueMode}
        onValueModeChange={setValueMode}
        activeBasketOnly={activeBasketOnly}
        onActiveBasketOnlyChange={setActiveBasketOnly}
      />

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title={valueMode === "rial" ? "جمع فروش خالص" : "تعداد فروش (عدد)"}
            value={
              valueMode === "rial" ? formatCompactRial(kpis?.totalNetAmount) : formatInt(kpis?.totalNetQtyCount)
            }
            subtitle={
              valueMode === "rial" && kpis?.pendingNetAmount
                ? `شامل ${formatCompactRial(kpis.pendingNetAmount)} فروش موقت (تأییدنشده)`
                : undefined
            }
            icon={Wallet}
            loading={loading}
            sparkline={trend.map((t) => (valueMode === "rial" ? t.netAmount : t.netQty))}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="تعداد فاکتور"
            value={formatInt(kpis?.totalInvoices)}
            icon={Receipt}
            loading={loading}
            sparkline={trend.map((t) => t.invoiceCount)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="میانگین مبلغ هر فاکتور"
            value={formatCompactRial(kpis?.avgInvoiceAmount)}
            icon={ReceiptText}
            loading={loading}
            sparkline={trend.map((t) => t.avgInvoiceAmount)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="سرانه فروش (به ازای ویزیتور)"
            value={formatCompactRial(kpis?.salesPerVisitor)}
            icon={BadgeDollarSign}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="نرخ حفظ مشتری (ماهانه)"
            value={formatPercent(kpis?.retentionRatePct)}
            icon={Repeat}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="مشتریان فعال / غیرفعال"
            value={`${formatInt(kpis?.customerActive)} / ${formatInt(kpis?.customerInactive)}`}
            subtitle={`${formatPercent(kpis?.customerInactivePct)} غیرفعال`}
            icon={Users}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="میانگین روز عدم خرید"
            value={formatInt(kpis?.avgDaysSinceLastPurchase)}
            subtitle="روز"
            icon={Calendar}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="روند فروش ماهانه"
            loading={loading}
            empty={!loading && trend.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "روند فروش ماهانه — جزئیات",
                columns: ["ماه", valueMode === "rial" ? "فروش خالص" : "تعداد"],
                rows: trend.map((t) => ({
                  label: t.ym,
                  value: valueMode === "rial" ? formatCompactRial(t.netAmount) : formatInt(t.netQty),
                })),
              })
            }
          >
            <MonthlyTrendChart data={trend} valueMode={valueMode} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard
            title="وضعیت مشتریان"
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "وضعیت مشتریان — جزئیات",
                columns: ["وضعیت", "تعداد"],
                rows: [
                  { label: "فعال", value: formatInt(kpis?.customerActive) },
                  { label: "غیرفعال", value: formatInt(kpis?.customerInactive) },
                ],
              })
            }
          >
            <CustomerStatusDonut
              active={kpis?.customerActive ?? 0}
              inactive={kpis?.customerInactive ?? 0}
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="فروش بر اساس مرکز فروش / شعبه"
            height={380}
            loading={loading}
            empty={!loading && byCenter.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "فروش بر اساس مرکز فروش — جزئیات",
                columns: ["مرکز فروش", valueMode === "rial" ? "فروش خالص" : "تعداد"],
                rows: [...byCenter]
                  .sort((a, b) => (valueMode === "rial" ? b.netAmount - a.netAmount : b.netQty - a.netQty))
                  .map((c) => ({
                    label: c.center,
                    value: valueMode === "rial" ? formatCompactRial(c.netAmount) : formatInt(c.netQty),
                  })),
              })
            }
          >
            <ByCenterChart data={byCenter} valueMode={valueMode} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="مشتریان برتر" height={380} loading={loading} empty={!loading && topCustomers.length === 0}>
            <TopCustomersTable rows={topCustomers} />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="فروش به تفکیک استان"
            height={460}
            loading={loading}
            empty={!loading && byProvince.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "فروش به تفکیک استان — جزئیات",
                columns: ["استان", valueMode === "rial" ? "فروش خالص" : "تعداد"],
                rows: [...byProvince]
                  .sort((a, b) => (valueMode === "rial" ? b.netAmount - a.netAmount : b.netQty - a.netQty))
                  .map((p) => ({
                    label: p.province,
                    value: valueMode === "rial" ? formatCompactRial(p.netAmount) : formatInt(p.netQty),
                  })),
              })
            }
          >
            <IranSalesMap data={byProvince} metric={valueMode === "rial" ? "amount" : "qty"} />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ChartCard
            title="توزیع فروش بر اساس گروه کالایی"
            height={360}
            loading={groupDistribution.length === 0 && categorizedPct === null}
            onDrillDown={() =>
              setDrillDown({
                title: "توزیع فروش بر اساس گروه کالایی — جزئیات",
                columns: ["گروه کالایی", "فروش خالص"],
                rows: [...groupDistribution]
                  .sort((a, b) => b.amount - a.amount)
                  .map((g) => ({ label: g.group, value: formatCompactRial(g.amount) })),
              })
            }
            action={
              categorizedPct !== null && (
                <Chip
                  size="small"
                  label={`${formatPercent(categorizedPct)} دسته‌بندی شده`}
                  color={categorizedPct > 80 ? "success" : "default"}
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate("/sales/product-groups")}
                />
              )
            }
          >
            <GroupDistributionTreemap data={groupDistribution} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ChartCard
            title="پراکندگی مشتریان: آخرین خرید × مبلغ"
            height={360}
            loading={loading}
            empty={!loading && scatter.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "پراکندگی مشتریان — جزئیات",
                columns: ["مشتری", "فروش خالص", "روز از آخرین خرید"],
                rows: [...scatter]
                  .sort((a, b) => b.netAmount - a.netAmount)
                  .map((s) => ({
                    label: s.customerName,
                    value: formatCompactRial(s.netAmount),
                    secondary: formatInt(s.daysSinceLastPurchase),
                  })),
              })
            }
          >
            <CustomerScatterChart data={scatter} />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="کارنامه بازاریاب" height={420} loading={loading} empty={!loading && scorecard.length === 0}>
            <MarketerScorecardTable rows={scorecard} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="فروش روزانه (ماه جاری)"
            height={420}
            loading={loading}
            empty={!loading && daily.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "فروش روزانه — جزئیات",
                columns: ["روز", "فروش خالص"],
                rows: [...daily].reverse().map((d) => ({ label: d.date, value: formatCompactRial(d.netAmount) })),
              })
            }
            action={
              !loading && (
                <Typography variant="caption" color="text.secondary">
                  جمع ماه: {formatCompactRial(dailyTotal)} — امروز: {formatCompactRial(todayRow?.netAmount)}
                </Typography>
              )
            }
          >
            <DailySalesChart data={daily} />
          </ChartCard>
        </Grid>
      </Grid>

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
