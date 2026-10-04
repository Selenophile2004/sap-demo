import { Router } from "express";
import { gatherAnalyticsSnapshot } from "../analytics/snapshot";
import { gatherDataHealthReport } from "../analytics/dataHealthSource";
import { buildExecutiveHtml, buildExecutiveWorkbook } from "../reports/executiveReport";
import { config } from "../config";

export const reportsRouter = Router();

reportsRouter.get("/executive.xlsx", async (_req, res, next) => {
  try {
    const snapshot = gatherAnalyticsSnapshot();
    const buffer = await buildExecutiveWorkbook(snapshot, gatherDataHealthReport());
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=executive-report.xlsx");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/executive.html", (_req, res) => {
  const snapshot = gatherAnalyticsSnapshot();
  res.type("html").send(buildExecutiveHtml(snapshot, gatherDataHealthReport(), config.companyName));
});
