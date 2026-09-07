import { Box, Typography, IconButton, Tooltip, Avatar, Chip } from "@mui/material";
import { RefreshCw, LogOut, Menu, Sun, Moon, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useEtlMetaStore } from "../../app/store/etlMetaStore";
import { useThemeModeStore } from "../../app/store/themeModeStore";
import { useNavigate } from "react-router-dom";
import { surface, glassBlur, brand } from "../../app/theme/palette";
import HelpDialog from "./HelpDialog";
import LiveClock from "./LiveClock";

const MODULE_LABEL_FA: Record<string, string> = {
  sales: "فروش",
  receivables: "مانده مطالبات",
  pnl: "سود و زیان",
  hr: "پرسنل",
  targets: "تارگت",
  inventory: "انبار",
};

const iconBtnSx = {
  bgcolor: surface.glassHover,
  border: `1px solid ${surface.border}`,
  "&:hover": { bgcolor: surface.borderStrong },
};

// هر ۳۰ ثانیه یک‌بار وضعیت آخرین اجرای ETLها را می‌گیرد تا اگر واچرِ خودکار (نه
// فقط دکمه‌ی دستی) یک ماژول را fail کند، بدون نیاز به کلیک کاربر روی صفحه دیده شود.
const STATUS_POLL_MS = 30_000;

interface Props {
  onOpenMobileMenu: () => void;
}

export default function Header({ onOpenMobileMenu }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { fetchMeta, fetchStatus, refresh, refreshing, latestUpdateJalali, failedModules, lastRunStatus } =
    useEtlMetaStore();
  const { mode, toggleMode } = useThemeModeStore();
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    fetchMeta();
    fetchStatus();
    const timer = setInterval(fetchStatus, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [fetchMeta, fetchStatus]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleRefresh() {
    setRefreshError(false);
    const ok = await refresh();
    if (!ok) setRefreshError(true);
  }

  const lastUpdate = latestUpdateJalali();
  const failed = failedModules();
  // انتهای traceback پایتون (نه ابتدایش) نشان داده می‌شود چون نوع/پیام واقعی خطا
  // همیشه آخرین خط traceback است؛ ابتدای آن فقط مسیر فایل‌ها را نشان می‌دهد.
  const failedTooltip = failed
    .map((m) => `${MODULE_LABEL_FA[m] ?? m}: ${lastRunStatus[m]?.error?.trim().slice(-300) || "خطای نامشخص"}`)
    .join("\n\n");

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 1.5, sm: 3 },
        py: 2,
        position: "sticky",
        top: 0,
        zIndex: 1,
        bgcolor: surface.glass,
        backdropFilter: glassBlur,
        WebkitBackdropFilter: glassBlur,
        borderBottom: `1px solid ${surface.border}`,
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <IconButton onClick={onOpenMobileMenu} size="small" sx={iconBtnSx}>
          <Menu size={18} />
        </IconButton>
        <Tooltip title={refreshing ? "در حال بروزرسانی… ممکن است تا ۲ دقیقه طول بکشد" : "بروزرسانی داده‌ها"}>
          <span>
            <IconButton onClick={handleRefresh} disabled={refreshing} size="small" sx={iconBtnSx}>
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            </IconButton>
          </span>
        </Tooltip>
        <Chip
          size="small"
          color={refreshError ? "error" : "default"}
          label={
            refreshError
              ? "خطا در بروزرسانی"
              : refreshing
                ? "در حال بروزرسانی…"
                : lastUpdate
                  ? `بروزرسانی: ${lastUpdate}`
                  : "بروزرسانی: نامشخص"
          }
          sx={{
            color: "text.secondary",
            border: `1px solid ${surface.border}`,
            display: { xs: "none", sm: "flex" },
          }}
        />
        {failed.length > 0 && (
          <Tooltip title={<Box sx={{ whiteSpace: "pre-line" }}>{failedTooltip}</Box>}>
            <Chip
              size="small"
              color="error"
              icon={<AlertTriangle size={14} />}
              label={`خطای بروزرسانی: ${failed.map((m) => MODULE_LABEL_FA[m] ?? m).join("، ")}`}
              sx={{ fontWeight: 700 }}
            />
          </Tooltip>
        )}
        <HelpDialog />
      </Box>

      <LiveClock />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" }, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
            {user?.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.displayRole}
          </Typography>
        </Box>
        <Avatar
          sx={{
            width: 38,
            height: 38,
            fontWeight: 700,
            flexShrink: 0,
            backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
            border: `1px solid ${surface.borderStrong}`,
          }}
        >
          {user?.displayName?.[0] ?? "?"}
        </Avatar>
        <Tooltip title={mode === "dark" ? "حالت روشن" : "حالت تیره"}>
          <IconButton size="small" onClick={toggleMode} sx={iconBtnSx}>
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="خروج">
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{
              ...iconBtnSx,
              "&:hover": { bgcolor: "rgba(234,34,40,0.15)", borderColor: brand.primary },
            }}
          >
            <LogOut size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
