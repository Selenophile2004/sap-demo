import { FormControlLabel, Switch, Tooltip } from "@mui/material";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// فیلتر «سبد فعال» — همان ستون سبد فعال شیت Kala (و اسلایسر Forosh.سبد فعال در
// فایل پاور بی‌آی منبع): وقتی روشن باشد، فقط کالاهایی که الان در سبد فعال فروش
// هستند (نه کالاهای متوقف‌شده/از رده‌خارج) در محاسبات این صفحه لحاظ می‌شوند.
export default function ActiveBasketToggle({ checked, onChange }: Props) {
  return (
    <Tooltip title="فقط کالاهایی که الان در سبد فعال فروش هستند لحاظ شوند">
      <FormControlLabel
        control={<Switch size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label="سبد فعال"
        sx={{ mr: 0, "& .MuiFormControlLabel-label": { fontSize: 14 } }}
      />
    </Tooltip>
  );
}
