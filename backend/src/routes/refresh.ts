import { Router } from "express";
import { config } from "../config";
import { runEtl, ETL_ORDER, lastRunStatus, type EtlModuleName } from "../etl/runner";

export const refreshRouter = Router();

let refreshInProgress = false;

refreshRouter.post("/", async (req, res) => {
  if (!config.etlEnabled) {
    return res
      .status(503)
      .json({ error: "بروزرسانی خودکار روی نسخه‌ی آنلاین غیرفعال است؛ دیتا به‌صورت دستی توسط تیم آپلود می‌شود." });
  }
  if (refreshInProgress) {
    return res.status(409).json({ error: "یک بروزرسانی دیگر در حال اجراست" });
  }

  const requested = req.body?.modules as string[] | undefined;
  const modules: EtlModuleName[] = requested?.length
    ? (requested.filter((m) => ETL_ORDER.includes(m as EtlModuleName)) as EtlModuleName[])
    : ETL_ORDER;

  refreshInProgress = true;
  try {
    const results = await runEtl(modules, "manual");
    const allOk = results.every((r) => r.success);
    res.status(allOk ? 200 : 500).json({ success: allOk, results });
  } finally {
    refreshInProgress = false;
  }
});

refreshRouter.get("/status", (_req, res) => {
  res.json({ inProgress: refreshInProgress, lastRunStatus });
});
