import { createTheme } from "@mui/material/styles";
import { brand, surface, glassBlur, paletteByMode, type PaletteModeValues } from "./palette";

function buildCssVars(v: PaletteModeValues) {
  return {
    "--ssap-bg": v.background,
    "--ssap-glass": v.glass,
    "--ssap-glass-strong": v.glassStrong,
    "--ssap-glass-hover": v.glassHover,
    "--ssap-border": v.border,
    "--ssap-border-strong": v.borderStrong,
    "--ssap-table-header-bg": v.tableHeaderBg,
  };
}

export function createAppTheme(mode: "dark" | "light") {
  const v = paletteByMode[mode];

  return createTheme({
    direction: "rtl",
    typography: {
      fontFamily: "Vazirmatn, Tahoma, Arial, sans-serif",
    },
    palette: {
      mode,
      primary: { main: brand.primary, dark: brand.primaryDark, light: brand.primaryLight, contrastText: "#fff" },
      secondary: { main: brand.secondary, dark: brand.secondaryDark, contrastText: "#1a1a1a" },
      background: { default: v.background, paper: v.glass },
      divider: v.border,
      text: { primary: v.textPrimary, secondary: v.textSecondary },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": buildCssVars(v),
          body: {
            backgroundColor: v.background,
            backgroundImage: v.bodyGradient,
            backgroundAttachment: "fixed",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: surface.glass,
            backdropFilter: glassBlur,
            WebkitBackdropFilter: glassBlur,
            border: `1px solid ${surface.border}`,
            boxShadow: v.paperShadow,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, textTransform: "none", fontWeight: 600 },
        },
        variants: [
          {
            props: { variant: "contained", color: "primary" },
            style: { boxShadow: "0 6px 20px rgba(121,0,221,0.35)" },
          },
        ],
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: surface.glass,
            backdropFilter: glassBlur,
            WebkitBackdropFilter: glassBlur,
            border: `1px solid ${surface.border}`,
            transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
            "&:hover": {
              borderColor: surface.borderStrong,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: v.chipBg,
            backdropFilter: "blur(8px)",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: "background-color .18s ease, color .18s ease",
          },
        },
      },
    },
  });
}
