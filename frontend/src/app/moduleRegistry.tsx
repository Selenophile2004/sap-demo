import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  AlertTriangle, Boxes, ClipboardList, DatabaseZap, Gauge, HeartHandshake, LineChart,
  Network, Settings2, ShoppingCart, Telescope, Truck, Users, Wallet, Warehouse, Factory, FileBarChart,
} from "lucide-react";
import { isModuleEnabled, moduleManifest, type ModuleManifestItem } from "./moduleManifest";

const pages: Record<string, LazyExoticComponent<ComponentType>> = {
  dashboard: lazy(() => import("../pages/DashboardHome")),
  sales: lazy(() => import("../pages/sales/SalesPage")),
  "marketer-scorecard": lazy(() => import("../pages/marketer/MarketerReportCardPage")),
  receivables: lazy(() => import("../pages/receivables/ReceivablesPage")),
  pnl: lazy(() => import("../pages/pnl/PnlPage")),
  hr: lazy(() => import("../pages/hr/HrPage")),
  inventory: lazy(() => import("../pages/inventory/InventoryPage")),
  alerts: lazy(() => import("../pages/alerts/AlertsPage")),
  forecast: lazy(() => import("../pages/forecast/ForecastPage")),
  scenario: lazy(() => import("../pages/analytics/ScenarioPlannerPage")),
  "executive-output": lazy(() => import("../pages/analytics/ExecutiveOutputPage")),
  "data-health": lazy(() => import("../pages/admin/DataHealthPage")),
  "module-registry": lazy(() => import("../pages/admin/ModuleRegistryPage")),
  "data-management": lazy(() => import("../pages/admin/DataManagementPage")),
};

const icons: Record<string, ComponentType<{ size?: number }>> = {
  dashboard: Gauge, sales: ShoppingCart, "marketer-scorecard": ClipboardList, receivables: Wallet,
  pnl: LineChart, hr: Users, inventory: Warehouse, alerts: AlertTriangle, forecast: Telescope,
  scenario: Settings2, "data-health": HeartHandshake, "module-registry": Network,
  "executive-output": FileBarChart,
  "data-management": DatabaseZap, "customer-quality": Boxes, production: Factory, supply: Truck,
};

export interface RegisteredModule extends ModuleManifestItem {
  icon: ComponentType<{ size?: number }>;
  enabled: boolean;
  page?: LazyExoticComponent<ComponentType>;
}

export const moduleRegistry: readonly RegisteredModule[] = Object.freeze(moduleManifest.map((item) => ({
  ...item,
  icon: icons[item.id] ?? Boxes,
  page: pages[item.id],
  enabled: isModuleEnabled(item),
})));

export const activeRouteModules = moduleRegistry.filter((item) => item.enabled && item.path && item.page);
