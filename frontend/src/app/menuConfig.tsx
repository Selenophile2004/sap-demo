import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  LineChart,
  Users,
  Warehouse,
  Factory,
  Truck,
  Telescope,
  AlertTriangle,
  ClipboardList,
  HeartHandshake,
  CalendarClock,
} from "lucide-react";
import type { MenuItem } from "../types/menu";

export const menuItems: MenuItem[] = [
  { label: "داشبورد", path: "/", icon: LayoutDashboard },

  { label: "فروش", path: "/sales", icon: ShoppingCart, section: "فروش و بازاریابی" },
  { label: "کارنامه بازاریاب", path: "/marketer-scorecard", icon: ClipboardList },

  { label: "مانده مطالبات", path: "/receivables", icon: Wallet, section: "مالی" },
  { label: "سود و زیان", path: "/pnl", icon: LineChart },

  { label: "پرسنل", path: "/hr", icon: Users, section: "سازمان و انبار" },
  { label: "رسوب انبار", path: "/inventory", icon: Warehouse },

  { label: "هشدارها", path: "/alerts", icon: AlertTriangle, section: "تحلیل و آینده‌نگری" },
  { label: "چشم‌انداز آینده", path: "/forecast", icon: Telescope },

  { label: "پلنر", icon: CalendarClock, comingSoon: true, section: "به‌زودی" },
  { label: "کیفیت و شکایات مشتریان", icon: HeartHandshake, comingSoon: true },
  { label: "گزارشات تولید", icon: Factory, comingSoon: true },
  { label: "گزارشات تامین", icon: Truck, comingSoon: true },
];
