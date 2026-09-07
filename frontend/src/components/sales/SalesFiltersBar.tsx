import { Autocomplete, TextField, ToggleButtonGroup, ToggleButton, Paper } from "@mui/material";
import type { SalesFilterOptions } from "../../lib/api/salesApi";
import ActiveBasketToggle from "../common/ActiveBasketToggle";

interface Props {
  options: SalesFilterOptions | null;
  selectedCenters: string[];
  selectedVisitors: string[];
  onCentersChange: (v: string[]) => void;
  onVisitorsChange: (v: string[]) => void;
  valueMode: "rial" | "quantity";
  onValueModeChange: (v: "rial" | "quantity") => void;
  activeBasketOnly: boolean;
  onActiveBasketOnlyChange: (v: boolean) => void;
}

export default function SalesFiltersBar({
  options,
  selectedCenters,
  selectedVisitors,
  onCentersChange,
  onVisitorsChange,
  valueMode,
  onValueModeChange,
  activeBasketOnly,
  onActiveBasketOnlyChange,
}: Props) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 1, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}
    >
      <Autocomplete
        multiple
        size="small"
        options={options?.centers ?? []}
        value={selectedCenters}
        onChange={(_, v) => onCentersChange(v)}
        sx={{ minWidth: 240, flexGrow: 1 }}
        renderInput={(params) => <TextField {...params} label="مرکز فروش / شعبه" placeholder="همه" />}
      />
      <Autocomplete
        multiple
        size="small"
        options={options?.visitors ?? []}
        value={selectedVisitors}
        onChange={(_, v) => onVisitorsChange(v)}
        sx={{ minWidth: 240, flexGrow: 1 }}
        renderInput={(params) => <TextField {...params} label="ویزیتور" placeholder="همه" />}
      />
      <ActiveBasketToggle checked={activeBasketOnly} onChange={onActiveBasketOnlyChange} />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={valueMode}
        onChange={(_, v) => v && onValueModeChange(v)}
        sx={{ marginInlineStart: "auto" }}
      >
        <ToggleButton value="rial" sx={{ px: 2.5 }}>
          ریالی
        </ToggleButton>
        <ToggleButton value="quantity" sx={{ px: 2.5 }}>
          تعدادی
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
}
