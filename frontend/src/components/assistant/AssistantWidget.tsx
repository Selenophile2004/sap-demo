import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Backdrop, Box, Fade, IconButton, Modal, TextField, Tooltip, Typography } from "@mui/material";
import { CacheProvider, keyframes } from "@emotion/react";
import { Sparkles, X, Send } from "lucide-react";
import { surface, glassBlur, brand } from "../../app/theme/palette";
import { plainCache } from "../../app/theme/plainCache";
import { assistantApi, type AssistantHistoryTurn } from "../../lib/api/assistantApi";

// تعداد نوبت‌های اخیر گفتگو که همراه هر پیام جدید برای مدل فرستاده می‌شود — فرانت‌اند
// منبع حقیقت تاریخچه است (سمت سرور session ذخیره نمی‌شود)، پس همین آرایه‌ی پیام‌های
// نمایشی خودش به شکل فشرده (فقط role/text) به بک‌اند فرستاده می‌شود.
const MAX_HISTORY_TURNS = 20;

const FAB_SIZE = { xs: 48, sm: 56 };
const FAB_OFFSET = { xs: 16, sm: 24 };
// فاصله‌ی پایین پنل از پایین صفحه = افست دکمه + ارتفاع دکمه + یک فاصله‌ی کوچک، تا
// پنل دقیقاً از بالای دکمه «رشد» کند، نه رویش بیفتد.
const PANEL_BOTTOM = { xs: 16 + 48 + 12, sm: 24 + 56 + 12 };

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
    box-shadow: 0 0 0 0 rgba(234, 34, 40, 0.38), 0 6px 20px rgba(234, 34, 40, 0.38);
  }
  50% {
    box-shadow: 0 0 0 9px rgba(234, 34, 40, 0), 0 6px 26px rgba(234, 34, 40, 0.48);
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
        <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
          {message.text}
        </Typography>
      </Box>
    </Box>
  );
}

export default function AssistantWidget() {
  const navigate = useNavigate();
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
      const { reply, navigateTo } = await assistantApi.chat(text, history);
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: reply }]);
      if (navigateTo) {
        // اول بگذار کاربر متن پاسخ را ببیند، بعد (با کمی تاخیر) صفحه عوض شود — تا
        // ناوبری ناگهانی وسط خواندن پاسخ حس قطع‌شدن ندهد.
        scrollToBottom();
        setTimeout(() => navigate(navigateTo), 900);
      }
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
            color: "#fff",
            animation: `${pulseGlow} 2.8s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            transition: "transform .18s ease",
            "&:hover": {
              backgroundImage: `linear-gradient(135deg, ${brand.primaryLight}, ${brand.primary})`,
              transform: "scale(1.06)",
            },
          }}
        >
          <Sparkles size={24} />
        </IconButton>
      </Tooltip>

      <Modal
          open={open}
          onClose={handleClose}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{ backdrop: { sx: { bgcolor: "rgba(5,5,8,0.25)" } } }}
        >
          <Fade in={open}>
            <Box
              sx={{
                position: "fixed",
                bottom: PANEL_BOTTOM,
                left: FAB_OFFSET,
                width: { xs: "calc(100vw - 32px)", sm: 384 },
                maxWidth: 420,
                height: { xs: "min(70vh, 560px)", sm: "min(75vh, 600px)" },
                display: "flex",
                flexDirection: "column",
                borderRadius: "16px",
                overflow: "hidden",
                bgcolor: surface.glassStrong,
                backdropFilter: glassBlur,
                WebkitBackdropFilter: glassBlur,
                border: `1px solid ${surface.border}`,
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                outline: "none",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: `1px solid ${surface.border}`,
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: "9px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={16} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    دستیار هوشمند
                  </Typography>
                </Box>
                <IconButton size="small" onClick={handleClose} aria-label="بستن دستیار هوشمند">
                  <X size={18} />
                </IconButton>
              </Box>

              <Box
                ref={listRef}
                sx={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflowY: "auto",
                  px: 1.75,
                  py: 1.75,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {loading && <TypingIndicator />}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 1,
                  px: 1.5,
                  py: 1.25,
                  borderTop: `1px solid ${surface.border}`,
                  flexShrink: 0,
                }}
              >
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
                  maxRows={4}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
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
                    width: 40,
                    height: 40,
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
            </Box>
          </Fade>
      </Modal>
    </CacheProvider>
  );
}
