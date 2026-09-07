import { useEffect, useState } from "react";
import { Box, Typography, Grid, Paper, Chip } from "@mui/material";
import {
  Wallet,
  ShoppingCart,
  UserX,
  LineChart as LineChartIcon,
  Users2,
  UserMinus,
  ShieldAlert,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { alertsApi, type AlertsResponse, type AlertItem, type AlertCategory } from "../../lib/api/alertsApi";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";
import AlertDetailModal from "../../components/alerts/AlertDetailModal";
import CommentThread from "../../components/common/CommentThread";
import { surface } from "../../app/theme/palette";

const CATEGORY_ICON: Record<AlertCategory, typeof Wallet> = {
  receivables: Wallet,
  sales: ShoppingCart,
  customers: UserX,
  margin: LineChartIcon,
  concentration: Users2,
  hr: UserMinus,
  data: Tags,
};

const SEVERITY_LABEL = { critical: "بحرانی", warning: "هشدار", notice: "توجه" } as const;
const SEVERITY_COLOR = { critical: "error", warning: "warning", notice: "default" } as const;

function formatMetric(a: AlertItem): string {
  if (a.metricLabel.includes("ریال")) return formatCompactRial(a.metricValue);
  if (a.metricLabel.includes("٪") || a.metricLabel.includes("درصد")) return formatPercent(a.metricValue);
  return formatInt(a.metricValue);
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailAlert, setDetailAlert] = useState<AlertItem | null>(null);

  useEffect(() => {
    alertsApi
      .list()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>
          هشدارها
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          این صفحه به‌صورت خودکار روی داده‌های فعال (فروش، مانده مطالبات، سود و زیان، پرسنل) قواعد
          هشداردهی اجرا می‌کند. با فعال شدن ماژول‌های دیگر، قواعد بیشتری اضافه خواهد شد.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 1, borderColor: "rgba(239,68,68,0.35)" }}>
            <Typography variant="caption" color="text.secondary">
              بحرانی
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: "#F87171" }}>
              {formatInt(data?.summary.critical)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 1, borderColor: "rgba(251,191,36,0.35)" }}>
            <Typography variant="caption" color="text.secondary">
              هشدار
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: "#FBBF24" }}>
              {formatInt(data?.summary.warning)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              توجه
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: "text.secondary" }}>
              {formatInt(data?.summary.notice)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {!loading && data?.alerts.length === 0 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 1, textAlign: "center" }}>
          <ShieldCheck size={32} color="#4ADE80" style={{ marginBottom: 8 }} />
          <Typography variant="body1" fontWeight={700}>
            هیچ هشدار فعالی وجود ندارد
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {data?.alerts.map((a) => {
          const Icon = CATEGORY_ICON[a.category];
          const canDrillDown = !!a.relatedEntity;
          return (
            <Grid key={a.id} size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  display: "flex",
                  gap: 1.5,
                  height: "100%",
                  borderInlineStart: `3px solid ${
                    a.severity === "critical" ? "#F87171" : a.severity === "warning" ? "#FBBF24" : surface.borderStrong
                  }`,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: surface.glassHover,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={17} />
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      onClick={canDrillDown ? () => setDetailAlert(a) : undefined}
                      sx={canDrillDown ? { cursor: "pointer", "&:hover": { textDecoration: "underline" } } : undefined}
                    >
                      {a.title}
                    </Typography>
                    <Chip
                      size="small"
                      icon={<ShieldAlert size={12} />}
                      label={SEVERITY_LABEL[a.severity]}
                      color={SEVERITY_COLOR[a.severity]}
                      sx={{ fontWeight: 700, flexShrink: 0 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {a.description}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, direction: "ltr", display: "inline-block" }}>
                    {formatMetric(a)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {a.metricLabel}
                  </Typography>
                  <CommentThread targetType="alert" targetId={a.id} targetLabel={a.title} collapsible />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {detailAlert && (
        <AlertDetailModal
          open={!!detailAlert}
          onClose={() => setDetailAlert(null)}
          title={detailAlert.title}
          category={detailAlert.category}
          entity={detailAlert.relatedEntity ?? ""}
        />
      )}
    </Box>
  );
}
