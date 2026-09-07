import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from "@mui/material";
import { formatCompactRial } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Row {
  name: string;
  amount: number;
  secondary?: string;
}

interface Props {
  rows: Row[];
  amountLabel?: string;
  secondaryLabel?: string;
  formatAmount?: (v: number) => string;
}

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

export default function RankedAmountTable({ rows, amountLabel = "مبلغ", secondaryLabel, formatAmount = formatCompactRial }: Props) {
  return (
    <TableContainer sx={{ maxHeight: "100%" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>#</TableCell>
            <TableCell sx={headerSx}>نام</TableCell>
            <TableCell sx={headerSx} align="left">
              {amountLabel}
            </TableCell>
            {secondaryLabel && (
              <TableCell sx={headerSx} align="center">
                {secondaryLabel}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.name + i} hover>
              <TableCell>
                <Chip size="small" label={i + 1} color={i < 3 ? "secondary" : "default"} sx={{ minWidth: 28, fontWeight: 700 }} />
              </TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell align="left" sx={{ direction: "ltr" }}>
                {formatAmount(r.amount)}
              </TableCell>
              {secondaryLabel && <TableCell align="center">{r.secondary}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
