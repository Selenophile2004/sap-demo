import { Paper, Typography, Box, Skeleton } from "@mui/material";
import type { ComponentType } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "./Sparkline";
import { surface } from "../../app/theme/palette";

interface Props {
  title: string;
  value: string;
  icon?: ComponentType<{ size?: number }>;
  trendPct?: number | null;
  subtitle?: string;
  loading?: boolean;
  sparkline?: number[];
}

export default function KpiCard({ title, value, icon: Icon, trendPct, subtitle, loading, sparkline }: Props) {
  const trendPositive = typeof trendPct === "number" && trendPct >= 0;
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        p: 1.75,
        borderRadius: 1.25,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minHeight: 92,
        overflow: "hidden",
        transition: "transform .22s cubic-bezier(.2,.8,.3,1.1), box-shadow .22s ease, border-color .22s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: surface.borderStrong,
          boxShadow: "0 14px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(248,177,123,0.08)",
        },
        "&:hover .kpi-accent": { opacity: 1 },
      }}
    >
      <Box
        className="kpi-accent"
        sx={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 3,
          opacity: 0.5,
          transition: "opacity .22s ease",
          backgroundImage: "linear-gradient(180deg, #EA2228, #F8B17B)",
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(234,34,40,0.12)",
              color: "primary.light",
              flexShrink: 0,
              transition: "transform .25s cubic-bezier(.34,1.56,.64,1), background-color .2s ease",
              ".MuiPaper-root:hover &": {
                transform: "scale(1.12) rotate(-4deg)",
                bgcolor: "rgba(234,34,40,0.2)",
              },
            }}
          >
            <Icon size={13} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1, flexGrow: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          {loading ? (
            <Skeleton variant="text" width={70} height={28} sx={{ bgcolor: surface.glassHover }} />
          ) : (
            <Typography variant="subtitle1" fontWeight={800} sx={{ direction: "ltr", textAlign: "right", fontSize: 16, lineHeight: 1.25 }}>
              {value}
            </Typography>
          )}
          {(subtitle || typeof trendPct === "number") && !loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              {typeof trendPct === "number" && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                    color: trendPositive ? "#4ADE80" : "#F87171",
                  }}
                >
                  {trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10.5 }}>
                    {Math.abs(trendPct).toFixed(1)}٪
                  </Typography>
                </Box>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {!loading && sparkline && sparkline.length > 1 && (
          <Box sx={{ flexShrink: 0, opacity: 0.9 }}>
            <Sparkline data={sparkline} color="auto" width={72} height={30} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
