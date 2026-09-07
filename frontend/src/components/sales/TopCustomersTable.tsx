import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from "@mui/material";
import type { TopCustomerRow } from "../../lib/api/salesApi";
import { formatCompactRial, formatInt } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Props {
  rows: TopCustomerRow[];
}

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

export default function TopCustomersTable({ rows }: Props) {
  return (
    <TableContainer sx={{ maxHeight: "100%" }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={headerSx}>#</TableCell>
            <TableCell sx={headerSx}>مشتری</TableCell>
            <TableCell sx={headerSx} align="left">
              فروش خالص
            </TableCell>
            <TableCell sx={headerSx} align="center">
              تعداد فاکتور
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.customer_code} hover>
              <TableCell>
                <Chip
                  size="small"
                  label={i + 1}
                  color={i < 3 ? "secondary" : "default"}
                  sx={{ minWidth: 28, fontWeight: 700 }}
                />
              </TableCell>
              <TableCell>{r.customer_name}</TableCell>
              <TableCell align="left" sx={{ direction: "ltr" }}>
                {formatCompactRial(r.netAmount)}
              </TableCell>
              <TableCell align="center">{formatInt(r.invoiceCount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
