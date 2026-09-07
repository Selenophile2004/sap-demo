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
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import type { ItemGroupSummary, ItemRow } from "../../lib/api/itemGroupsApi";
import { itemGroupsApi } from "../../lib/api/itemGroupsApi";
import { formatCompactRial } from "../../lib/format";
import { surface } from "../../app/theme/palette";

const headerSx = { bgcolor: surface.tableHeaderBg, fontWeight: 700, color: "text.secondary" };

interface Props {
  group: ItemGroupSummary | null;
  allGroups: ItemGroupSummary[];
  onClose: () => void;
  onChanged: () => void;
}

export default function GroupDetailDialog({ group, allGroups, onClose, onChanged }: Props) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    itemGroupsApi
      .items(undefined, group.name, 500)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [group]);

  async function handleReassign(itemCode: string, newGroup: string) {
    await itemGroupsApi.assign(itemCode, newGroup);
    setItems((prev) => prev.filter((i) => i.itemCode !== itemCode));
    onChanged();
  }

  return (
    <Dialog open={!!group} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {group && (
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: group.color }} />
        )}
        <Typography component="span" variant="h6" fontWeight={800}>
          {group?.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>کالا</TableCell>
                  <TableCell sx={headerSx} align="left">
                    فروش خالص
                  </TableCell>
                  <TableCell sx={headerSx} width={200}>
                    انتقال به
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.itemCode} hover>
                    <TableCell>{it.itemName}</TableCell>
                    <TableCell align="left" sx={{ direction: "ltr" }}>
                      {formatCompactRial(it.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value=""
                        displayEmpty
                        fullWidth
                        onChange={(e) => handleReassign(it.itemCode, e.target.value)}
                      >
                        <MenuItem value="" disabled>
                          انتخاب گروه…
                        </MenuItem>
                        <MenuItem value="بدون گروه">بدون گروه</MenuItem>
                        {allGroups
                          .filter((g) => g.name !== group?.name)
                          .map((g) => (
                            <MenuItem key={g.name} value={g.name}>
                              {g.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        این گروه فعلاً کالایی ندارد.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
}
