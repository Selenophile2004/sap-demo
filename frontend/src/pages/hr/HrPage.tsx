import { useEffect, useState } from "react";
import { Box, Typography, Grid, MenuItem, TextField } from "@mui/material";
import { Users, Wallet } from "lucide-react";
import { hrApi, type HrKpis, type HeadcountTrendRow, type SalaryTrendRow, type OrgUnitRow } from "../../lib/api/hrApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import SimpleLineChart from "../../components/charts/SimpleLineChart";
import GenericDonut from "../../components/charts/GenericDonut";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import { formatCompactRial, formatInt } from "../../lib/format";

export default function HrPage() {
  const [year, setYear] = useState<number | "">("");
  const [kpis, setKpis] = useState<HrKpis | null>(null);
  const [headcountTrend, setHeadcountTrend] = useState<HeadcountTrendRow[]>([]);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [salaryTrend, setSalaryTrend] = useState<SalaryTrendRow[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ title: string; columns: [string, string]; rows: DrillDownRow[] } | null>(
    null
  );

  useEffect(() => {
    // نمودار روند: فقط ۳۶ ماه اخیر (تاریخچه‌ی کامل ممکن است دهه‌ها و عمدتاً خالی باشد)
    hrApi.headcountTrend(36).then(setHeadcountTrend);
    // فهرست سال‌ها برای فیلتر: از کل تاریخچه
    hrApi.headcountTrend(0).then((rows) => {
      setYearOptions(Array.from(new Set(rows.map((r) => r.year_jalali))).sort((a, b) => b - a));
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [k, s, ou] = await Promise.all([
          hrApi.kpis(year || undefined),
          hrApi.salaryTrend(),
          hrApi.orgUnitBreakdown(year || undefined),
        ]);
        setKpis(k);
        setSalaryTrend(s);
        setOrgUnits(ou);
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          پرسنل
        </Typography>
      </Box>

      <TextField
        select
        size="small"
        label="سال"
        value={year}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
        sx={{ minWidth: 160, mb: 3 }}
      >
        <MenuItem value="">همه سال‌ها (آخرین)</MenuItem>
        {yearOptions.map((y) => (
          <MenuItem key={y} value={y}>
            {y}
          </MenuItem>
        ))}
      </TextField>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="تعداد پرسنل فعال"
            value={formatInt(kpis?.headcount)}
            icon={Users}
            loading={loading}
            sparkline={headcountTrend.map((h) => h.headcount)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="سرانه حقوق (میانگین کلی)"
            value={formatCompactRial(kpis?.latestSalaryPerCapita)}
            subtitle={kpis?.latestSalaryPeriod ?? undefined}
            icon={Wallet}
            loading={loading}
            sparkline={salaryTrend.map((s) => s.salary_per_capita_rial)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="روند تعداد پرسنل (۳۶ ماه اخیر)"
            loading={headcountTrend.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "روند تعداد پرسنل — جزئیات",
                columns: ["ماه", "تعداد"],
                rows: [...headcountTrend]
                  .reverse()
                  .map((h) => ({ label: `${h.month_name} ${h.year_jalali}`, value: formatInt(h.headcount) })),
              })
            }
          >
            <SimpleLineChart
              labels={headcountTrend.map((h) => `${h.month_name} ${h.year_jalali}`)}
              values={headcountTrend.map((h) => h.headcount)}
              valueFormatter={(v) => formatInt(v)}
              color="#4ADE80"
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="روند سرانه حقوق (ماهانه)"
            loading={loading}
            empty={!loading && salaryTrend.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "روند سرانه حقوق — جزئیات",
                columns: ["ماه", "سرانه حقوق"],
                rows: [...salaryTrend]
                  .reverse()
                  .map((s) => ({ label: `${s.month_name} ${s.year_jalali}`, value: formatCompactRial(s.salary_per_capita_rial) })),
              })
            }
          >
            <SimpleLineChart
              labels={salaryTrend.map((s) => `${s.month_name} ${s.year_jalali}`)}
              values={salaryTrend.map((s) => s.salary_per_capita_rial)}
              valueFormatter={(v) => formatCompactRial(v)}
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard
            title="ترکیب پرسنل بر اساس واحد سازمانی"
            loading={loading}
            empty={!loading && orgUnits.length === 0}
            onDrillDown={() =>
              setDrillDown({
                title: "ترکیب پرسنل بر اساس واحد سازمانی — جزئیات",
                columns: ["واحد سازمانی", "تعداد نفر"],
                rows: [...orgUnits]
                  .sort((a, b) => b.count - a.count)
                  .map((o) => ({ label: o.orgUnit, value: formatInt(o.count) })),
              })
            }
          >
            <GenericDonut
              labels={orgUnits.map((o) => o.orgUnit)}
              values={orgUnits.map((o) => o.count)}
              valueFormatter={(v) => formatInt(v)}
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
