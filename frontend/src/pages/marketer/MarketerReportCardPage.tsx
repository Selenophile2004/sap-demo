import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography, Grid, Paper, Autocomplete, TextField, Chip } from "@mui/material";
import { Users, Target, TrendingUp, Percent, ReceiptText, Wallet, Sparkles, Scale } from "lucide-react";
import { marketerApi, type MarketerScorecard, type MarketerListItem } from "../../lib/api/marketerApi";
import { alertsApi, type AlertItem } from "../../lib/api/alertsApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import MarketerComboChart from "../../components/charts/MarketerComboChart";
import CustomerYearTrendChart from "../../components/charts/CustomerYearTrendChart";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import ItemQtyTreemap from "../../components/charts/ItemQtyTreemap";
import RankedAmountTable from "../../components/common/RankedAmountTable";
import CommentThread from "../../components/common/CommentThread";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import ActiveBasketToggle from "../../components/common/ActiveBasketToggle";
import { useGlobalFilters } from "../../app/store/filtersStore";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";

const MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

const SEVERITY_LABEL = { critical: "بحرانی", warning: "هشدار", notice: "توجه" } as const;
const SEVERITY_COLOR = { critical: "error", warning: "warning", notice: "default" } as const;
const STATUS_COLOR = { "فعال": "success", "ترک کار": "error", "نامشخص": "default" } as const;

