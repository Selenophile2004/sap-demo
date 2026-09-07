import { useEffect, useState } from "react";
import { Box, Typography, TextField, Button, IconButton, Collapse } from "@mui/material";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { commentsApi, type CommentRow } from "../../lib/api/commentsApi";
import { useAuthStore } from "../../app/store/authStore";
import { surface } from "../../app/theme/palette";

interface Props {
  targetType: string;
  targetId: string;
  targetLabel?: string;
  /** اگر true باشد، لیست کامنت‌ها پیش‌فرض بسته است و با کلیک روی دکمه باز می‌شود (برای کارت‌های فشرده مثل هشدارها). */
  collapsible?: boolean;
}

export default function CommentThread({ targetType, targetId, targetLabel, collapsible }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(!collapsible);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    commentsApi.list(targetType, targetId).then((rows) => {
      setComments(rows);
      setLoaded(true);
    });
  }, [open, loaded, targetType, targetId]);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const row = await commentsApi.create(targetType, targetId, text.trim(), targetLabel);
      setComments((prev) => [...prev, row]);
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    await commentsApi.remove(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Box sx={{ mt: 1 }}>
      {collapsible && (
        <Button
          size="small"
          startIcon={<MessageSquare size={13} />}
          onClick={() => setOpen((v) => !v)}
          sx={{ color: "text.secondary", fontSize: 12, minWidth: 0, p: 0.5 }}
        >
          {loaded && comments.length > 0 ? `کامنت‌ها (${comments.length})` : "افزودن کامنت"}
        </Button>
      )}
      <Collapse in={open}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
          {comments.map((c) => (
            <Box
              key={c.id}
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: surface.tableHeaderBg,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {c.author} — {new Date(c.created_at).toLocaleString("fa-IR")}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
                  {c.text}
                </Typography>
              </Box>
              {currentUser?.displayName === c.author && (
                <IconButton size="small" onClick={() => handleDelete(c.id)} sx={{ flexShrink: 0 }}>
                  <Trash2 size={14} />
                </IconButton>
              )}
            </Box>
          ))}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              size="small"
              placeholder="کامنت خود را بنویسید…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              fullWidth
              multiline
              maxRows={4}
            />
            <IconButton
              size="small"
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              sx={{ bgcolor: "rgba(121,0,221,0.12)", "&:hover": { bgcolor: "rgba(121,0,221,0.22)" } }}
            >
              <Send size={16} />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
