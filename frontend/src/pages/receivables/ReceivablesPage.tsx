import { useCallback, useEffect, useState } from "react";
import { Box, Typography, Grid, Autocomplete, TextField, Paper } from "@mui/material";
import { Wallet, AlertTriangle, Users, Clock, PieChart, ReceiptText } from "lucide-react";
import {
  receivablesApi,
  type ReceivablesKpis,
  type ByBranchRow,
  type AgeBucketRow,
  type ByVisitorRow,
  type TopDebtorRow,
  type ReceivablesFilterOptions,
  type BouncedChecksSummary,
  type RatioToSalesResponse,
} from "../../lib/api/receivablesApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import HorizontalBarChart from "../../components/charts/HorizontalBarChart";
import GenericDonut from "../../components/charts/GenericDonut";
import RankedAmountTable from "../../components/common/RankedAmountTable";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import CommentThread from "../../components/common/CommentThread";
import { useGlobalFilters } from "../../app/store/filtersStore";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";

export default function ReceivablesPage() {
  const { dateFrom, dateTo, years, months } = useGlobalFilters();
  const [branches, setBranches] = useState<string[]>([]);
  const [visitors, setVisitors] = useState<string[]>([]);
  const [options, setOptions] = useState<ReceivablesFilterOptions | null>(null);

  const [kpis, setKpis] = useState<ReceivablesKpis | null>(null);
  const [byBranch, setByBranch] = useState<ByBranchRow[]>([]);
  const [ageBuckets, setAgeBuckets] = useState<AgeBucketRow[]>([]);
  const [byVisitor, setByVisitor] = useState<ByVisitorRow[]>([]);
  const [topDebtors, setTopDebtors] = useState<TopDebtorRow[]>([]);
  const [bounced, setBounced] = useState<BouncedChecksSummary | null>(null);
  const [ratio, setRatio] = useState<RatioToSalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{
    title: string;
    columns: [string, string] | [string, string, string];
    rows: DrillDownRow[];
  } | null>(null);

  useEffect(() => {
    receivablesApi.filters().then(setOptions);
  }, []);

  const filters = {
    branch: branches,
    visitor: visitors,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    years,
    months,
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, bb, ab, bv, td, bc, rt] = await Promise.all([
        receivablesApi.kpis(filters),
        receivablesApi.byBranch(filters),
        receivablesApi.ageBuckets(filters),
        receivablesApi.byVisitor(filters),
        receivablesApi.topDebtors(filters, 15),
        receivablesApi.bouncedChecks(filters),
        receivablesApi.ratioToSales(filters),
      ]);
      setKpis(k);
      setByBranch(bb);
      setAgeBuckets(ab);
      setByVisitor(bv);
      setTopDebtors(td);
      setBounced(bc);
      setRatio(rt);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(branches), JSON.stringify(visitors), dateFrom, dateTo, JSON.stringify(years), JSON.stringify(months)]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          مانده مطالبات
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 1, display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Autocomplete
          multiple
          size="small"
          options={options?.branches ?? []}
          value={branches}
          onChange={(_, v) => setBranches(v)}
          sx={{ minWidth: 240, flexGrow: 1 }}
          renderInput={(params) => <TextField {...params} label="شعبه" placeholder="همه" />}
        />
        <Autocomplete
          multiple
          size="small"
          options={options?.visitors ?? []}
          value={visitors}
          onChange={(_, v) => setVisitors(v)}
          sx={{ minWidth: 240, flexGrow: 1 }}
          renderInput={(params) => <TextField {...params} label="ویزیتور" placeholder="همه" />}
        />
      </Paper>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="جمع مانده پرداخت‌نشده" value={formatCompactRial(kpis?.totalUnpaid)} icon={Wallet} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="درصد وصول" value={formatPercent(kpis?.collectionRatePct)} icon={PieChart} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="جمع جریمه تاخیر وصول" value={formatCompactRial(kpis?.totalPenalty)} icon={AlertTriangle} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="تعداد مشتریان بدهکار" value={formatInt(kpis?.debtorCustomers)} icon={Users} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <KpiCard title="میانگین سن بدهی" value={formatInt(kpis?.avgDebtAgeDays)} subtitle="روز" icon={Clock} loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="بازه سررسید (۱۵ روز)" loading={loading}>
            <GenericDonut
              labels={["زیر ۱۵ روز", "بالای ۱۵ روز"]}
              values={[kpis?.unpaidUnder15 ?? 0, kpis?.unpaidOver15 ?? 0]}
              colors={["#4ADE80", "#EA2228"]}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard title="بازه سنی بدهی (تفصیلی)" loading={loading} empty={!loading && ageBuckets.length === 0}>
            <GenericDonut
              labels={ageBuckets.map((b) => b.bucket ?? "نامشخص")}
              values={ageBuckets.map((b) => b.totalUnpaid)}
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="مانده پرداخت‌نشده به تفکیک شعبه"
            height={380}
            loading={loading}
            empty={!loading && byBranch.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "مانده پرداخت‌نشده به تفکیک شعبه — جزئیات",
                columns: ["شعبه", "مانده پرداخت‌نشده"],
                rows: [...byBranch]
                  .sort((a, b) => b.totalUnpaid - a.totalUnpaid)
                  .map((b) => ({ label: b.branch, value: formatCompactRial(b.totalUnpaid) })),
              })
            }
          >
            <HorizontalBarChart labels={byBranch.map((b) => b.branch)} values={byBranch.map((b) => b.totalUnpaid)} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="مانده به تفکیک ویزیتور"
            height={380}
            loading={loading}
            empty={!loading && byVisitor.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "مانده و جریمه به تفکیک ویزیتور — جزئیات",
                columns: ["ویزیتور", "مانده پرداخت‌نشده"],
                rows: [...byVisitor]
                  .sort((a, b) => b.totalUnpaid - a.totalUnpaid)
                  .map((b) => ({ label: b.visitor, value: formatCompactRial(b.totalUnpaid) })),
              })
            }
          >
            <HorizontalBarChart
              labels={byVisitor.map((b) => b.visitor)}
              values={byVisitor.map((b) => b.totalUnpaid)}
              color="#7900DD"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="رتبه‌بندی مشتریان بدهکار" height={420} loading={loading} empty={!loading && topDebtors.length === 0}>
            <RankedAmountTable
              rows={topDebtors.map((d) => ({ name: d.customer_name, amount: d.totalUnpaid }))}
              amountLabel="مانده پرداخت‌نشده"
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="رتبه‌بندی و مقایسه‌ی شعب" height={420} loading={loading} empty={!loading && byBranch.length === 0}>
            <RankedAmountTable
              rows={byBranch.map((b) => ({ name: b.branch, amount: b.totalUnpaid, secondary: formatPercent(b.sharePct) }))}
              amountLabel="مانده پرداخت‌نشده"
              secondaryLabel="سهم از کل"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          چک‌های برگشتی
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="تعداد چک برگشتی" value={formatInt(bounced?.totalCount)} icon={ReceiptText} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="مانده‌ی چک‌های برگشتی" value={formatCompactRial(bounced?.totalAmount)} icon={AlertTriangle} loading={loading} />
        </Grid>
      </Grid>
      {/* دو نمودار واقعی (نه جدول) کنار هم */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="چک برگشتی به تفکیک ویزیتور"
            height={340}
            loading={loading}
            empty={!loading && (bounced?.byVisitor.length ?? 0) === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "چک برگشتی به تفکیک ویزیتور — جزئیات",
                columns: ["ویزیتور", "مانده چک برگشتی"],
                rows: [...(bounced?.byVisitor ?? [])]
                  .sort((a, b) => b.amount - a.amount)
                  .map((b) => ({ label: b.visitor, value: formatCompactRial(b.amount) })),
              })
            }
          >
            {bounced && (
              <SimpleBarChart
                labels={[...bounced.byVisitor].reverse().map((b) => b.visitor)}
                values={[...bounced.byVisitor].reverse().map((b) => b.amount)}
                valueFormatter={(v) => formatCompactRial(v)}
              />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="چک برگشتی به تفکیک شعبه"
            height={340}
            loading={loading}
            empty={!loading && (bounced?.byBranch.length ?? 0) === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "چک برگشتی به تفکیک شعبه — جزئیات",
                columns: ["شعبه", "مانده چک برگشتی"],
                rows: [...(bounced?.byBranch ?? [])]
                  .sort((a, b) => b.amount - a.amount)
                  .map((b) => ({ label: b.branch, value: formatCompactRial(b.amount) })),
              })
            }
          >
            {bounced && (
              <SimpleBarChart
                labels={[...bounced.byBranch].reverse().map((b) => b.branch)}
                values={[...bounced.byBranch].reverse().map((b) => b.amount)}
                valueFormatter={(v) => formatCompactRial(v)}
                color="#F8B17B"
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      {/* چک برگشتی به تفکیک مشتری + نسبت مانده به فروش به تفکیک شعبه، کنار هم (هر دو جدول) */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="چک برگشتی به تفکیک مشتری"
            height={380}
            loading={loading}
            empty={!loading && (bounced?.byCustomer.length ?? 0) === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "چک برگشتی به تفکیک مشتری — جزئیات",
                columns: ["مشتری", "مانده چک برگشتی", "تعداد"],
                rows: [...(bounced?.byCustomer ?? [])]
                  .sort((a, b) => b.amount - a.amount)
                  .map((b) => ({ label: b.customer_name, value: formatCompactRial(b.amount), secondary: formatInt(b.count) })),
              })
            }
          >
            {bounced && (
              <RankedAmountTable
                rows={bounced.byCustomer.map((b) => ({ name: b.customer_name, amount: b.amount, secondary: formatInt(b.count) }))}
                amountLabel="مانده"
                secondaryLabel="تعداد"
              />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="نسبت مانده به فروش — به تفکیک شعبه" height={380} loading={loading} empty={!loading && (ratio?.byBranch.length ?? 0) === 0}>
            {ratio && (
              <RankedAmountTable
                rows={ratio.byBranch
                  .filter((r) => r.ratioPct !== null)
                  .sort((a, b) => (b.ratioPct ?? 0) - (a.ratioPct ?? 0))
                  .map((r) => ({ name: r.branch, amount: r.ratioPct ?? 0, secondary: formatCompactRial(r.unpaid) }))}
                amountLabel="نسبت (٪)"
                secondaryLabel="مانده"
                formatAmount={formatPercent}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          نسبت مانده مطالبات به فروش
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard title="نسبت مانده به فروش — به تفکیک ویزیتور" height={420} loading={loading} empty={!loading && (ratio?.byVisitor.length ?? 0) === 0}>
            {ratio && (
              <RankedAmountTable
                rows={ratio.byVisitor
                  .filter((r) => r.ratioPct !== null)
                  .map((r) => ({ name: r.visitor, amount: r.ratioPct ?? 0, secondary: formatCompactRial(r.unpaid) }))}
                amountLabel="نسبت (٪)"
                secondaryLabel="مانده"
                formatAmount={formatPercent}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          یادداشت‌های مدیریتی درباره‌ی مانده مطالبات
        </Typography>
        <CommentThread targetType="receivables" targetId="overview" targetLabel="مانده مطالبات" />
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
