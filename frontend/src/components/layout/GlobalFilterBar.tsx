import { useState } from "react";
import { Box, Autocomplete, TextField, Chip, IconButton, Tooltip, Collapse, GlobalStyles } from "@mui/material";
import { CalendarRange, X, Filter } from "lucide-react";
import DatePickerModule from "react-multi-date-picker";
import persianCalendarMod from "react-date-object/calendars/persian";
import persianFaLocaleMod from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import "react-multi-date-picker/styles/colors/red.css";

// react-multi-date-picker's CJS build exports its own `default` property
// alongside named exports (DateObject, Calendar, ...) without an __esModule
// flag; Vite's namespace-import interop then wraps it a second time and the
// real component ends up shadowed. Reaching through the raw module avoids that.
const DatePicker = (DatePickerModule as unknown as { default: typeof DatePickerModule }).default;
const persian = (persianCalendarMod as unknown as { default: typeof persianCalendarMod }).default ?? persianCalendarMod;
const persian_fa = (persianFaLocaleMod as unknown as { default: typeof persianFaLocaleMod }).default ?? persianFaLocaleMod;
import { useGlobalFilters, PERSIAN_MONTHS } from "../../app/store/filtersStore";
import { useThemeModeStore } from "../../app/store/themeModeStore";
import { surface, glassBlur } from "../../app/theme/palette";

const YEARS = ["1402", "1403", "1404", "1405", "1406"];

export default function GlobalFilterBar() {
  const { dateFrom, dateTo, years, months, setDateRange, setYears, setMonths, clearAll, isActive } =
    useGlobalFilters();
  const mode = useThemeModeStore((s) => s.mode);
  const [open, setOpen] = useState(false);

  const dateValue =
    dateFrom && dateTo ? [dateFrom.replaceAll("/", "-"), dateTo.replaceAll("/", "-")] : [];

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${surface.border}`,
        bgcolor: surface.glass,
        backdropFilter: glassBlur,
        WebkitBackdropFilter: glassBlur,
      }}
    >
      <GlobalStyles
        styles={{
          // پاپ‌آپ تقویم از طریق پورتال به body اضافه می‌شود تا پشت گلس‌های backdrop-filter گیر نکند
          ".ssap-date-picker.rmdp-wrapper": {
            zIndex: 3000,
            borderRadius: 12,
            border: `1px solid ${surface.borderStrong}`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          },
          ".ssap-date-picker .rmdp-header, .ssap-date-picker .rmdp-day-picker, .ssap-date-picker .rmdp-calendar":
            {
              backgroundColor: "transparent",
            },
          // react-multi-date-picker فقط استایل تیره (bg-dark.css) دارد؛ در حالت
          // روشن رنگ‌های آن را دستی بازنویسی می‌کنیم تا پاپ‌آپ تقویم روی پس‌زمینه‌ی
          // روشن هم خوانا بماند (وگرنه همیشه یک جعبه‌ی تیره وسط صفحه‌ی روشن می‌ماند).
          ".ssap-date-picker.ssap-light.rmdp-wrapper, .ssap-date-picker.ssap-light .rmdp-month-picker, .ssap-date-picker.ssap-light .rmdp-year-picker":
            {
              backgroundColor: surface.glassStrong,
              color: "#1A1B1E",
            },
          ".ssap-date-picker.ssap-light .rmdp-day:not(.rmdp-deactive), .ssap-date-picker.ssap-light .rmdp-header-values":
            {
              color: "#1A1B1E",
            },
          ".ssap-date-picker.ssap-light .rmdp-day.rmdp-deactive, .ssap-date-picker.ssap-light .rmdp-day.rmdp-disabled":
            {
              color: "rgba(20,20,30,0.35)",
            },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1.5, sm: 3 }, py: 1 }}>
        <Tooltip title={open ? "بستن فیلتر زمانی" : "فیلتر زمانی سراسری"}>
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            <CalendarRange size={16} />
          </IconButton>
        </Tooltip>
        {isActive() ? (
          <Chip
            size="small"
            color="secondary"
            label={
              dateFrom && dateTo
                ? `${dateFrom} تا ${dateTo}`
                : `${years.join("،")} ${months.map((m) => PERSIAN_MONTHS.find((p) => p.value === m)?.label).join("،")}`
            }
            onDelete={clearAll}
            deleteIcon={<X size={13} />}
          />
        ) : (
          <Chip
            size="small"
            variant="outlined"
            icon={<Filter size={12} />}
            label="بدون فیلتر زمانی (کل تاریخچه)"
            onClick={() => setOpen(true)}
            sx={{ color: "text.secondary", borderColor: surface.border }}
          />
        )}
      </Box>

      <Collapse in={open}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            px: { xs: 1.5, sm: 3 },
            pb: 2,
            alignItems: "center",
          }}
        >
          <Box sx={{ "& .rmdp-container input": { direction: "ltr" } }}>
            <DatePicker
              range
              calendar={persian}
              locale={persian_fa}
              value={dateValue}
              onChange={(vals: unknown) => {
                const arr = vals as { format: (f: string) => string }[] | null;
                if (arr && arr.length === 2) {
                  setDateRange(arr[0].format("YYYY/MM/DD"), arr[1].format("YYYY/MM/DD"));
                }
              }}
              portal
              portalTarget={document.body}
              className={`bg-dark red ssap-date-picker${mode === "light" ? " ssap-light" : ""}`}
              placeholder="بازه‌ی تاریخ (شمسی)"
              inputClass="ssap-date-input"
              style={{
                height: 38,
                borderRadius: 8,
                border: `1px solid ${surface.border}`,
                background: "transparent",
                color: mode === "dark" ? "#F5F5F5" : "#1A1B1E",
                paddingInline: 10,
                fontFamily: "Vazirmatn",
                width: 220,
              }}
            />
          </Box>

          <Autocomplete
            multiple
            size="small"
            options={YEARS}
            value={years}
            onChange={(_, v) => setYears(v)}
            sx={{ minWidth: 160 }}
            renderInput={(params) => <TextField {...params} label="سال" placeholder="همه" />}
          />

          <Autocomplete
            multiple
            size="small"
            options={PERSIAN_MONTHS.map((m) => m.value)}
            getOptionLabel={(v) => PERSIAN_MONTHS.find((m) => m.value === v)?.label ?? v}
            value={months}
            onChange={(_, v) => setMonths(v)}
            sx={{ minWidth: 220 }}
            renderInput={(params) => <TextField {...params} label="ماه" placeholder="همه" />}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
