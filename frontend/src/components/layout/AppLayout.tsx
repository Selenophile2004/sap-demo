import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import GlobalFilterBar from "./GlobalFilterBar";
import DemoBanner from "./DemoBanner";
import AssistantWidget from "../assistant/AssistantWidget";
import ExecutiveOverviewModal from "../assistant/ExecutiveOverviewModal";
import { brandGrey } from "../../app/theme/palette";
import ampersand from "../../assets/logo-ampersand.png";

// فیلتر زمانی سراسری فقط روی صفحاتی نمایش داده می‌شود که واقعاً از dateFrom/dateTo/
// years/months استفاده می‌کنند (فروش، کارنامه بازاریاب، مانده مطالبات، سود و زیان).
// صفحات هشدارها/چشم‌انداز آینده/رسوب انبار/پرسنل/مدیریت گروه‌بندی کالا/داشبورد
// همیشه روی کل تاریخچه یا یک منطق زمانی مستقل (مثلاً «عکس فوری وضعیت فعلی» در
// داشبورد، دقیقاً مثل خلاصه‌ی سود و زیان) کار می‌کنند؛ نشان‌دادن این فیلتر روی
// آن‌ها گمراه‌کننده است چون هیچ اثری ندارد.
const FILTER_AWARE_PATHS = new Set(["/sales", "/marketer-scorecard", "/receivables", "/pnl"]);

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const showFilterBar = FILTER_AWARE_PATHS.has(location.pathname);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%" }}>
      {/* واترمارک سراسری «&» — نسخه‌ی بی‌رنگ و بسیار کم‌رنگِ نشان ILIA، پشت همه‌ی
          صفحات، هم‌خانواده با bodyGradient در palette.ts (همان تکنیک لایه‌ی بک‌گراند
          محیطی، نه یک لوگوی چسبانده‌شده). z-index منفی تضمین می‌کند همیشه پشت
          محتوای واقعی (حتی بدون z-index صریح) بماند اما جلوی canvas background بدنه. */}
      <Box
        component="img"
        src={ampersand}
        alt=""
        aria-hidden="true"
        sx={{
          position: "fixed",
          zIndex: -1,
          top: { xs: "-8%", md: "-15%" },
          insetInlineEnd: { xs: "-30%", md: "-8%" },
          width: { xs: "120vw", sm: "85vw", md: "52vw" },
          maxWidth: 900,
          height: "auto",
          opacity: (theme) => (theme.palette.mode === "dark" ? 0.05 : 0.045),
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
      <DemoBanner />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onOpenMobileMenu={() => setMenuOpen(true)} />
      {showFilterBar && <GlobalFilterBar />}
      <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, minWidth: 0 }}>
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{
          textAlign: "center",
          py: 2,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" sx={{ color: brandGrey, opacity: 0.8, letterSpacing: 0.2 }}>
          Mindway — Powered by ILIA
        </Typography>
      </Box>
      <AssistantWidget />
      <ExecutiveOverviewModal />
    </Box>
  );
}
