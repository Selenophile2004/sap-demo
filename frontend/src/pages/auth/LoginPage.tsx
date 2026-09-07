import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Button, Typography, Alert, InputAdornment, IconButton } from "@mui/material";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { apiClient } from "../../lib/api/client";
import { useAuthStore } from "../../app/store/authStore";
import logo from "../../assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 5,
          borderRadius: 1.5,
          textAlign: "center",
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="SAP"
          sx={{ width: 96, height: 96, objectFit: "contain", mx: "auto", mb: 2 }}
        />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          SAP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          داشبورد مدیریتی هوش تجاری — نمونه‌کار پورتفولیو (26-SAP-D-MSR)
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="رمز عبور"
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
