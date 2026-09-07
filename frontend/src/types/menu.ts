import type { ComponentType } from "react";

export interface MenuItem {
  label: string;
  path?: string;
  icon: ComponentType<{ size?: number }>;
  comingSoon?: boolean;
  /** اگر با آیتم قبلی فرق کند، یک تیتر بخش کوچک قبل از این آیتم نمایش داده می‌شود. */
  section?: string;
}
