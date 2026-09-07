import { Box, Typography } from "@mui/material";
import { Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { surface } from "../../app/theme/palette";

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// تاریخ شمسی و ساعت لحظه‌ای بالای دشبورد — با Intl.DateTimeFormat بومی مرورگر
// (تقویم فارسی + ارقام فارسی)، بدون نیاز به کتابخانه‌ی جداگانه‌ی تبدیل تاریخ.
export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
        <Calendar size={14} />
        <Typography variant="caption" fontWeight={600}>
          {dateFormatter.format(now)}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.4,
          borderRadius: 1,
          bgcolor: surface.glassHover,
          border: `1px solid ${surface.border}`,
        }}
      >
        <Clock size={14} />
        <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {timeFormatter.format(now)}
        </Typography>
      </Box>
    </Box>
  );
}
