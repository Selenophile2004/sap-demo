import { Router } from "express";
import { gatherAnalyticsSnapshot } from "../analytics/snapshot";
import { runScenario, type ScenarioInputs } from "../analytics/scenario";

export const scenarioRouter = Router();

scenarioRouter.post("/", (req, res) => {
  try {
    const body = req.body as Partial<ScenarioInputs>;
    const result = runScenario(gatherAnalyticsSnapshot(), {
      salesChangePct: Number(body.salesChangePct),
      targetCollectionRatePct: Number(body.targetCollectionRatePct),
      grossMarginPct: Number(body.grossMarginPct),
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ورودی سناریو معتبر نیست";
    res.status(400).json({ error: message });
  }
});
