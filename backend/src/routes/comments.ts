import { Router } from "express";
import { commentsDb } from "../db/commentsDb";
import type { AuthedRequest } from "../middleware/requireAuth";

export const commentsRouter = Router();

interface CommentRow {
  id: number;
  target_type: string;
  target_id: string;
  target_label: string | null;
  author: string;
  text: string;
  created_at: string;
}

// کامنت‌های یک هدف مشخص (مثلاً یک هشدار یا یک KPI خاص)
commentsRouter.get("/", (req, res) => {
  const targetType = String(req.query.targetType ?? "");
  const targetId = String(req.query.targetId ?? "");
  if (!targetType || !targetId) {
    res.status(400).json({ error: "targetType و targetId لازم است" });
    return;
  }
  const rows = commentsDb()
    .prepare(`SELECT * FROM comments WHERE target_type = @targetType AND target_id = @targetId ORDER BY created_at ASC`)
    .all({ targetType, targetId }) as CommentRow[];
  res.json(rows);
});

// همه‌ی کامنت‌ها، برای وقتی گزارش/هشدارها به کس دیگری داده می‌شود و باید کل تاریخچه دیده شود
commentsRouter.get("/all", (_req, res) => {
  const rows = commentsDb().prepare(`SELECT * FROM comments ORDER BY created_at ASC`).all() as CommentRow[];
  res.json(rows);
});

commentsRouter.post("/", (req: AuthedRequest, res) => {
  const { targetType, targetId, targetLabel, text } = req.body as {
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    text?: string;
  };
  if (!targetType || !targetId || !text?.trim()) {
    res.status(400).json({ error: "targetType، targetId و text لازم است" });
    return;
  }
  const author = req.user?.displayName ?? "ناشناس";
  const info = commentsDb()
    .prepare(
      `INSERT INTO comments (target_type, target_id, target_label, author, text) VALUES (@targetType, @targetId, @targetLabel, @author, @text)`
    )
    .run({ targetType, targetId, targetLabel: targetLabel ?? null, author, text: text.trim() });
  const row = commentsDb().prepare(`SELECT * FROM comments WHERE id = ?`).get(info.lastInsertRowid) as CommentRow;
  res.status(201).json(row);
});

commentsRouter.delete("/:id", (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const row = commentsDb().prepare(`SELECT * FROM comments WHERE id = ?`).get(id) as CommentRow | undefined;
  if (!row) {
    res.status(404).json({ error: "کامنت پیدا نشد" });
    return;
  }
  // فقط نویسنده‌ی خودِ کامنت می‌تواند حذفش کند
  if (row.author !== req.user?.displayName) {
    res.status(403).json({ error: "فقط نویسنده می‌تواند کامنت خودش را حذف کند" });
    return;
  }
  commentsDb().prepare(`DELETE FROM comments WHERE id = ?`).run(id);
  res.json({ ok: true });
});
