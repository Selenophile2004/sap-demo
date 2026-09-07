import { useMemo } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { MarketerScoreRow } from "../../lib/api/salesApi";
import { formatCompactRial, formatInt, formatPercent } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Props {
  rows: MarketerScoreRow[];
}

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

interface Aggregated {
  visitorName: string;
  actualQty: number;
  actualQtyCarton: number;
  actualAmount: number;
  targetQty: number;
  hasTarget: boolean;
}

export default function MarketerScorecardTable({ rows }: Props) {
  const aggregated = useMemo(() => {
    const map = new Map<string, Aggregated>();
    for (const r of rows) {
      const entry = map.get(r.visitorName) ?? {
        visitorName: r.visitorName,
        actualQty: 0,
        actualQtyCarton: 0,
        actualAmount: 0,
        targetQty: 0,
        hasTarget: false,
      };
      entry.actualQty += r.actualQty;
      // actualQtyCarton هر سطر از قبل «تحقق سقف‌شده به تفکیک گروه کالا» برای همان ماه
      // است (نه فروش خام)، پس جمع‌زدنش روی چند ماهِ فیلترشده معتبر است — برخلاف
      // جمع‌زدن مستقیم چند درصدِ ماهانه با هم.
      entry.actualQtyCarton += r.actualQtyCarton;
      entry.actualAmount += r.actualAmount;
      if (r.targetQty !== null) {
        entry.targetQty += r.targetQty;
        entry.hasTarget = true;
      }
      map.set(r.visitorName, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.actualAmount - a.actualAmount);
  }, [rows]);

  return (
    <TableContainer sx={{ maxHeight: "100%" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>ویزیتور</TableCell>
            <TableCell sx={headerSx} align="left">
              فروش خالص
            </TableCell>
            <TableCell sx={headerSx} align="center">
              تعداد (کارتن)
            </TableCell>
            <TableCell sx={headerSx} align="center">
              تارگت (کارتن)
            </TableCell>
            <TableCell sx={headerSx} align="center">
              درصد تحقق
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {aggregated.slice(0, 25).map((r) => (
            <TableRow key={r.visitorName} hover>
              <TableCell>{r.visitorName}</TableCell>
              <TableCell align="left" sx={{ direction: "ltr" }}>
                {formatCompactRial(r.actualAmount)}
              </TableCell>
              <TableCell align="center">{formatInt(r.actualQtyCarton)}</TableCell>
              <TableCell align="center">
                {r.hasTarget ? (
                  formatInt(r.targetQty)
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    بدون تارگت
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">
                {r.hasTarget && r.targetQty > 0 ? formatPercent((r.actualQtyCarton / r.targetQty) * 100) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
