import { Backdrop, Box, Fade, List, ListItemButton, ListItemIcon, ListItemText, Modal, Tooltip, Typography } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import { NavLink } from "react-router-dom";
import { menuItems } from "../../app/menuConfig";
import { surface, glassBlur, brand, brandGrey } from "../../app/theme/palette";
import { plainCache } from "../../app/theme/plainCache";
import ampersand from "../../assets/logo-ampersand.png";

export const SIDEBAR_WIDTH = 264;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, mb: 4 }}>
        <Box component="img" src={ampersand} alt="ILIA" sx={{ width: 40, height: 47, objectFit: "contain", flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1 }}>
            Mindway
          </Typography>
          <Typography variant="caption" sx={{ color: brandGrey }}>
            Powered by ILIA
          </Typography>
        </Box>
      </Box>

      <List
        sx={{
          px: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const sectionHeader = item.section && (
            <Typography
              key={`section-${item.section}`}
              variant="caption"
              sx={{
                px: 2,
                pt: 1.5,
                pb: 0.5,
                display: "block",
                color: "text.secondary",
                opacity: 0.55,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {item.section}
            </Typography>
          );
          if (item.comingSoon) {
            return (
              <Box key={item.label} sx={{ display: "contents" }}>
                {sectionHeader}
                <Tooltip title="به‌زودی" placement="left">
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 1,
                      px: 2,
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      color: "text.secondary",
                      bgcolor: surface.glassHover,
                      border: `1px solid ${surface.border}`,
                      filter: "blur(0.35px)",
                      opacity: 0.5,
                      cursor: "not-allowed",
                      overflow: "hidden",
                      mb: 0.25,
                      "&::after": {
                        content: '"به‌زودی"',
                        position: "absolute",
                        insetInlineEnd: 10,
                        fontSize: 10,
                        bgcolor: "secondary.main",
                        color: "#1a1a1a",
                        px: 0.8,
                        borderRadius: 999,
                        fontWeight: 700,
                      },
                    }}
                  >
                    <Icon size={20} />
                    <Typography variant="body2">{item.label}</Typography>
                  </Box>
                </Tooltip>
              </Box>
            );
          }
          return (
            <Box key={item.label} sx={{ display: "contents" }}>
              {sectionHeader}
              <ListItemButton
                component={NavLink}
                to={item.path!}
                onClick={onNavigate}
                sx={{
                  borderRadius: 1,
                  border: "1px solid transparent",
                  "&:hover": {
                    bgcolor: surface.glassHover,
                  },
                  "&.active": {
                    bgcolor: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                    backgroundImage: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryDark})`,
                    color: "#fff",
                    border: `1px solid ${brand.primaryLight}`,
                    boxShadow: `0 6px 20px rgba(121,0,221,0.4)`,
                    "& .MuiListItemIcon-root": { color: "#fff" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                  <Icon size={20} />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Box>
          );
        })}
      </List>
    </>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// همیشه به‌صورت overlay روی محتوا باز می‌شود، حتی روی دسکتاپ — قبلاً روی دسکتاپ
// ۲۶۴px عرض ثابت اشغال می‌کرد؛ حالا با دکمه‌ی همبرگری در هدر باز/بسته می‌شود تا
// فضای بیشتری برای نمودارها بماند.
//
// عمداً از MUI Drawer استفاده نشده و کل Modal+Fade داخل یک CacheProvider جدا با
// کشِ emotion بدون stylis-plugin-rtl پیچیده شده: پلاگین RTL این پروژه، استایل
// inline‌ای که خودِ MUI برای ترنزیشن‌ها تزریق می‌کند (transform در Slide، opacity
// در Fade) را دوباره میرور می‌کند و رویش overwrite می‌شود — نتیجه، بسته به
// ترنزیشن، یا پنل کاملاً بیرون از صفحه می‌ماند یا opacity:0 می‌ماند حتی وقتی باز
// است (هر دو را مستقیم دیدیم: inline style درست بود، ولی computed style غلط).
// چون این زیردرخت دیگر RTL-mirror نمی‌شود، موقعیت با «right» فیزیکی نوشته
// می‌شود، نه inset-inline-*.
export default function Sidebar({ open, onClose }: Props) {
  return (
    <CacheProvider value={plainCache}>
      <Modal open={open} onClose={onClose} closeAfterTransition keepMounted slots={{ backdrop: Backdrop }}>
        <Fade in={open}>
          <Box
            sx={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100%",
              width: SIDEBAR_WIDTH,
              bgcolor: surface.glassStrong,
              backdropFilter: glassBlur,
              WebkitBackdropFilter: glassBlur,
              boxShadow: "-8px 0 32px rgba(0,0,0,0.35)",
              py: 3,
              display: "flex",
              flexDirection: "column",
              overflowY: "hidden",
              outline: "none",
            }}
          >
            <SidebarContent onNavigate={onClose} />
          </Box>
        </Fade>
      </Modal>
    </CacheProvider>
  );
}
