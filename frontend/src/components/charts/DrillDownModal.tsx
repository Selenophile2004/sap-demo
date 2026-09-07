import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { surface } from "../../app/theme/palette";

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

export interface DrillDownRow {
  label: string;
  value: string;
  secondary?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: [string, string] | [string, string, string];
  rows: DrillDownRow[];
}

export default function DrillDownModal({ open, onClose, title, columns, rows }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle component="span" sx={{ fontWeight: 800 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>{columns[0]}</TableCell>
                <TableCell sx={headerSx} align="left">
                  {columns[1]}
                </TableCell>
                {columns[2] && (
                  <TableCell sx={headerSx} align="center">
                    {columns[2]}
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.label + i} hover>
                  <TableCell>{r.label}</TableCell>
                  <TableCell align="left" sx={{ direction: "ltr" }}>
                    {r.value}
                  </TableCell>
                  {columns[2] && <TableCell align="center">{r.secondary}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
}
