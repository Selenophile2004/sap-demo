import { Paper, Typography, Box, Skeleton, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { Maximize2, Expand, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { surface } from "../../app/theme/palette";

interface Props {
  title: string;
  height?: number;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  onDrillDown?: () => void;
  maximizable?: boolean;
}

export default function ChartCard({
  title,
  height = 320,
  children,
  action,
  loading,
  empty,
  emptyMessage = "داده‌ای برای نمایش نیست",
  onDrillDown,
  maximizable = true,
}: Props) {
  const [maximized, setMaximized] = useState(false);
  const canMaximize = maximizable && !loading && !empty;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 1,
          height: "100%",
          transition: "border-color .2s ease",
          "&:hover": { borderColor: surface.borderStrong },
          "&:hover .drilldown-hint": { opacity: 1 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {action}
            {onDrillDown && !loading && !empty && (
              <Chip
                className="drilldown-hint"
                size="small"
                icon={<Maximize2 size={12} />}
                label="جزئیات"
                onClick={onDrillDown}
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
            {canMaximize && (
              <Tooltip title="بزرگ‌نمایی نمودار">
                <IconButton
                  size="small"
                  onClick={() => setMaximized(true)}
                  sx={{
                    color: "text.secondary",
                    width: 26,
                    height: 26,
                    "&:hover": { color: "text.primary", bgcolor: surface.glassHover },
                  }}
                >
                  <Expand size={15} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Box
          onClick={onDrillDown && !loading && !empty ? onDrillDown : undefined}
          sx={{ height, position: "relative", cursor: onDrillDown && !loading && !empty ? "pointer" : "default" }}
        >
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, justifyContent: "center", height: "100%" }}>
              <Skeleton variant="rounded" height="40%" sx={{ bgcolor: surface.glassHover, borderRadius: 1 }} />
              <Skeleton variant="rounded" height="25%" sx={{ bgcolor: surface.glassHover, borderRadius: 1 }} />
              <Skeleton variant="rounded" height="20%" sx={{ bgcolor: surface.glassHover, borderRadius: 1 }} />
            </Box>
          ) : empty ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">{emptyMessage}</Typography>
            </Box>
          ) : (
            // قبلاً اینجا با MUI Fade (بر پایه‌ی react-transition-group) پیچیده شده
            // بود؛ در ترکیب با StrictMode گاهی ترنزیشن هیچ‌وقت به opacity:1 نمی‌رسید
            // و کل نمودار (حلقه‌ی دونات/ستون‌های بار) نامرئی می‌ماند — یک باگ واقعی و
            // تکرارپذیر، نه فقط یک انیمیشن ناقص. رندر مستقیم این ریسک را کلاً حذف می‌کند.
            <Box sx={{ height: "100%" }}>{children}</Box>
          )}
        </Box>
      </Paper>
      {canMaximize && (
        <Dialog
          open={maximized}
          onClose={() => setMaximized(false)}
          maxWidth="lg"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                bgcolor: surface.glassStrong,
                backgroundImage: "none",
                borderRadius: 1,
                border: `1px solid ${surface.border}`,
              },
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Typography component="span" variant="h6" fontWeight={800}>
              {title}
            </Typography>
            <IconButton size="small" onClick={() => setMaximized(false)}>
              <X size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            <Box sx={{ height: "72vh", pt: 1 }}>{maximized && children}</Box>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
