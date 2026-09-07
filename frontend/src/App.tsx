import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import DashboardHome from "./pages/DashboardHome";
import SalesPage from "./pages/sales/SalesPage";
import ProductGroupsPage from "./pages/sales/ProductGroupsPage";
import ReceivablesPage from "./pages/receivables/ReceivablesPage";
import PnlPage from "./pages/pnl/PnlPage";
import HrPage from "./pages/hr/HrPage";
import ForecastPage from "./pages/forecast/ForecastPage";
import AlertsPage from "./pages/alerts/AlertsPage";
import MarketerReportCardPage from "./pages/marketer/MarketerReportCardPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/layout/RequireAuth";

export default function App() {
  return (
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
