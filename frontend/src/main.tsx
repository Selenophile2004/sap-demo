import { StrictMode, Component, useMemo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline, Box, Typography, Button } from "@mui/material";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import { rtlCache } from "./app/theme/rtlCache";
import { createAppTheme } from "./app/theme/theme";
import { useThemeModeStore } from "./app/store/themeModeStore";
import "./index.css";
import App from "./App.tsx";

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("26-SAP-D-MSR crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" fontWeight={800}>
            خطایی در نمایش این صفحه پیش آمد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            جزئیات فنی در کنسول مرورگر (F12) ثبت شد. لطفاً صفحه را دوباره بارگذاری کنید.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            بارگذاری مجدد
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const mode = useThemeModeStore((s) => s.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <CacheProvider value={rtlCache}>
        <Root />
      </CacheProvider>
    </AppErrorBoundary>
  </StrictMode>
);
