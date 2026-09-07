import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Button, Typography, Alert, InputAdornment, IconButton } from "@mui/material";
import { keyframes } from "@emotion/react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { apiClient } from "../../lib/api/client";
import { useAuthStore } from "../../app/store/authStore";
import { useThemeModeStore } from "../../app/store/themeModeStore";
import { brandGrey } from "../../app/theme/palette";
import logoFullDark from "../../assets/logo-full-dark.png";
import logoFullLight from "../../assets/logo-full-light.png";

// نفسِ آرام لوگوی زمینه — دامنه‌ی حرکت عمداً خیلی کم است (فقط اسکیل و opacity)
// تا حس «زنده»ی ظریف بدهد، نه یک المان حواس‌پرت‌کننده.
const breathe = keyframes`
  0%, 100% { opacity: 0.14; transform: translateY(-50%) scale(1); }
  50% { opacity: 0.20; transform: translateY(-50%) scale(1.025); }
`;

const revealUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const mode = useThemeModeStore((s) => s.mode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // روی پس‌زمینه‌ی تیره از لوگوی سفید و روی پس‌زمینه‌ی روشن از لوگوی مشکی استفاده
  // می‌شود — دقیقاً برعکسِ رنگ خودِ لوگو، چون هدف کنتراست با زمینه است.
  const wordmark = mode === "dark" ? logoFullLight : logoFullDark;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", { username, password });
      setSession(data.token, data.user);
      navigate("/", { replace: true });
    } catch {
      setError("نام کاربری یا رمز عبور اشتباه است");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      {/* ---------- ترکیب‌بندی برند زمینه: وردمارک کامل + نام/تگ‌لاین Mindway ----------
          آفست به سمت چپ صفحه (نه پشتِ مستقیم باکس ورود) تا باکس ورود همچنان عنصر
          اصلی چشم بماند. فقط از sm به بالا نمایش داده می‌شود؛ در موبایل فضای کافی
          برای این ترکیب‌بندی نامتقارن نیست و فقط حواس‌پرتی ایجاد می‌کند. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          display: { xs: "none", sm: "block" },
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <Box
          component="img"
          src={wordmark}
          alt=""
          sx={{
            position: "absolute",
            top: "50%",
            right: { sm: "-22%", md: "-9%", lg: "-4%" },
            width: { sm: "62vw", md: "44vw" },
            maxWidth: 640,
            height: "auto",
            transform: "translateY(-50%)",
            maskImage: "radial-gradient(ellipse 60% 55% at 62% 50%, black 40%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 62% 50%, black 40%, transparent 78%)",
            animation: `${breathe} 7s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.16 },
          }}
        />
        <Box
          sx={{
            position: "absolute",
            right: { sm: "7%", md: "10%", lg: "13%" },
            top: "50%",
            transform: "translateY(96px)",
            maxWidth: 300,
          }}
        >
          <Typography
            sx={{
              fontSize: { sm: 30, md: 36 },
              fontWeight: 800,
              letterSpacing: 0.3,
              lineHeight: 1.1,
              color: "text.primary",
              direction: "ltr",
              textAlign: "left",
              animation: `${revealUp} 0.9s cubic-bezier(.2,.8,.2,1) both`,
              animationDelay: "0.15s",
            }}
          >
            Mindway
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: brandGrey,
              direction: "ltr",
              textAlign: "left",
              animation: `${revealUp} 0.9s cubic-bezier(.2,.8,.2,1) both`,
              animationDelay: "0.35s",
            }}
          >
            your way to the heart of your business
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          p: 5,
          borderRadius: 1.5,
          textAlign: "center",
          animation: `${cardIn} 0.5s cubic-bezier(.2,.8,.2,1) both`,
        }}
      >
        <Typography variant="h5" fontWeight={800} sx={{ mb: 4 }}>
          Welcome
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !username || !password}
            startIcon={<LogIn size={18} />}
            sx={{ mt: 1, py: 1.3 }}
          >
            ورود
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
