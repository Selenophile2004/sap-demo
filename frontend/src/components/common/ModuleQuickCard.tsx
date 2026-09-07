import { Paper, Box, Typography, Skeleton } from "@mui/material";
import type { ComponentType } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { surface } from "../../app/theme/palette";

interface Props {
  title: string;
  value: string | null;
  subtitle: string;
  icon: ComponentType<{ size?: number }>;
  color: string;
  to: string;
}

export default function ModuleQuickCard({ title, value, subtitle, icon: Icon, color, to }: Props) {
  const navigate = useNavigate();
  return (
    <Paper
      elevation={0}
      onClick={() => navigate(to)}
      sx={{
        p: 3,
        borderRadius: 1,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        height: "100%",
        transition: "transform .25s cubic-bezier(.2,.8,.3,1.1), box-shadow .25s ease, border-color .25s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: `${color}55`,
          boxShadow: `0 16px 36px rgba(0,0,0,0.45), 0 0 0 1px ${color}22`,
        },
        "&:hover .quick-arrow": { transform: "translateX(-4px)", opacity: 1 },
        "&:hover .quick-glow": { opacity: 0.5 },
      }}
    >
      <Box
        className="quick-glow"
        sx={{
          position: "absolute",
          top: -40,
          insetInlineEnd: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          bgcolor: color,
          filter: "blur(50px)",
          opacity: 0.22,
          transition: "opacity .25s ease",
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${color}22`,
            color,
          }}
        >
          <Icon size={20} />
        </Box>
        <ArrowLeft
          size={16}
          className="quick-arrow"
          style={{ opacity: 0.4, transition: "all .25s ease" }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {value === null ? (
        <Skeleton variant="text" width="65%" height={34} sx={{ bgcolor: surface.glassHover }} />
      ) : (
        <Typography variant="h5" fontWeight={800} sx={{ direction: "ltr", textAlign: "right", mb: 0.5 }}>
          {value}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    </Paper>
  );
}
