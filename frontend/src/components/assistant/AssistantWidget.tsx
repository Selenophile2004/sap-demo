import { useRef, useState } from "react";
import { Backdrop, Box, Fade, IconButton, Modal, TextField, Tooltip, Typography } from "@mui/material";
import { CacheProvider, keyframes } from "@emotion/react";
import { X, Send } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { surface, glassBlur, brand, brandGrey } from "../../app/theme/palette";
import { plainCache } from "../../app/theme/plainCache";
import { assistantApi, type AssistantHistoryTurn } from "../../lib/api/assistantApi";
import aiIcon from "../../assets/ai-icon.png";

// تعداد نوبت‌های اخیر گفتگو که همراه هر پیام جدید برای مدل فرستاده می‌شود — فرانت‌اند
// منبع حقیقت تاریخچه است (سمت سرور session ذخیره نمی‌شود)، پس همین آرایه‌ی پیام‌های
// نمایشی خودش به شکل فشرده (فقط role/text) به بک‌اند فرستاده می‌شود.
const MAX_HISTORY_TURNS = 20;

const FAB_SIZE = { xs: 48, sm: 56 };
const FAB_OFFSET = { xs: 16, sm: 24 };

// پنل دیگر یک popover کوچک نزدیک دکمه نیست — دقیقاً مثل سایدبار (منوی همبرگری در
// هدر) از لبه‌ی صفحه باز می‌شود، با این تفاوت که سایدبار از راست باز می‌شود و این
// پنل، آینه‌ی آن، از چپ. عرض تقریباً نصف صفحه تا مارک‌داون (جدول/لیست/بولد) واقعاً
// جا برای نفس کشیدن داشته باشد؛ در موبایل نزدیک به تمام‌عرض چون نصفِ یک صفحه‌ی
// کوچک عملاً غیرقابل‌استفاده است.
const PANEL_WIDTH = { xs: "100%", sm: "72vw", md: "50vw" };
const PANEL_MAX_WIDTH = 720;

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `m${messageSeq}`;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

const GREETING =
  "سلام! من دستیار هوشمند شما هستم. فعلاً می‌تونم درباره‌ی فروش، مطالبات، سود و زیان، پرسنل، نقدینگی، " +
  "بودجه، انبار و هشدارها با داده‌های واقعی سیستم کمک کنم.\n\n" +
  "مثلاً بپرس: «فروش این ماه چقدر بوده؟» یا «وضعیت نقدینگی چطوره؟»";

// افکت «تنفسی» دور دکمه‌ی شناور — برای این‌که دستیار هوشمند حس «زنده» بودن بدهد، نه
// یک آیکون ساکن دیگر. دامنه و شدتش عمداً کم نگه داشته شده (نه پررنگ/گاودی).
const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(121, 0, 221, 0.38), 0 6px 20px rgba(121, 0, 221, 0.38);
  }
  50% {
    box-shadow: 0 0 0 9px rgba(121, 0, 221, 0), 0 6px 26px rgba(121, 0, 221, 0.48);
  }
