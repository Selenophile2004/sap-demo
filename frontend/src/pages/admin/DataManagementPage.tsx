import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  ArchiveRestore,
  BadgeCheck,
  Banknote,
  DatabaseZap,
  Download,
  FileCheck2,
  History,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  UploadCloud,
} from "lucide-react";
import { dataManagementApi, type AuditEntry, type DatasetDescriptor, type ImportJob } from "../../lib/api/dataManagementApi";
import { brand, surface } from "../../app/theme/palette";
import { formatInt } from "../../lib/format";

const DATASET_ICONS = { sales: ShoppingCart, inventory: PackageOpen, finance: Banknote } as const;
const STATUS_LABELS: Record<ImportJob["status"], string> = {
  ready: "آماده انتشار",
  rejected: "نیازمند اصلاح",
  published: "منتشرشده",
  rolled_back: "بازگردانی‌شده",
};
const STATUS_COLORS: Record<ImportJob["status"], "success" | "error" | "info" | "default"> = {
  ready: "info",
  rejected: "error",
  published: "success",
  rolled_back: "default",
};

const AUDIT_LABELS: Record<string, string> = {
  "auth.login": "ورود موفق",
  "data.preview": "اعتبارسنجی فایل",
  "data.publish": "انتشار داده",
  "data.rollback": "بازگردانی داده",
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function localDate(value: string | null) {
  return value ? new Date(value).toLocaleString("fa-IR") : "—";
}

export default function DataManagementPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [datasets, setDatasets] = useState<DatasetDescriptor[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedId, setSelectedId] = useState<DatasetDescriptor["id"]>("sales");
  const [preview, setPreview] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = useMemo(() => datasets.find((dataset) => dataset.id === selectedId), [datasets, selectedId]);

  async function reload() {
    const [datasetRows, importRows, auditRows] = await Promise.all([
      dataManagementApi.datasets(),
      dataManagementApi.imports(),
      dataManagementApi.audit(),
    ]);
    setDatasets(datasetRows);
    setImports(importRows);
    setAudit(auditRows);
  }

  useEffect(() => {
    reload().catch(() => setError("دریافت وضعیت مدیریت داده انجام نشد."));
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "csv" && extension !== "xlsx") throw new Error("فقط فایل CSV یا XLSX قابل انتخاب است.");
      const payload = extension === "csv"
        ? { datasetId: selectedId, fileName: file.name, content: await file.text() }
        : { datasetId: selectedId, fileName: file.name, contentBase64: bufferToBase64(await file.arrayBuffer()) };
      const result = await dataManagementApi.preview(payload);
      setPreview(result);
      setNotice(result.status === "ready" ? "فایل با موفقیت اعتبارسنجی شد و آماده انتشار است." : "فایل خوانده شد؛ خطاها را اصلاح و دوباره بارگذاری کنید.");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فایل قابل پردازش نیست.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function downloadTemplate() {
    try {
      const blob = await dataManagementApi.template(selectedId);
      triggerDownload(blob, `${selectedId}-template.csv`);
    } catch {
      setError("دریافت قالب انجام نشد.");
    }
  }

  async function publish() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await dataManagementApi.publish(preview.id);
      setPreview(result);
      setNotice(`${formatInt(result.validRows)} ردیف با موفقیت منتشر شد. داشبورد از داده جدید استفاده می‌کند.`);
      await reload();
    } catch (caught: unknown) {
      const message = typeof caught === "object" && caught && "response" in caught
        ? (caught as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(message ?? "انتشار داده انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function rollback(job: ImportJob) {
    setBusy(true);
    setError(null);
    try {
      await dataManagementApi.rollback(job.id);
      setNotice(`انتشار فایل «${job.fileName}» بازگردانی شد.`);
      if (preview?.id === job.id) setPreview(null);
      await reload();
    } catch (caught: unknown) {
      const message = typeof caught === "object" && caught && "response" in caught
        ? (caught as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(message ?? "بازگردانی داده انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  const previewColumns = preview?.previewRows[0] ? Object.keys(preview.previewRows[0]).slice(0, 8) : [];

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <DatabaseZap size={27} color={brand.secondary} />
            <Typography variant="h5" fontWeight={900}>مرکز مدیریت داده</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 720, lineHeight: 1.9 }}>
            ورود، کنترل کیفیت، انتشار و بازگردانی داده‌ها؛ کاملاً مستقل از اینترنت و هوش مصنوعی.
          </Typography>
        </Box>
        <Chip icon={<ShieldCheck size={15} />} label="انتشار امن و قابل بازگشت" color="success" variant="outlined" />
      </Box>

      {busy && <LinearProgress sx={{ borderRadius: 99 }} />}
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity={preview?.status === "rejected" ? "warning" : "success"} onClose={() => setNotice(null)}>{notice}</Alert>}

      <Grid container spacing={1.5}>
        {datasets.map((dataset) => {
          const Icon = DATASET_ICONS[dataset.id];
          const active = selectedId === dataset.id;
          return (
            <Grid key={dataset.id} size={{ xs: 12, md: 4 }}>
              <Paper
                component="button"
                type="button"
                onClick={() => { setSelectedId(dataset.id); setPreview(null); }}
                elevation={0}
                sx={{
                  width: "100%", p: 2, textAlign: "start", color: "text.primary", cursor: "pointer",
                  borderColor: active ? brand.primaryLight : surface.border,
                  backgroundImage: active ? "linear-gradient(120deg, rgba(121,0,221,.15), transparent)" : "none",
                  "&:focus-visible": { outline: `2px solid ${brand.secondary}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
                  <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "rgba(121,0,221,.14)" }}><Icon size={19} /></Box>
                  <Box>
                    <Typography fontWeight={800}>{dataset.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{dataset.description}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={850}>ورود {selected?.title ?? "داده"}</Typography>
            <Typography variant="caption" color="text.secondary">ابتدا اعتبارسنجی و پیش‌نمایش؛ سپس انتشار با تأیید شما</Typography>
          </Box>
          <Button startIcon={<Download size={16} />} onClick={downloadTemplate}>دریافت قالب استاندارد</Button>
        </Box>
        <input ref={inputRef} hidden type="file" accept=".csv,.xlsx" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
        <Box
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) handleFile(file); }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
          sx={{
            minHeight: 150, border: `1px dashed ${surface.borderStrong}`, borderRadius: 1.5, display: "grid", placeItems: "center",
            textAlign: "center", cursor: "pointer", bgcolor: surface.glassHover, transition: "border-color .2s, background-color .2s",
            "&:hover": { borderColor: brand.primaryLight, bgcolor: "rgba(121,0,221,.08)" },
          }}
        >
          <Box sx={{ py: 2 }}>
            {busy ? <CircularProgress size={30} /> : <UploadCloud size={34} color={brand.primaryLight} />}
            <Typography fontWeight={800} sx={{ mt: 1 }}>فایل را اینجا رها کنید یا انتخاب کنید</Typography>
            <Typography variant="caption" color="text.secondary">CSV یا Excel، حداکثر ۵ مگابایت و ۲۰۰۰ ردیف</Typography>
          </Box>
        </Box>

        {preview && (
          <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip icon={<FileCheck2 size={14} />} label={`${formatInt(preview.totalRows)} ردیف خوانده شد`} />
                <Chip icon={<BadgeCheck size={14} />} label={`${formatInt(preview.validRows)} ردیف معتبر`} color="success" variant="outlined" />
                {preview.errorCount > 0 && <Chip label={`${formatInt(preview.errorCount)} خطا`} color="error" variant="outlined" />}
              </Box>
              {preview.status === "ready" && <Button variant="contained" onClick={publish} disabled={busy} startIcon={<DatabaseZap size={17} />}>انتشار داده‌ها</Button>}
            </Box>
            {preview.errors.length > 0 && (
              <Alert severity="warning">
                {preview.errors.slice(0, 8).map((item) => <Typography key={`${item.row}-${item.field}`} variant="body2">ردیف {item.row || "—"}: {item.message}</Typography>)}
              </Alert>
            )}
            {preview.previewRows.length > 0 && (
              <TableContainer sx={{ maxHeight: 330, border: `1px solid ${surface.border}`, borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow>{previewColumns.map((column) => <TableCell key={column}>{column}</TableCell>)}</TableRow></TableHead>
                  <TableBody>{preview.previewRows.slice(0, 10).map((row, index) => <TableRow key={index}>{previewColumns.map((column) => <TableCell key={column}>{String(row[column] ?? "—")}</TableCell>)}</TableRow>)}</TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}><History size={18} /><Typography variant="h6" fontWeight={850}>تاریخچه انتشار</Typography></Box>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>فایل</TableCell><TableCell>مجموعه</TableCell><TableCell>وضعیت</TableCell><TableCell>ردیف معتبر</TableCell><TableCell>زمان</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {imports.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell>{job.fileName}</TableCell><TableCell>{datasets.find((dataset) => dataset.id === job.datasetId)?.title ?? job.datasetId}</TableCell>
                      <TableCell><Chip size="small" label={STATUS_LABELS[job.status]} color={STATUS_COLORS[job.status]} variant="outlined" /></TableCell>
                      <TableCell>{formatInt(job.validRows)}</TableCell><TableCell>{localDate(job.publishedAt ?? job.createdAt)}</TableCell>
                      <TableCell>{job.status === "published" && <Button size="small" color="warning" onClick={() => rollback(job)} startIcon={<ArchiveRestore size={14} />}>بازگردانی</Button>}</TableCell>
                    </TableRow>
                  ))}
                  {imports.length === 0 && <TableRow><TableCell colSpan={6} align="center">هنوز فایلی وارد نشده است.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><ShieldCheck size={18} /><Typography variant="h6" fontWeight={850}>ردپای امنیتی</Typography></Box>
              <Button size="small" onClick={() => reload()} startIcon={<RefreshCw size={13} />}>تازه‌سازی</Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {audit.slice(0, 8).map((entry) => (
                <Box key={entry.id} sx={{ pb: 1.25, borderBottom: `1px solid ${surface.border}` }}>
                  <Typography variant="body2" fontWeight={750}>{AUDIT_LABELS[entry.action] ?? entry.action}</Typography>
                  <Typography variant="caption" color="text.secondary">{entry.actor} · {localDate(entry.created_at)}</Typography>
                </Box>
              ))}
              {audit.length === 0 && <Typography variant="body2" color="text.secondary">رویدادی ثبت نشده است.</Typography>}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
