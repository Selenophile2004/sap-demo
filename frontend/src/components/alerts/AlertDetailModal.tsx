import { useEffect, useState } from "react";
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
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { alertsApi, type AlertDetail } from "../../lib/api/alertsApi";
import { formatCompactRial } from "../../lib/format";
import { surface } from "../../app/theme/palette";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  category: string;
  entity: string;
}

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

export default function AlertDetailModal({ open, onClose, title, category, entity }: Props) {
  const [data, setData] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setData(null);
    alertsApi
      .detail(category, entity)
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, category, entity]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle component="span" sx={{ fontWeight: 800 }}>
        جزئیات — {title}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            {data && data.monthlyTrend.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  روند ماهانه فروش (۱۲ ماه اخیر)
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {data.monthlyTrend.map((m) => (
                    <Box
                      key={m.ym}
                      sx={{ px: 1.5, py: 0.75, borderRadius: 1, bgcolor: surface.tableHeaderBg, minWidth: 90, textAlign: "center" }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block">
                        {m.ym}
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ direction: "ltr", display: "block" }}>
                        {formatCompactRial(m.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {data && data.invoices.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  آخرین فاکتورها
                </Typography>
                <TableContainer sx={{ maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerSx}>تاریخ</TableCell>
                        <TableCell sx={headerSx}>کالا</TableCell>
                        <TableCell sx={headerSx}>مرکز فروش</TableCell>
                        <TableCell sx={headerSx} align="left">
                          مبلغ
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.invoices.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{r.invoice_date_jalali}</TableCell>
                          <TableCell>{r.item_name}</TableCell>
                          <TableCell>{r.sales_center}</TableCell>
                          <TableCell align="left" sx={{ direction: "ltr" }}>
                            {formatCompactRial(r.net_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {data && data.receivableRows.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  اسناد مانده مطالبات
                </Typography>
                <TableContainer sx={{ maxHeight: 260 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headerSx}>تاریخ</TableCell>
                        <TableCell sx={headerSx}>نوع سند</TableCell>
                        <TableCell sx={headerSx} align="left">
                          مبلغ فاکتور
                        </TableCell>
                        <TableCell sx={headerSx} align="left">
                          مانده
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.receivableRows.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{r.invoice_date_jalali}</TableCell>
                          <TableCell>{r.invoice_kind}</TableCell>
                          <TableCell align="left" sx={{ direction: "ltr" }}>
                            {formatCompactRial(r.invoice_net_amount)}
                          </TableCell>
                          <TableCell align="left" sx={{ direction: "ltr" }}>
                            {formatCompactRial(r.amount_unpaid)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {data && data.invoices.length === 0 && data.receivableRows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                جزئیات بیشتری برای این هشدار موجود نیست.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
}
