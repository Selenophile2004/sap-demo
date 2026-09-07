import { useState } from "react";
import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import GlobalFilterBar from "./GlobalFilterBar";
import DemoBanner from "./DemoBanner";
import AssistantWidget from "../assistant/AssistantWidget";

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
      <DemoBanner />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Header onOpenMobileMenu={() => setMenuOpen(true)} />
      {showFilterBar && <GlobalFilterBar />}
      <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, minWidth: 0 }}>
        <Outlet />
      </Box>
      <AssistantWidget />
    </Box>
  );
}
