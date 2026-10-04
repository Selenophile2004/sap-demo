import { Box, Chip, Grid, Paper, Typography } from "@mui/material";
import { CheckCircle2, CircleDashed, Network, ShieldCheck } from "lucide-react";
import { moduleRegistry } from "../../app/moduleRegistry";
import { surface } from "../../app/theme/palette";

export default function ModuleRegistryPage() {
  const activeCount = moduleRegistry.filter((item) => item.enabled).length;
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Network size={26} />
          <Typography variant="h5" fontWeight={900}>رجیستری ماژول‌ها</Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 820 }}>
          منبع واحد قابلیت‌های این استقرار؛ منو، مسیر، مجوز و وضعیت فعال بودن هر ماژول از همین رجیستری ساخته می‌شود.
        </Typography>
        <Chip sx={{ mt: 1.5 }} color="success" variant="outlined" label={`${activeCount.toLocaleString("fa-IR")} ماژول فعال`} />
      </Box>
      <Grid container spacing={2}>
        {moduleRegistry.map((item) => {
          const Icon = item.icon;
          const active = item.enabled;
          return (
            <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Paper elevation={0} sx={{ p: 2.25, height: "100%", border: `1px solid ${active ? surface.borderStrong : surface.border}`, opacity: active ? 1 : .62 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                  <Box sx={{ display: "flex", gap: 1.25 }}>
                    <Icon size={22} />
                    <Box>
                      <Typography fontWeight={800}>{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.id}</Typography>
                    </Box>
                  </Box>
                  <Chip size="small" icon={active ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />} color={active ? "success" : "default"} label={active ? "فعال" : item.status === "coming-soon" ? "قابل افزودن" : "غیرفعال"} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, minHeight: 44 }}>{item.description}</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                  {item.path && <Chip size="small" variant="outlined" label={item.path} />}
                  {item.requiredPermission && <Chip size="small" variant="outlined" icon={<ShieldCheck size={12} />} label={item.requiredPermission} />}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: surface.glassHover }}>
        <Typography variant="body2" color="text.secondary">
          برای ساخت نسخه هر شرکت، شناسه ماژول‌های موردنیاز را در متغیر <b>VITE_ENABLED_MODULES</b> با کاما جدا کنید؛ اگر خالی باشد همه ماژول‌های فعال این دمو نمایش داده می‌شوند.
        </Typography>
      </Paper>
    </Box>
  );
}
