import { useEffect, useState } from "react";
import { Box, Typography, Grid, Alert } from "@mui/material";
import { TrendingUp, TrendingDown, Percent, Wallet, ReceiptText } from "lucide-react";
import {
  pnlApi,
  type PnlSummary,
  type MonthlyKeyItemRow,
  type ExpenseBreakdownRow,
  type PnlBreakdownRow,
} from "../../lib/api/pnlApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import PnlTrendChart from "../../components/charts/PnlTrendChart";
import GenericDonut from "../../components/charts/GenericDonut";
import HorizontalBarChart from "../../components/charts/HorizontalBarChart";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import ActiveBasketToggle from "../../components/common/ActiveBasketToggle";
import { useGlobalFilters } from "../../app/store/filtersStore";
import { formatCompactRial, formatPercent } from "../../lib/format";

export default function PnlPage() {
  const { dateFrom, dateTo, years, months } = useGlobalFilters();
  const [summary, setSummary] = useState<PnlSummary | null>(null);
  const [trend, setTrend] = useState<MonthlyKeyItemRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseBreakdownRow[]>([]);
  const [byCenter, setByCenter] = useState<PnlBreakdownRow[]>([]);
  const [byMarketer, setByMarketer] = useState<PnlBreakdownRow[]>([]);
  const [byItem, setByItem] = useState<PnlBreakdownRow[]>([]);
  const [byCustomer, setByCustomer] = useState<PnlBreakdownRow[]>([]);
  const [activeBasketOnly, setActiveBasketOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ title: string; columns: [string, string]; rows: DrillDownRow[] } | null>(
    null,
  );

  useEffect(() => {
    const filters = { dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined, years, months, activeBasketOnly };
    (async () => {
      setLoading(true);
      try {
        const [s, t, e, bc, bm, bi, bcu] = await Promise.all([
          pnlApi.summary(),
          pnlApi.monthlyKeyItems(filters),
          pnlApi.expenseBreakdown(),
          pnlApi.byCenter(filters),
          pnlApi.byMarketer(filters),
          pnlApi.byItem(filters),
          pnlApi.byCustomer(filters),
        ]);
        setSummary(s);
        setTrend(t);
        setExpenses(e);
        setByCenter(bc);
        setByMarketer(bm);
        setByItem(bi);
        setByCustomer(bcu);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, JSON.stringify(years), JSON.stringify(months), activeBasketOnly]);

  const netSalesSeries = trend
    .filter((t) => t.item === "فروش خالص")
    .sort((a, b) => a.month_seq - b.month_seq)
    .map((t) => t.amount_rial);
  const netProfitSeries = trend
    .filter((t) => t.item === "سود و (زیان ) خالص")
    .sort((a, b) => a.month_seq - b.month_seq)
    .map((t) => t.amount_rial);

  // به‌جای فرض هم‌ترازیِ ایندکس‌ها بین دو سری فوق (که اگر یک ماه یکی از دو قلم را
  // نداشته باشد گمراه‌کننده می‌شود)، حاشیه‌ی سود هر ماه از روی خودِ month_seq جفت می‌شود.
  const salesBySeq = new Map(trend.filter((t) => t.item === "فروش خالص").map((t) => [t.month_seq, t.amount_rial]));
  const profitBySeq = new Map(
    trend.filter((t) => t.item === "سود و (زیان ) خالص").map((t) => [t.month_seq, t.amount_rial])
  );
  const marginSeries = Array.from(salesBySeq.keys())
    .sort((a, b) => a - b)
    .map((seq) => {
      const sales = salesBySeq.get(seq) ?? 0;
      const profit = profitBySeq.get(seq) ?? 0;
      return sales > 0 ? (profit / sales) * 100 : 0;
    });

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          سود و زیان
        </Typography>
        <ActiveBasketToggle checked={activeBasketOnly} onChange={setActiveBasketOnly} />
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 1 }}>
        این ماژول کاملاً مستقل از ماژول فروش است و به‌روزرسانی آن ماهانه است، نه روزانه. KPIهای بالا مربوط به آخرین
        ماهِ موجود ({summary?.period.month_name} {summary?.period.year_jalali}) هستند. سود و زیان به‌تفکیک
        بازاریاب/کالا/مشتری از منبعی جداگانه (تا خرداد ۱۴۰۵) می‌آید؛ سود و زیان به‌تفکیک مرکز فروش مستقیماً از شیت
        اختصاصی «سود و زیان مراکز فروش» خوانده می‌شود (تا خرداد ۱۴۰۵).
      </Alert>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard
            title="فروش خالص (ماه اخیر)"
            value={formatCompactRial(summary?.netSales)}
            trendPct={summary?.netSalesGrowthPct ?? undefined}
            icon={Wallet}
            loading={loading}
            sparkline={netSalesSeries}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="هزینه کل" value={formatCompactRial(summary?.totalExpenses)} icon={ReceiptText} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard
            title="سود و زیان خالص"
            value={formatCompactRial(summary?.netProfit)}
            trendPct={summary?.netProfitGrowthPct ?? undefined}
            icon={summary && summary.netProfit >= 0 ? TrendingUp : TrendingDown}
            loading={loading}
            sparkline={netProfitSeries}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard
            title="حاشیه سود خالص"
            value={formatPercent(summary?.netProfitMarginPct)}
            icon={Percent}
            loading={loading}
            sparkline={marginSeries}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="نسبت بهای تمام‌شده به فروش" value={formatPercent(summary?.cogsToSalesPct)} icon={Percent} loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="ترکیب فروش و سود (ماهانه)"
            loading={loading}
            empty={!loading && trend.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "ترکیب فروش و سود ماهانه — جزئیات",
                columns: ["ردیف", "مبلغ"],
                rows: [...trend]
                  .sort((a, b) => a.month_seq - b.month_seq)
                  .map((t) => ({ label: `${t.item} — ${t.month_name} ${t.year_jalali}`, value: formatCompactRial(t.amount_rial) })),
              })
            }
          >
            <PnlTrendChart rows={trend} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard
            title="تفکیک هزینه‌ها (ماه اخیر)"
            loading={loading}
            empty={!loading && expenses.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "تفکیک هزینه‌ها — جزئیات",
                columns: ["هزینه", "مبلغ"],
                rows: [...expenses]
                  .sort((a, b) => b.amount_rial - a.amount_rial)
                  .map((e) => ({ label: e.item, value: formatCompactRial(e.amount_rial) })),
              })
            }
          >
            <GenericDonut labels={expenses.map((e) => e.item)} values={expenses.map((e) => e.amount_rial)} />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="سود و زیان به تفکیک مرکز فروش"
            height={360}
            loading={loading}
            empty={!loading && byCenter.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "سود و زیان به تفکیک مرکز فروش — جزئیات",
                columns: ["مرکز فروش", "فروش خالص"],
                rows: [...byCenter]
                  .sort((a, b) => b.netSales - a.netSales)
                  .map((c) => ({ label: c.center ?? "", value: formatCompactRial(c.netSales) })),
              })
            }
          >
            <HorizontalBarChart labels={byCenter.map((c) => c.center ?? "")} values={byCenter.map((c) => c.netSales)} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="سود و زیان به تفکیک بازاریاب"
            height={360}
            loading={loading}
            empty={!loading && byMarketer.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "سود و زیان به تفکیک بازاریاب — جزئیات",
                columns: ["بازاریاب", "فروش خالص"],
                rows: [...byMarketer]
                  .sort((a, b) => b.netSales - a.netSales)
                  .map((c) => ({ label: c.marketer ?? "", value: formatCompactRial(c.netSales) })),
              })
            }
          >
            <HorizontalBarChart
              labels={byMarketer.map((c) => c.marketer ?? "")}
              values={byMarketer.map((c) => c.netSales)}
              color="#EA2228"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="سود و زیان به تفکیک کالا"
            height={360}
            loading={loading}
            empty={!loading && byItem.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "سود و زیان به تفکیک کالا — جزئیات",
                columns: ["کالا", "فروش خالص"],
                rows: [...byItem]
                  .sort((a, b) => b.netSales - a.netSales)
                  .map((c) => ({ label: c.item ?? "", value: formatCompactRial(c.netSales) })),
              })
            }
          >
            <HorizontalBarChart labels={byItem.map((c) => c.item ?? "")} values={byItem.map((c) => c.netSales)} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="سود و زیان به تفکیک مشتری"
            height={360}
            loading={loading}
            empty={!loading && byCustomer.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "سود و زیان به تفکیک مشتری — جزئیات",
                columns: ["مشتری", "فروش خالص"],
                rows: [...byCustomer]
                  .sort((a, b) => b.netSales - a.netSales)
                  .map((c) => ({ label: c.customer ?? "", value: formatCompactRial(c.netSales) })),
              })
            }
          >
            <HorizontalBarChart
              labels={byCustomer.map((c) => c.customer ?? "")}
              values={byCustomer.map((c) => c.netSales)}
              color="#60A5FA"
            />
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
