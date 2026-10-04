import type { MenuItem } from "../types/menu";
import { moduleRegistry } from "./moduleRegistry";

export const menuItems: MenuItem[] = moduleRegistry
  .filter((module) => module.enabled || module.status === "coming-soon")
  .map((module) => ({
    label: module.label,
    path: module.path,
    icon: module.icon,
    section: module.section,
    requiredPermission: module.requiredPermission,
    comingSoon: module.status === "coming-soon",
  }));
