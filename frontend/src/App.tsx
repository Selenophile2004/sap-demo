import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/layout/RequireAuth";
import RequirePermission from "./components/layout/RequirePermission";

// هر حوزه مدیریتی یک chunk مستقل است؛ بنابراین مدیر برای دیدن صفحه ورود یا
// داشبورد اولیه مجبور به دریافت کد تمام گزارش‌ها و نمودارها نیست.
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const SalesPage = lazy(() => import("./pages/sales/SalesPage"));
const ProductGroupsPage = lazy(() => import("./pages/sales/ProductGroupsPage"));
const ReceivablesPage = lazy(() => import("./pages/receivables/ReceivablesPage"));
const PnlPage = lazy(() => import("./pages/pnl/PnlPage"));
const HrPage = lazy(() => import("./pages/hr/HrPage"));
const ForecastPage = lazy(() => import("./pages/forecast/ForecastPage"));
const AlertsPage = lazy(() => import("./pages/alerts/AlertsPage"));
const MarketerReportCardPage = lazy(() => import("./pages/marketer/MarketerReportCardPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const DataManagementPage = lazy(() => import("./pages/admin/DataManagementPage"));

function RouteFallback() {
  return (
    <Box sx={{ minHeight: "45vh", display: "grid", placeItems: "center" }} role="status" aria-label="در حال بارگذاری صفحه">
      <CircularProgress size={32} />
    </Box>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/sales/product-groups" element={<ProductGroupsPage />} />
            <Route path="/receivables" element={<ReceivablesPage />} />
            <Route path="/pnl" element={<PnlPage />} />
            <Route path="/hr" element={<HrPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/marketer-scorecard" element={<MarketerReportCardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route element={<RequirePermission permission="data:write" />}>
              <Route path="/data-management" element={<DataManagementPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
