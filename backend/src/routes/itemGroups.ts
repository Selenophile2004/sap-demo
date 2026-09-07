import { Router } from "express";
import {
  getGroupsSummary,
  getItems,
  assignItemGroup,
  createGroup,
  deleteGroup,
  getGroupDistribution,
} from "../services/itemGroups";

export const itemGroupsRouter = Router();

itemGroupsRouter.get("/summary", (_req, res) => {
  res.json(getGroupsSummary());
});

itemGroupsRouter.get("/items", (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const group = typeof req.query.group === "string" ? req.query.group : undefined;
  const limit = Math.min(Number(req.query.limit) || 300, 2000);
  res.json(getItems(search, group).slice(0, limit));
});

itemGroupsRouter.post("/assign", (req, res) => {
  const { itemCode, group } = req.body ?? {};
  if (typeof itemCode !== "string" || typeof group !== "string" || !group) {
    return res.status(400).json({ error: "itemCode و group الزامی است" });
  }
  assignItemGroup(itemCode, group);
  res.json({ success: true });
});

itemGroupsRouter.post("/groups", (req, res) => {
  const { name, color } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "نام گروه الزامی است" });
  }
  createGroup(name.trim(), typeof color === "string" ? color : "#94A3B8");
  res.json({ success: true });
});

itemGroupsRouter.delete("/groups/:name", (req, res) => {
  deleteGroup(req.params.name);
  res.json({ success: true });
});

itemGroupsRouter.get("/distribution", (_req, res) => {
  res.json(getGroupDistribution());
});
