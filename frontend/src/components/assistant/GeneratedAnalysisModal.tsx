import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Dialog, DialogContent, Grid, IconButton, Paper, Typography } from "@mui/material";
import { Bot, CalendarClock, ChevronDown, Download, Lightbulb, SearchCheck, ShieldCheck, X } from "lucide-react";
import type { AnalyticsPresentation, AnalyticsWidget } from "../../types/analytics";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";
import KpiCard from "../common/KpiCard";
import ChartCard from "../charts/ChartCard";
import SimpleLineChart from "../charts/SimpleLineChart";
import SimpleBarChart from "../charts/SimpleBarChart";
import GenericDonut from "../charts/GenericDonut";
import { brand, glassBlur, surface } from "../../app/theme/palette";

interface Props {
  open: boolean;
  presentation: AnalyticsPresentation | null;
  onClose: () => void;
}

function formatWidgetValue(widget: Extract<AnalyticsWidget, { type: "kpi" }>) {
  if (widget.unit === "rial") return formatCompactRial(widget.value);
  if (widget.unit === "percent") return formatPercent(widget.value);
  return formatInt(widget.value);
}

function formatter(unit: "rial" | "percent" | "count") {
  if (unit === "rial") return formatCompactRial;
  if (unit === "percent") return formatPercent;
  return formatInt;
}

function downloadPresentation(presentation: AnalyticsPresentation) {
  const blob = new Blob([JSON.stringify(presentation, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${presentation.topic}-analysis.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GeneratedAnalysisModal({ open, presentation, onClose }: Props) {
  if (!presentation) return null;
  const generatedAt = new Date(presentation.generatedAt).toLocaleString("fa-IR");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: surface.glassStrong,
            backgroundImage: "none",
            backdropFilter: glassBlur,
            border: `1px solid ${surface.borderStrong}`,
            borderRadius: 2,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3.5 },
          py: 2.5,
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          alignItems: "flex-start",
          borderBottom: `1px solid ${surface.border}`,
          backgroundImage: "linear-gradient(115deg, rgba(121,0,221,.18), transparent 56%)",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Bot size={20} color={brand.secondary} />
            <Typography variant="h6" fontWeight={850}>{presentation.title}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, lineHeight: 1.9 }}>
            {presentation.summary}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
            <Chip size="small" icon={<ShieldCheck size={14} />} label={presentation.sourceLabel} color="success" variant="outlined" />
            <Chip size="small" icon={<CalendarClock size={14} />} label={generatedAt} variant="outlined" />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          <Button size="small" startIcon={<Download size={15} />} onClick={() => downloadPresentation(presentation)} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            دریافت داده
          </Button>
          <IconButton onClick={onClose} aria-label="بستن تحلیل"><X size={19} /></IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: { xs: 2, md: 3.5 } }}>
        <Grid container spacing={2}>
          {presentation.widgets.map((widget, index) => {
            if (widget.type === "kpi") {
              return (
                <Grid key={`${widget.metricId}-${index}`} size={{ xs: 12, sm: 6, md: 3 }}>
                  <KpiCard title={widget.title} value={formatWidgetValue(widget)} trendPct={widget.trendPct} subtitle={widget.trendLabel} />
                </Grid>
              );
            }
            if (widget.type === "insight") {
              const color = widget.tone === "positive" ? "#4ADE80" : widget.tone === "warning" ? "#FBBF24" : brand.primaryLight;
              return (
                <Grid key={`${widget.title}-${index}`} size={12}>
                  <Paper elevation={0} sx={{ p: 2.25, display: "flex", alignItems: "flex-start", gap: 1.5, borderInlineStart: `3px solid ${color}` }}>
                    <Lightbulb size={20} color={color} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800}>{widget.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.8 }}>{widget.text}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              );
            }
            const series = widget.series[0];
            const valueFormatter = formatter(series.unit);
            return (
              <Grid key={`${widget.title}-${index}`} size={12}>
                <ChartCard title={widget.title} height={330}>
                  {widget.chartType === "line" ? (
                    <SimpleLineChart labels={widget.labels} values={series.values} valueFormatter={valueFormatter} />
                  ) : widget.chartType === "bar" ? (
                    <SimpleBarChart labels={widget.labels} values={series.values} valueFormatter={valueFormatter} />
                  ) : (
                    <GenericDonut labels={widget.labels} values={series.values} valueFormatter={valueFormatter} />
                  )}
                </ChartCard>
              </Grid>
            );
          })}
        </Grid>
        <Accordion disableGutters elevation={0} sx={{ mt: 2, border: `1px solid ${surface.border}`, "&::before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ChevronDown size={18} />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SearchCheck size={19} color={brand.secondary} />
              <Typography fontWeight={850}>چرا این نتیجه؟</Typography>
              <Chip size="small" color="success" variant="outlined" label="محاسبات قطعی" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              اعداد توسط مدل زبانی ساخته نشده‌اند. هر شاخص از کاتالوگ رسمی، فرمول مشخص و منبع زیر محاسبه شده است.
            </Typography>
            <Grid container spacing={1.25}>
              {presentation.explainability.evidence.map((item) => (
                <Grid key={item.metricId} size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 1.75, height: "100%" }}>
                    <Typography fontWeight={800}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{item.definition}</Typography>
                    <Typography variant="caption" sx={{ display: "block", mt: 1 }}><b>فرمول:</b> {item.formula}</Typography>
                    <Typography variant="caption" sx={{ display: "block" }}><b>منبع:</b> {item.source}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}><b>Snapshot:</b> {new Date(item.asOf).toLocaleString("fa-IR")}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {presentation.explainability.caveats.map((caveat) => <Typography key={caveat} variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>• {caveat}</Typography>)}
          </AccordionDetails>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
