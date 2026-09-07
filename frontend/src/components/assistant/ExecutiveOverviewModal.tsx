import { useEffect, useState, type ComponentType } from "react";
import { Backdrop, Box, Button, Fade, IconButton, Modal, Paper, Skeleton, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";
import {
  X,
  Sparkles,
  ShoppingCart,
  LineChart,
  Wallet2,
  Wallet,
  Users,
  TrendingUp,
  Target,
  PiggyBank,
  Landmark,
  BarChart3,
  Lightbulb,
  ArrowLeftRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { surface, glassBlur, brand, brandGrey } from "../../app/theme/palette";
import { useAuthStore } from "../../app/store/authStore";
import { assistantApi, type OverviewData } from "../../lib/api/assistantApi";
import KpiCard from "../common/KpiCard";
import aiIcon from "../../assets/ai-icon.png";

// «خلاصه‌ی اجرایی» — درست بعد از یک ورود موفق (نه در هر ناوبری بین صفحات، رجوع
// کنید به فلگ justLoggedIn در authStore.ts) یک‌بار باز می‌شود و از بک‌اند
// (GET /api/assistant/overview) یک تحلیل کلی/ساختاریافته می‌گیرد: چند KPI، چند
// مقایسه‌ی معنادار، و چند نکته‌ی کوتاه تحلیلی — دقیقاً همان چیزی که رئیس دفتر یک
// مدیرعامل روی میزش می‌گذارد، نه یک گزارش مفصل.

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// انتخاب آیکن هر KPI صرفاً بر اساس چند کلیدواژه‌ی رایج در «label»ی که خودِ مدل
// تولید می‌کند (نه یک enum ثابت — چون شکل دقیق KPIها هر بار می‌تواند کمی فرق کند).
// اگر هیچ‌کدام تطبیق نخورد، یک آیکن خنثی (BarChart3) استفاده می‌شود.
const KPI_ICON_RULES: [RegExp, ComponentType<{ size?: number }>][] = [
  [/فروش/, ShoppingCart],
  [/سود/, LineChart],
  [/نقدینگ/, Wallet2],
  [/مطالبات|وصول/, Wallet],
  [/پرسنل|نیرو/, Users],
  [/بازده|ROI/i, TrendingUp],
  [/بودجه|هدف/, Target],
  [/دارایی/, PiggyBank],
  [/بدهی/, Landmark],
];

function pickKpiIcon(label: string): ComponentType<{ size?: number }> {
  const hit = KPI_ICON_RULES.find(([re]) => re.test(label));
  return hit ? hit[1] : BarChart3;
}

export default function ExecutiveOverviewModal() {
  const justLoggedIn = useAuthStore((s) => s.justLoggedIn);
  const consumeJustLoggedIn = useAuthStore((s) => s.consumeJustLoggedIn);
  const setOverviewOpen = useAuthStore((s) => s.setOverviewOpen);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    assistantApi
      .overview()
      .then((res) => {
        if ("error" in res) {
          setError(res.error);
          setData(null);
        } else {
          setData(res);
        }
      })
      .catch(() => setError("دریافت خلاصه‌ی اجرایی با خطا مواجه شد؛ لطفاً دوباره امتحان کنید."))
      .finally(() => setLoading(false));
  }

  // فقط زمانی که justLoggedIn تازه true شده (یعنی همین الان setSession صدا زده
  // شده) اجرا می‌شود؛ بلافاصله هم مصرفش می‌کنیم تا رندرهای بعدی همین کامپوننت
  // (مثلاً بعد از ناوبری بین صفحات، که AppLayout و این کامپوننت دوباره mount
  // نمی‌شوند) دوباره مودال را باز نکنند.
  useEffect(() => {
    if (!justLoggedIn) return;
    consumeJustLoggedIn();
    setData(null);
    setOpen(true);
    setOverviewOpen(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justLoggedIn]);

  // به authStore خبر می‌دهیم این مودال باز/بسته شد — تنها مصرف‌کننده‌اش حباب
  // معرفیِ دستیار هوشمند است (AssistantWidget.tsx) که با دیدن این فلگ، تا این
  // مودال باز است حبابش را نشان نمی‌دهد (رجوع کنید به کامنت overviewOpen در authStore.ts).
  function handleClose() {
    setOpen(false);
    setOverviewOpen(false);
  }

  const showComparisons = loading ? true : (data?.comparisons.length ?? 0) > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(5,5,8,0.55)", backdropFilter: "blur(4px)" } } }}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}
    >
      <Fade in={open}>
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 880,
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: surface.glassStrong,
            backdropFilter: glassBlur,
            WebkitBackdropFilter: glassBlur,
            border: `1px solid ${surface.borderStrong}`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
            outline: "none",
          }}
        >
          {/* هدر */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              px: { xs: 2.5, sm: 3.5 },
              py: 2.5,
              flexShrink: 0,
              backgroundImage: "linear-gradient(135deg, rgba(121,0,221,0.18), transparent 65%)",
              borderBottom: `1px solid ${surface.border}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                  boxShadow: "0 6px 18px rgba(121,0,221,0.4)",
                  flexShrink: 0,
                }}
              >
                <Box component="img" src={aiIcon} alt="" sx={{ width: 24, height: 24, objectFit: "contain" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={800} noWrap>
                  خلاصه‌ی اجرایی
                </Typography>
                <Typography variant="caption" sx={{ color: brandGrey }} noWrap>
                  آماده‌شده توسط دستیار هوشمند Mindway، بر پایه‌ی داده‌های زنده‌ی همین لحظه
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleClose}
              aria-label="بستن خلاصه‌ی اجرایی"
              sx={{
                bgcolor: surface.glassHover,
                border: `1px solid ${surface.border}`,
                flexShrink: 0,
                "&:hover": { bgcolor: surface.borderStrong },
              }}
            >
              <X size={18} />
            </IconButton>
          </Box>

          {/* بدنه */}
          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", px: { xs: 2.5, sm: 3.5 }, py: 3 }}>
            {error && !loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 6, textAlign: "center" }}>
                <AlertCircle size={28} color={brandGrey} />
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                  {error}
                </Typography>
                <Button size="small" startIcon={<RefreshCw size={14} />} onClick={load} sx={{ mt: 1 }}>
                  تلاش دوباره
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* جمع‌بندی کلی — لحظه‌ی اصلی این مودال */}
                {loading && !data ? (
                  <Skeleton variant="rounded" height={64} sx={{ borderRadius: 1.5, bgcolor: surface.glassHover }} />
                ) : (
                  data?.summary && (
                    <Box
                      sx={{
                        p: 2.25,
                        borderRadius: 1.5,
                        backgroundImage: "linear-gradient(120deg, rgba(121,0,221,0.14), rgba(248,177,123,0.08))",
                        border: `1px solid ${surface.border}`,
                        animation: `${fadeInUp} .4s ease both`,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                        <Sparkles size={14} color={brand.primaryLight} />
                        <Typography variant="caption" fontWeight={700} sx={{ color: brand.primaryLight }}>
                          جمع‌بندی کلی
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.8 }}>
                        {data.summary}
                      </Typography>
                    </Box>
                  )
                )}

                {/* KPIها */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                    شاخص‌های کلیدی
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                    {loading && !data
                      ? Array.from({ length: 4 }).map((_, i) => <KpiCard key={i} title="" value="" loading />)
                      : data?.kpis.map((k, i) => (
                          <Box key={i} sx={{ animation: `${fadeInUp} .4s ease both`, animationDelay: `${i * 0.05}s` }}>
                            <KpiCard
                              title={k.label}
                              value={k.value}
                              icon={pickKpiIcon(k.label)}
                              trendPct={k.trendPct}
                              subtitle={k.trendLabel ?? undefined}
                            />
                          </Box>
                        ))}
                  </Box>
                </Box>

                {/* مقایسه‌ها */}
                {showComparisons && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                      مقایسه‌های کلیدی
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
                      {loading && !data
                        ? Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={104} sx={{ borderRadius: 1.5, bgcolor: surface.glassHover }} />
                          ))
                        : data?.comparisons.map((c, i) => (
                            <Box
                              key={i}
                              sx={{
                                p: 2,
                                borderRadius: 1.5,
                                bgcolor: surface.glassHover,
                                border: `1px solid ${surface.border}`,
                                animation: `${fadeInUp} .4s ease both`,
                                animationDelay: `${i * 0.05}s`,
                              }}
                            >
                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                {c.label}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                                    {c.a.label}
                                  </Typography>
                                  <Typography variant="subtitle2" fontWeight={800} sx={{ direction: "ltr", textAlign: "right" }}>
                                    {c.a.value}
                                  </Typography>
                                </Box>
                                <Box sx={{ color: brandGrey, flexShrink: 0, display: "flex", alignItems: "center" }}>
                                  <ArrowLeftRight size={14} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                                    {c.b.label}
                                  </Typography>
                                  <Typography variant="subtitle2" fontWeight={800} sx={{ direction: "ltr", textAlign: "right" }}>
                                    {c.b.value}
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.6 }}>
                                {c.insight}
                              </Typography>
                            </Box>
                          ))}
                    </Box>
                  </Box>
                )}

                {/* نکات کلیدی */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                    نکات کلیدی
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {loading && !data
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1.25, bgcolor: surface.glassHover }} />
                        ))
                      : data?.highlights.map((h, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1,
                              p: 1.25,
                              borderRadius: 1.25,
                              bgcolor: surface.glassHover,
                              borderInlineStart: `3px solid ${brand.primary}`,
                              animation: `${fadeInUp} .4s ease both`,
                              animationDelay: `${i * 0.05}s`,
                            }}
                          >
                            <Lightbulb size={15} color={brand.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
                            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                              {h}
                            </Typography>
                          </Box>
                        ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
}
