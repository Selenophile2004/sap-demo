import { config } from "../config";
import { runEtl, SOURCE_FILE_TO_MODULE, type EtlModuleName } from "./runner";

const DEBOUNCE_MS = 4000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingModules = new Set<EtlModuleName>();

function scheduleRun(moduleName: EtlModuleName) {
  pendingModules.add(moduleName);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const modules = Array.from(pendingModules);
    pendingModules.clear();
    console.log(`[watcher] تغییر شناسایی شد، اجرای خودکار ETL برای: ${modules.join(", ")}`);
    const results = await runEtl(modules, "watcher");
    for (const r of results) {
      console.log(`[watcher] ${r.module}: ${r.success ? "موفق" : "ناموفق"} (${r.durationMs}ms)`);
    }
  }, DEBOUNCE_MS);
}

// chokidar 5+ is ESM-only؛ چون بقیه‌ی بک‌اند CommonJS است، اینجا با import پویا بارگذاری می‌شود
export async function startDataWatcher() {
  const { default: chokidar } = await import("chokidar");

  const watcher = chokidar.watch(config.dataDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 300 },
  });

  watcher.on("all", (_event, filePath) => {
    const fileName = filePath.split(/[\\/]/).pop() ?? "";
    const moduleName = SOURCE_FILE_TO_MODULE[fileName];
    if (moduleName) {
      scheduleRun(moduleName);
    }
  });

  console.log(`[watcher] در حال زیرنظرگرفتن پوشه‌ی داده: ${config.dataDir}`);
  return watcher;
}