`;

const bounceDot = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

function TypingIndicator() {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          px: 1.75,
          py: 1.25,
          borderRadius: "14px 14px 14px 4px",
          bgcolor: surface.glassHover,
          border: `1px solid ${surface.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: `${bounceDot} 1.2s ease-in-out ${i * 0.15}s infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// نگاشت تگ‌های Markdown به کامپوننت‌های MUI — فقط برای پیام‌های دستیار استفاده می‌شود
// (پیام‌های خودِ کاربر متن خام‌اند، چون هیچ‌وقت خودشان قالب‌بندی تولید نمی‌کنند).
// تمام تورفتگی‌های فهرست عمداً با ویژگی منطقی «paddingInlineStart» نوشته شده‌اند
// (نه «pl»ی MUI که به padding-left فیزیکی ترجمه می‌شود) تا مستقل از این‌که این
// زیردرخت در کدام emotion cache است، در چیدمان RTL برنامه (dir="rtl" روی <html>)
// به‌صورت خودکار سمت درست (راست) تورفتگی بگیرند و نشانه‌ی بولت هم‌جهت متن بماند.
const markdownComponents: Components = {
  p: ({ children }) => (
    <Typography variant="body2" sx={{ lineHeight: 1.7, m: 0 }}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 800 }}>
      {children}
    </Box>
  ),
  em: ({ children }) => (
    <Box component="em" sx={{ fontStyle: "italic" }}>
      {children}
    </Box>
  ),
  ul: ({ children }) => (
    <Box
      component="ul"
      sx={{ m: 0, paddingInlineStart: "1.4em", display: "flex", flexDirection: "column", gap: 0.4 }}
    >
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box
      component="ol"
      sx={{ m: 0, paddingInlineStart: "1.4em", display: "flex", flexDirection: "column", gap: 0.4 }}
    >
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body2" sx={{ lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  a: ({ children, href }) => (
    <Typography
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="body2"
      sx={{ color: brand.primary, fontWeight: 700, textDecoration: "underline" }}
    >
      {children}
    </Typography>
  ),
  code: ({ children }) => (
    <Box
      component="code"
      sx={{
        fontFamily: "monospace",
        fontSize: "0.85em",
        bgcolor: surface.glassHover,
        px: 0.5,
        py: 0.15,
        borderRadius: "4px",
        direction: "ltr",
        unicodeBidi: "isolate",
      }}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{ m: 0, overflowX: "auto", bgcolor: surface.glassHover, borderRadius: "8px", p: 1 }}
    >
      {children}
    </Box>
  ),
  // هدینگ‌ها را انتظار نداریم (به مدل گفته شده لازم نیست)، ولی اگر مدل هرازگاهی تولیدشان
  // کرد، به‌جای فونت غول‌آسای h1..h6 پیش‌فرض مرورگر، همان‌قدر برجسته‌ی یک جمله‌ی کلیدی نشان بده.
  h1: ({ children }) => (
    <Typography variant="subtitle2" fontWeight={800} sx={{ m: 0 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle2" fontWeight={800} sx={{ m: 0 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" fontWeight={800} sx={{ m: 0 }}>
      {children}
    </Typography>
  ),
  // جدول (GFM، از طریق remarkGfm) — در تحلیل‌های تحلیلی (مثل «وضعیت کلی شرکت»)، مدل
  // اغلب برای مقایسه‌ی چند حوزه/کالا از جدول استفاده می‌کند؛ بدون این استایل، همان
  // نحو خام «| ستون | ستون |» را می‌بینیم — دقیقاً همان مشکل «شلوغی» که قرار است رفع شود.
  // چون حباب گفتگو باریک است، جدول در یک container با اسکرول افقی مستقل پیچیده شده
  // (نه اسکرول کل صفحه) تا جدول‌های پهن چیدمان را نشکنند.
  table: ({ children }) => (
    <Box sx={{ overflowX: "auto", borderRadius: "8px", border: `1px solid ${surface.border}` }}>
      <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8125rem" }}>
        {children}
      </Box>
    </Box>
  ),
  thead: ({ children }) => (
    <Box component="thead" sx={{ bgcolor: surface.glassHover }}>
      {children}
    </Box>
  ),
  tbody: ({ children }) => <Box component="tbody">{children}</Box>,
  tr: ({ children }) => (
    <Box component="tr" sx={{ "&:not(:last-of-type)": { borderBottom: `1px solid ${surface.border}` } }}>
      {children}
    </Box>
  ),
  th: ({ children }) => (
    <Box component="th" sx={{ textAlign: "start", fontWeight: 800, px: 1, py: 0.6, whiteSpace: "nowrap" }}>
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box component="td" sx={{ textAlign: "start", px: 1, py: 0.6, verticalAlign: "top" }}>
      {children}
    </Box>
  ),
};

// شبکه‌ی ایمنی: system prompt صریحاً به مدل گفته هیچ تگ خام HTML ننویسد (فقط Markdown خالص)،
// ولی این مدل رایگان روی Groq گاهی همچنان برای شکستن خط داخل سلول جدول از <br> استفاده
// می‌کند (دیده‌شده در تست واقعی). چون react-markdown عمداً بدون افزونه‌ی رندر HTML خام کار
// می‌کند (تا هیچ HTML/اسکریپتی از پاسخ مدل مستقیم اجرا نشود — یک ملاحظه‌ی امنیتی، نه فقط
// زیبایی‌شناسی)، بدون این تبدیل چنین تگی به‌صورت متن خام «<br>» به کاربر نشان داده می‌شد —
// دقیقاً همان جمع‌وجورنبودنی که این تغییرات قرار است رفع کنند. اینجا آن را به یک جداکننده‌ی
// طبیعی فارسی تبدیل می‌کنیم، نه این‌که تگ خام را رندر کنیم.
function sanitizeAssistantMarkdown(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "؛ ");
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <Box
        sx={{
          maxWidth: "82%",
          px: 1.75,
          py: 1.1,
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          backgroundImage: isUser ? `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})` : "none",
          bgcolor: isUser ? "transparent" : surface.glassHover,
          border: isUser ? "none" : `1px solid ${surface.border}`,
          color: isUser ? "#fff" : "text.primary",
        }}
      >
        {isUser ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
            {message.text}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {sanitizeAssistantMarkdown(message.text)}
            </ReactMarkdown>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const greetedRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function handleOpen() {
    setOpen(true);
    if (!greetedRef.current) {
      greetedRef.current = true;
      setMessages([{ id: nextId(), role: "assistant", text: GREETING }]);
    }
    scrollToBottom();
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    // تاریخچه‌ی ارسالی به بک‌اند از روی همین پیام‌های نمایشی ساخته می‌شود (پیام
    // خوش‌آمدگویی ثابت ابتدای گفتگو هم به‌عنوان یک نوبت assistant لحاظ می‌شود، چون
    // مدل باید بداند قبلاً چه معرفی‌ای از خودش کرده) — پیش از افزودن پیام جدید کاربر.
    const history: AssistantHistoryTurn[] = messages
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    setInput("");
    setLoading(true);
    scrollToBottom();
    try {
      const { reply } = await assistantApi.chat(text, history);
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "متأسفانه در حال حاضر امکان دریافت پاسخ وجود ندارد؛ لطفاً دوباره امتحان کنید.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    // کل ویجت (هم دکمه‌ی شناور، هم پنل) در یک CacheProvider با کشِ emotion بدون
    // stylis-plugin-rtl پیچیده شده — دقیقاً همان الگوی Sidebar.tsx. دو دلیل دارد:
    // ۱) پلاگین RTL این پروژه استایل inline‌ای که خودِ MUI برای ترنزیشن‌ها تزریق
    //    می‌کند (opacity در Fade) را دوباره میرور می‌کند و رویش overwrite می‌شود.
    // ۲) اگر فقط پنل داخل این کش بود ولی دکمه‌ی شناور بیرون از آن (در کشِ RTL عادی
    //    برنامه) می‌ماند، همان پلاگین مقدار ثابت «left» در sx دکمه را هم به «right»
    //    میرور می‌کرد و دکمه به‌جای گوشه‌ی چپ در گوشه‌ی راست ظاهر می‌شد (باگ واقعی
    //    که هنگام تست دیده شد). چون این زیردرخت دیگر RTL-mirror نمی‌شود، همه‌جا از
    //    «left»/«bottom» فیزیکی استفاده شده، نه inset-inline-*.
    <CacheProvider value={plainCache}>
      <Tooltip title="دستیار هوشمند" placement="left">
        <IconButton
          onClick={handleOpen}
          aria-label="باز کردن دستیار هوشمند"
          sx={{
            position: "fixed",
            bottom: FAB_OFFSET,
            left: FAB_OFFSET,
            width: FAB_SIZE,
            height: FAB_SIZE,
            zIndex: (theme) => theme.zIndex.modal + 1,
            backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
            animation: `${pulseGlow} 2.8s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            transition: "transform .18s ease",
            "&:hover": {
              backgroundImage: `linear-gradient(135deg, ${brand.primaryLight}, ${brand.primary})`,
              transform: "scale(1.06)",
            },
          }}
        >
          <Box component="img" src={aiIcon} alt="" sx={{ width: { xs: 24, sm: 28 }, height: { xs: 24, sm: 28 }, objectFit: "contain" }} />
        </IconButton>
      </Tooltip>

      {/* پنل — دقیقاً هم‌خانواده با Sidebar.tsx (Modal+Fade تمام‌ارتفاع از لبه‌ی
          صفحه)، با این تفاوت که سایدبار از «right: 0» باز می‌شود و این پنل، آینه‌ی
          آن، از «left: 0» — به همراه عرض تقریباً نصف صفحه به‌جای پاپ‌آور کوچک قبلی،
          تا مارک‌داون (جدول/لیست/بولد) پاسخ‌ها واقعاً جا برای نفس کشیدن داشته باشد. */}
      <Modal
          open={open}
          onClose={handleClose}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{ backdrop: { sx: { bgcolor: "rgba(5,5,8,0.4)" } } }}
        >
          <Fade in={open}>
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                height: "100%",
                width: PANEL_WIDTH,
                maxWidth: PANEL_MAX_WIDTH,
                display: "flex",
                flexDirection: "column",
                bgcolor: surface.glassStrong,
                backdropFilter: glassBlur,
                WebkitBackdropFilter: glassBlur,
                borderInlineEnd: `1px solid ${surface.border}`,
                boxShadow: "8px 0 32px rgba(0,0,0,0.35)",
                outline: "none",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: { xs: 2, sm: 3 },
                  py: 2,
                  borderBottom: `1px solid ${surface.border}`,
                  backgroundImage: "linear-gradient(135deg, rgba(121,0,221,0.14), transparent 65%)",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                      boxShadow: "0 4px 16px rgba(121,0,221,0.35)",
                      flexShrink: 0,
                    }}
                  >
                    <Box component="img" src={aiIcon} alt="" sx={{ width: 22, height: 22, objectFit: "contain" }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap>
                      دستیار هوشمند Mindway
                    </Typography>
                    <Typography variant="caption" sx={{ color: brandGrey }} noWrap>
                      بر پایه‌ی داده‌های واقعی سیستم
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleClose}
                  aria-label="بستن دستیار هوشمند"
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

              <Box
                ref={listRef}
                sx={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflowY: "auto",
                  px: { xs: 2, sm: 3.5 },
                  py: 2.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Box sx={{ maxWidth: 760, width: "100%", mx: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {loading && <TypingIndicator />}
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  px: { xs: 2, sm: 3.5 },
                  py: 2,
                  borderTop: `1px solid ${surface.border}`,
                  flexShrink: 0,
                }}
              >
                <Box sx={{ maxWidth: 760, width: "100%", mx: "auto", display: "flex", alignItems: "flex-end", gap: 1 }}>
                  <TextField
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="سوال خود را بپرسید…"
                    size="small"
                    fullWidth
                    multiline
                    maxRows={6}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        bgcolor: surface.glassHover,
                      },
                    }}
                  />
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    aria-label="ارسال پیام"
                    sx={{
                      flexShrink: 0,
                      width: 42,
                      height: 42,
                      backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                      color: "#fff",
                      "&:hover": {
                        backgroundImage: `linear-gradient(135deg, ${brand.primaryLight}, ${brand.primary})`,
                      },
                      "&.Mui-disabled": {
                        backgroundImage: "none",
                        bgcolor: surface.glassHover,
                        color: "text.secondary",
                      },
                    }}
                  >
                    <Send size={17} />
                  </IconButton>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: brandGrey, textAlign: "center", opacity: 0.85, maxWidth: 760, width: "100%", mx: "auto" }}
                >
                  Enter برای ارسال، Shift+Enter برای خط جدید
                </Typography>
              </Box>
            </Box>
          </Fade>
      </Modal>
    </CacheProvider>
  );
}
