import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
} from "@mui/material";
import { Package, AlertOctagon, Archive, Warehouse, Search } from "lucide-react";
import { inventoryApi, type InventorySummary, type InventoryItem } from "../../lib/api/inventoryApi";
import KpiCard from "../../components/common/KpiCard";
import ChartCard from "../../components/charts/ChartCard";
import GenericDonut from "../../components/charts/GenericDonut";
import SimpleBarChart from "../../components/charts/SimpleBarChart";
import RankedAmountTable from "../../components/common/RankedAmountTable";
import DrillDownModal, { type DrillDownRow } from "../../components/charts/DrillDownModal";
import { formatCompactRial, formatInt } from "../../lib/format";
import { surface } from "../../app/theme/palette";

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

// دو نکته نسبت به نسخه‌ی قبلی این رنگ‌ها اصلاح شد: «موجودی خیلی بالا» با «نیاز به
// شارژ فوری» رنگ یکسان داشت (دو وضعیت کاملاً متضاد در نمودار وضعیت غیرقابل‌تشخیص
// می‌شدند)؛ و زرد روشنِ «موجودی بالا» با متن سفیدِ Chip کنتراست خیلی کمی داشت.
const STATUS_COLOR: Record<string, string> = {
  "بدون موجودی": "#E74C3C",
  "نیاز به شارژ فوری": "#E67E22",
  "شارژ به‌زودی": "#F39C12",
  "موجودی مناسب": "#2ECC71",
  "موجودی بالا": "#D4AC0D",
  "موجودی خیلی بالا": "#8E44AD",
  "رسوب (بدون فروش)": "#95A5A6",
  "رسوب (بیش از ۳ ماه)": "#7F8C8D",
};

export default function InventoryPage() {
  const [data, setData] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{
    title: string;
    columns: [string, string] | [string, string, string];
    rows: DrillDownRow[];
  } | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    inventoryApi
      .summary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      inventoryApi
        .items(search.trim())
        .then(setSearchResults)
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const stagnantCount = data?.byStatus.find((s) => s.status === "رسوب (بیش از ۳ ماه)")?.count ?? 0;
  const noSaleCount = data?.byStatus.find((s) => s.status === "رسوب (بدون فروش)")?.count ?? 0;
  const urgentCount = data?.byStatus.find((s) => s.status === "نیاز به شارژ فوری")?.count ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          رسوب انبار
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          موجودی لحظه‌ای هر کالا (Data/انبار.xlsx) در برابر سرعت فروش ۳۰ روز اخیر — روزهای پوشش موجودی (DIO) و
          دسته‌بندی وضعیت از همین دو منبع محاسبه می‌شود، مستقل از پاور بی‌آی.
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 1, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="جست‌وجوی کالا با نام یا کد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
        {search.trim() && (
          <TableContainer sx={{ mt: 2, maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>کد کالا</TableCell>
                  <TableCell sx={headerSx}>نام کالا</TableCell>
                  <TableCell sx={headerSx} align="center">
                    موجودی قابل فروش
                  </TableCell>
                  <TableCell sx={headerSx} align="center">
                    کارتن
                  </TableCell>
                  <TableCell sx={headerSx} align="center">
                    DIO (روز)
                  </TableCell>
                  <TableCell sx={headerSx} align="center">
                    وضعیت
                  </TableCell>
                  <TableCell sx={headerSx} align="left">
                    ارزش تقریبی
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((i) => (
                  <TableRow key={i.itemCode} hover>
                    <TableCell sx={{ direction: "ltr", textAlign: "right" }}>{i.itemCode}</TableCell>
                    <TableCell>{i.itemName}</TableCell>
                    <TableCell align="center">{formatInt(i.sellableQty)}</TableCell>
                    <TableCell align="center">{i.sellableCartons !== null ? i.sellableCartons.toFixed(1) : "—"}</TableCell>
                    <TableCell align="center">{i.dio !== null ? formatInt(i.dio) : "—"}</TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={i.status} sx={{ bgcolor: STATUS_COLOR[i.status] ?? "#BDC3C7", color: "#fff", fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="left" sx={{ direction: "ltr" }}>
                      {formatCompactRial(i.estimatedValue)}
                    </TableCell>
                  </TableRow>
                ))}
                {!searchLoading && searchResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                      کالایی با این نام/کد پیدا نشد.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="تعداد کد کالا" value={formatInt(data?.totalSkus)} icon={Package} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="ارزش تقریبی کل موجودی"
            value={formatCompactRial(data?.totalEstimatedValue)}
            subtitle="بر مبنای میانگین فی فروش اخیر"
            icon={Archive}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="رسوب (بدون فروش / بیش از ۳ ماه)"
            value={formatInt(noSaleCount + stagnantCount)}
            subtitle="تعداد کد کالا"
            icon={AlertOctagon}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="نیاز به شارژ فوری" value={formatInt(urgentCount)} subtitle="تعداد کد کالا" icon={Warehouse} loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ChartCard
            title="وضعیت موجودی به تفکیک تعداد کد کالا"
            height={360}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "وضعیت موجودی — جزئیات",
                columns: ["وضعیت", "تعداد کد کالا", "ارزش تقریبی"],
                rows: [...(data?.byStatus ?? [])]
                  .sort((a, b) => b.count - a.count)
                  .map((s) => ({ label: s.status, value: formatInt(s.count), secondary: formatCompactRial(s.estimatedValue) })),
              })
            }
          >
            {data && (
              <GenericDonut
                labels={data.byStatus.map((s) => s.status)}
                values={data.byStatus.map((s) => s.count)}
                colors={data.byStatus.map((s) => STATUS_COLOR[s.status] ?? "#BDC3C7")}
                valueFormatter={(v) => formatInt(v)}
              />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ChartCard
            title="موجودی به تفکیک انبار (مقدار قابل فروش)"
            height={360}
            loading={loading}
            onDrillDown={() =>
              setDrillDown({
                title: "موجودی به تفکیک انبار — جزئیات",
                columns: ["انبار", "مقدار قابل فروش", "تعداد کد کالا"],
                rows: [...(data?.byWarehouse ?? [])]
                  .sort((a, b) => b.totalQty - a.totalQty)
                  .map((w) => ({ label: w.warehouse_name, value: formatInt(w.totalQty), secondary: formatInt(w.itemCount) })),
              })
            }
          >
            {data && (
              <SimpleBarChart
                labels={[...data.byWarehouse].reverse().map((w) => w.warehouse_name)}
                values={[...data.byWarehouse].reverse().map((w) => w.totalQty)}
                valueFormatter={(v) => formatInt(v)}
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="کالاهای راکد (رسوب) — بیشترین ارزش" height={460} loading={loading} empty={!loading && (data?.stagnant.length ?? 0) === 0}>
            {data && (
              <RankedAmountTable
                rows={data.stagnant.map((i) => ({
                  name: i.itemName,
                  amount: i.estimatedValue,
                  secondary: i.status,
                }))}
                amountLabel="ارزش تقریبی"
                secondaryLabel="وضعیت"
              />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="نیازمند شارژ فوری — بیشترین سرعت فروش" height={460} loading={loading} empty={!loading && (data?.urgentRecharge.length ?? 0) === 0}>
            {data && (
              <RankedAmountTable
                rows={data.urgentRecharge.map((i) => ({
                  name: i.itemName,
                  amount: i.estimatedValue,
                  secondary: `${i.avgDailySales.toFixed(1)} عدد/روز`,
                }))}
                amountLabel="ارزش موجودی فعلی"
                secondaryLabel="سرعت فروش"
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
