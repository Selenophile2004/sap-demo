import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, IconButton, Tooltip } from "@mui/material";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { surface } from "../../app/theme/palette";

export default function HelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="راهنما">
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: surface.glassHover,
            border: `1px solid ${surface.border}`,
            "&:hover": { bgcolor: surface.borderStrong },
          }}
        >
          <HelpCircle size={16} />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>راهنمای بروزرسانی داده‌ها</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2">
              <b>خودکار:</b> با ذخیره‌ی تغییر در هر فایل اکسل داخل پوشه‌ی Data، داده‌ها چند ثانیه بعد
              به‌طور خودکار بروز می‌شوند. نیازی به هیچ کاری نیست.
            </Typography>
            <Typography variant="body2">
              <b>دستی:</b> دکمه‌ی 🔄 کنار «آخرین بروزرسانی» در بالای صفحه را بزنید. ممکن است تا ۲
              دقیقه طول بکشد.
            </Typography>
            <Typography variant="body2">
              <b>خطا دیدید؟</b> مطمئن شوید فایل اکسل در Excel باز نمانده، دوباره دکمه‌ی بروزرسانی را
              بزنید. جزئیات کامل در فایل <code>docs/README_UPDATE.md</code> پروژه است.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>بستن</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
