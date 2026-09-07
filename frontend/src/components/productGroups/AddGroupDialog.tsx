import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from "@mui/material";

const PALETTE = [
  "#EA2228", "#F8B17B", "#4ADE80", "#60A5FA", "#C084FC", "#F472B6",
  "#FACC15", "#34D399", "#38BDF8", "#FB923C", "#A78BFA", "#94A3B8",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

export default function AddGroupDialog({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  function handleCreate() {
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setName("");
    setColor(PALETTE[0]);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={800}>گروه کالایی جدید</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="نام گروه"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {PALETTE.map((c) => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                bgcolor: c,
                cursor: "pointer",
                border: color === c ? "3px solid #fff" : "3px solid transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                transition: "transform .12s ease",
                "&:hover": { transform: "scale(1.15)" },
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>
          ایجاد گروه
        </Button>
      </DialogActions>
    </Dialog>
  );
}