export default function MarketerReportCardPage() {
  const { dateFrom, dateTo, years, months, isActive } = useGlobalFilters();
  const [searchParams] = useSearchParams();
  const visitorParam = searchParams.get("visitor");
  const [visitors, setVisitors] = useState<MarketerListItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeBasketOnly, setActiveBasketOnly] = useState(false);
  const [data, setData] = useState<MarketerScorecard | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drillDown, setDrillDown] = useState<{
    title: string;
    columns: [string, string] | [string, string, string];
    rows: DrillDownRow[];
  } | null>(null);

  useEffect(() => {
    marketerApi.list().then((v) => {
      setVisitors(v);
      const preselected = visitorParam && v.some((x) => x.name === visitorParam) ? visitorParam : v[0]?.name ?? null;
      setSelected(preselected);
    });
    alertsApi.list().then((r) => setAlerts(r.alerts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    marketerApi
      .scorecard(selected, {
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
        years,
        months,
        activeBasketOnly,
      })
      .then(setData)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, activeBasketOnly, dateFrom, dateTo, JSON.stringify(years), JSON.stringify(months)]);

  const periodLabel = isActive() ? "بازه انتخابی" : "این ماه";

  const relatedAlerts = alerts.filter((a) => a.relatedEntity === selected);
  const selectedIndex = data ? data.receivablesByVisitor.findIndex((r) => r.visitor === selected) : -1;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            کارنامه بازاریاب
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            بازسازی صفحه‌ی «کارنامه بازاریاب» پاور بی‌آی، به‌علاوه‌ی تحلیل و هشدار اختصاصی هر بازاریاب.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ActiveBasketToggle checked={activeBasketOnly} onChange={setActiveBasketOnly} />
          <Autocomplete
            size="small"
            options={visitors.map((v) => v.name)}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            sx={{ minWidth: 260 }}
            renderInput={(params) => <TextField {...params} label="انتخاب بازاریاب" />}
          />
        </Box>
      </Box>

      {/* تحلیل و هشدار مخصوص این بازاریاب */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 1, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Sparkles size={16} color="#F8B17B" />
          <Typography variant="subtitle2" fontWeight={700}>
            تحلیل کوتاه عملکرد {selected ?? ""}
          </Typography>
          {data && (
            <Chip
              size="small"
              label={data.employmentStatus}
              color={STATUS_COLOR[data.employmentStatus]}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: relatedAlerts.length ? 1.5 : 0 }}>
          {data?.analysis.map((line, i) => (
            <Typography key={i} variant="body2" color="text.secondary">
              • {line}
            </Typography>
          ))}
        </Box>
        {relatedAlerts.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {relatedAlerts.map((a) => (
              <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip size="small" label={SEVERITY_LABEL[a.severity]} color={SEVERITY_COLOR[a.severity]} sx={{ fontWeight: 700 }} />
                <Typography variant="body2">{a.title}</Typography>
              </Box>
            ))}
          </Box>
        )}
        {selected && <CommentThread targetType="marketer" targetId={selected} targetLabel={`کارنامه ${selected}`} />}
      </Paper>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title="مشتری خرید کرده" value={formatInt(data?.kpis.customersCount)} icon={Users} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title={`تارگت ${periodLabel} (کارتن)`} value={formatInt(data?.kpis.targetQtyTotal)} icon={Target} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title={`تحقق ${periodLabel} (سقف ۱۲۰٪)`} value={formatInt(data?.kpis.achievedCapped120)} icon={TrendingUp} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title={`درصد تحقق ${periodLabel}`} value={formatPercent(data?.kpis.achievementPct)} icon={Percent} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title="میانگین قلم هر فاکتور" value={(data?.kpis.avgLinesPerInvoice ?? 0).toFixed(1)} icon={ReceiptText} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard title="مانده مطالبات" value={formatCompactRial(data?.kpis.outstandingReceivables)} icon={Wallet} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <KpiCard
            title="نسبت مانده به فروش"
            value={formatPercent(data?.kpis.receivablesToSalesRatioPct)}
            icon={Scale}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title={`تارگت در برابر تحقق — ماهانه (${data?.monthlyTargetVsActual.year ?? "—"})`}
            height={340}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "تارگت در برابر تحقق — جزئیات",
                columns: ["ماه", "تحقق‌شده", "تارگت"],
                rows: (data?.monthlyTargetVsActual.points ?? []).map((p) => ({
                  label: MONTH_NAMES[p.month - 1] + (p.isCurrentMonth ? " (تا امروز)" : ""),
                  value: formatInt(p.actual),
                  secondary: formatInt(p.target),
                })),
              })
            }
          >
            {data && <MarketerComboChart points={data.monthlyTargetVsActual.points} />}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="روند تعداد مشتریان فعال (به تفکیک سال)"
            height={320}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "روند تعداد مشتریان فعال — جزئیات",
                columns: ["سال", "مجموع مشتریان (۱۲ ماه)"],
                rows: (data?.customerTrendByYear ?? []).map((y) => ({
                  label: y.year,
                  value: formatInt(y.points.reduce((s, p) => s + p.customers, 0)),
                })),
              })
            }
          >
            {data && <CustomerYearTrendChart data={data.customerTrendByYear} />}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="پراکندگی کالایی (۱۲ کالای برتر)"
            height={320}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "پراکندگی کالایی — جزئیات",
                columns: ["کالا", "تعداد"],
                rows: [...(data?.byItem ?? [])].sort((a, b) => b.qty - a.qty).map((i) => ({ label: i.item_name, value: formatInt(i.qty) })),
              })
            }
          >
            {data && <ItemQtyTreemap data={data.byItem} />}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="کالاهای برتر (بر اساس تعداد)"
            height={320}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "کالاهای برتر — جزئیات",
                columns: ["کالا", "تعداد"],
                rows: [...(data?.byItem ?? [])].sort((a, b) => b.qty - a.qty).map((i) => ({ label: i.item_name, value: formatInt(i.qty) })),
              })
            }
          >
            {data && (
              <SimpleBarChart
                labels={[...data.byItem].reverse().map((d) => d.item_name)}
                values={[...data.byItem].reverse().map((d) => d.qty)}
                valueFormatter={(v) => formatInt(v)}
              />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="هیستوگرام اندازه‌ی فاکتور"
            height={320}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "هیستوگرام اندازه‌ی فاکتور — جزئیات",
                columns: ["بازه", "تعداد فاکتور"],
                rows: (data?.invoiceBins ?? []).map((b) => ({ label: b.label, value: formatInt(b.count) })),
              })
            }
          >
            {data && (
              <SimpleBarChart
                labels={data.invoiceBins.map((b) => b.label)}
                values={data.invoiceBins.map((b) => b.count)}
                valueFormatter={(v) => formatInt(v)}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0, mb: 1 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard
            title="مانده مطالبات به تفکیک ویزیتور (بازاریاب انتخابی مشخص‌شده)"
            height={420}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "مانده مطالبات به تفکیک ویزیتور — جزئیات",
                columns: ["ویزیتور", "مانده پرداخت‌نشده"],
                rows: [...(data?.receivablesByVisitor ?? [])]
                  .sort((a, b) => b.unpaid - a.unpaid)
                  .map((d) => ({ label: d.visitor, value: formatCompactRial(d.unpaid) })),
              })
            }
          >
            {data && (
              <SimpleBarChart
                labels={[...data.receivablesByVisitor].reverse().map((d) => d.visitor)}
                values={[...data.receivablesByVisitor].reverse().map((d) => d.unpaid)}
                valueFormatter={(v) => formatCompactRial(v)}
                highlightIndex={selectedIndex >= 0 ? data.receivablesByVisitor.length - 1 - selectedIndex : undefined}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ChartCard title="مشتریان این بازاریاب" height={420} loading={loading} empty={!loading && (data?.customers.length ?? 0) === 0}>
            {data && (
              <RankedAmountTable
                rows={data.customers.map((c) => ({
                  name: c.name,
                  amount: c.totalAmount,
                  secondary: formatInt(c.invoiceCount),
                }))}
                amountLabel="فروش خالص"
                secondaryLabel="تعداد فاکتور"
              />
            )}
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
