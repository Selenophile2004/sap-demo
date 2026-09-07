import { Box, Chip, Paper, Typography } from "@mui/material";
import { Maximize2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { surface } from "../../app/theme/palette";

export interface RankedListItem {
  key: string;
  name: string;
  subtitle?: string;
  value: string;
  onClick?: () => void;
}

interface Props {
  title: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  items: RankedListItem[];
  loading?: boolean;
  emptyText?: string;
  caption?: ReactNode;
  onDrillDown?: () => void;
}

// الگوی مشترک لیست‌های رتبه‌بندی‌شده‌ی صفحه‌ی اول (۵ ویزیتور برتر، ۵ مرکز مانده
// مطالبات، و لیست‌های سودآوری) — برای جلوگیری از تکرار JSX یکسان در چند بخش.
export default function RankedListCard({
  title,
  icon: Icon,
  iconColor,
  items,
  loading,
  emptyText,
  caption,
  onDrillDown,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, borderRadius: 1.25, height: "100%", "&:hover .drilldown-hint": { opacity: 1 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: caption ? 0.5 : 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon size={17} color={iconColor} />
          <Typography variant="subtitle1" fontWeight={800}>
            {title}
          </Typography>
        </Box>
        {onDrillDown && !loading && items.length > 0 && (
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
      </Box>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {caption}
        </Typography>
      )}

      {loading && (
        <Typography variant="body2" color="text.secondary">
          در حال بارگذاری...
        </Typography>
      )}
      {!loading && items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {emptyText ?? "داده‌ای موجود نیست."}
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item, i) => (
          <Box
            key={item.key}
            onClick={item.onClick}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              cursor: item.onClick ? "pointer" : "default",
              "&:hover": item.onClick ? { bgcolor: surface.glassHover } : undefined,
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
                bgcolor: i === 0 ? `${iconColor}33` : surface.glassHover,
                color: i === 0 ? iconColor : "text.secondary",
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {item.name}
              </Typography>
              {item.subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {item.subtitle}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" fontWeight={700} sx={{ direction: "ltr", flexShrink: 0 }}>
              {item.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
