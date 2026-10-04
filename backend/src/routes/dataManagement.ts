import { Router } from "express";
import { DATASET_CATALOG, getDatasetDescriptor } from "../data-import/catalog";
import { uploadedFileToCsv } from "../data-import/fileParser";
import { createImportPreview, getImportJob, listImportJobs, publishImport, rollbackImport } from "../data-import/importManager";
import type { DatasetId } from "../data-import/importCore";
import { requirePermission, type AuthedRequest } from "../middleware/requireAuth";
import { writeAudit } from "../db/auditDb";

export const dataManagementRouter = Router();

dataManagementRouter.get("/datasets", requirePermission("data:read"), (_req, res) => {
  res.json(DATASET_CATALOG.map(({ templateCsv: _template, ...dataset }) => dataset));
});

dataManagementRouter.get("/datasets/:id/template", requirePermission("data:read"), (req, res) => {
  const dataset = getDatasetDescriptor(String(req.params.id));
  if (!dataset) return res.status(404).json({ error: "مجموعه داده پیدا نشد" });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${dataset.id}-template.csv"`);
  res.send(`\uFEFF${dataset.templateCsv}`);
});

dataManagementRouter.get("/imports", requirePermission("data:read"), (req, res) => {
  res.json(listImportJobs(Number(req.query.limit) || 30));
});

dataManagementRouter.get("/imports/:id", requirePermission("data:read"), (req, res) => {
  const job = getImportJob(String(req.params.id));
  if (!job) return res.status(404).json({ error: "درخواست ورود داده پیدا نشد" });
  res.json(job);
});

dataManagementRouter.post("/imports/preview", requirePermission("data:write"), async (req: AuthedRequest, res) => {
  try {
    const dataset = getDatasetDescriptor(String(req.body?.datasetId ?? ""));
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : "";
    if (!dataset || !fileName) return res.status(400).json({ error: "نوع داده و نام فایل الزامی است" });
    const csvContent = await uploadedFileToCsv({ fileName, content: req.body?.content, contentBase64: req.body?.contentBase64 });
    const job = createImportPreview({ datasetId: dataset.id as DatasetId, fileName, csvContent, actor: req.user!.displayName });
    writeAudit({ actor: req.user!.username, action: "data.preview", entityType: "import", entityId: job.id, details: { datasetId: job.datasetId, fileName: job.fileName, status: job.status }, ipAddress: req.ip });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "فایل قابل پردازش نیست" });
  }
});

dataManagementRouter.post("/imports/:id/publish", requirePermission("data:write"), (req: AuthedRequest, res) => {
  try {
    const job = publishImport(String(req.params.id));
    writeAudit({ actor: req.user!.username, action: "data.publish", entityType: "import", entityId: job.id, details: { datasetId: job.datasetId, validRows: job.validRows }, ipAddress: req.ip });
    res.json(job);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "انتشار انجام نشد" });
  }
});

dataManagementRouter.post("/imports/:id/rollback", requirePermission("data:rollback"), (req: AuthedRequest, res) => {
  try {
    const job = rollbackImport(String(req.params.id));
    writeAudit({ actor: req.user!.username, action: "data.rollback", entityType: "import", entityId: job.id, details: { datasetId: job.datasetId }, ipAddress: req.ip });
    res.json(job);
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "بازگردانی انجام نشد" });
  }
});
