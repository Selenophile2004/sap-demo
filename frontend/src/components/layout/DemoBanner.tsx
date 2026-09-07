import { Box, Typography } from "@mui/material";
import { AlertTriangle } from "lucide-react";
import { brand } from "../../app/theme/palette";

// نوار مخصوص نسخه‌ی نمایشی (پورتفولیو) — این کامپوننت فقط در کپی دمو پروژه وجود
// دارد و در نسخه‌ی اصلی/تولیدی SSAP نیست. هدف: یادآوری واضح و همیشگی به بازدیدکننده
// که تمام داده‌های این نسخه کاملاً فرضی هستند، بدون این‌که چیدمان صفحه را به‌هم بزند.
export default function DemoBanner() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        px: 2,
        py: 0.6,
        textAlign: "center",
        backgroundImage: `linear-gradient(90deg, ${brand.primaryDark}, ${brand.primary})`,
        color: "#fff",
      }}
    >
      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
      <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1.4 }}>
        نسخه نمایشی — تمام داده‌های این صفحه کاملاً فرضی هستند و هیچ ارتباطی با اطلاعات واقعی شرکت ندارند
      </Typography>
    </Box>
  );
}
