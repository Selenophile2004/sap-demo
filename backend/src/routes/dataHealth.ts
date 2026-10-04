import { Router } from "express";
import { gatherDataHealthReport } from "../analytics/dataHealthSource";

export const dataHealthRouter = Router();

dataHealthRouter.get("/", (_req, res) => {
  res.json(gatherDataHealthReport());
});
