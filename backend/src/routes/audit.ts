import { Router } from "express";
import { auditDb } from "../db/auditDb";
import { requirePermission } from "../middleware/requireAuth";

export const auditRouter = Router();

auditRouter.get("/", requirePermission("audit:read"), (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const rows = auditDb().prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?").all(limit);
  res.json(rows);
});
