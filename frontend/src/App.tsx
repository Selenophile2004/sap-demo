import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/layout/RequireAuth";
import RequirePermission from "./components/layout/RequirePermission";
import { activeRouteModules } from "./app/moduleRegistry";

// هر حوزه مدیریتی یک chunk مستقل است؛ بنابراین مدیر برای دیدن صفحه ورود یا
// داشبورد اولیه مجبور به دریافت کد تمام گزارش‌ها و نمودارها نیست.
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ProductGroupsPage = lazy(() => import("./pages/sales/ProductGroupsPage"));

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
            {activeRouteModules.filter((module) => !module.requiredPermission).map((module) => {
              const Page = module.page!;
              return <Route key={module.id} path={module.path} element={<Page />} />;
            })}
            {activeRouteModules.filter((module) => module.requiredPermission).map((module) => {
              const Page = module.page!;
              return (
                <Route key={module.id} element={<RequirePermission permission={module.requiredPermission!} />}>
                  <Route path={module.path} element={<Page />} />
                </Route>
              );
            })}
            <Route path="/sales/product-groups" element={<ProductGroupsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
