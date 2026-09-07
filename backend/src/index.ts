import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { metaRouter } from "./routes/meta";
import { refreshRouter } from "./routes/refresh";
import { requireAuth } from "./middleware/requireAuth";
import { startDataWatcher } from "./etl/watcher";
import { salesRouter } from "./routes/sales";
import { receivablesRouter } from "./routes/receivables";
import { pnlRouter } from "./routes/pnl";
import { hrRouter } from "./routes/hr";
import { itemGroupsRouter } from "./routes/itemGroups";
import { forecastRouter } from "./routes/forecast";
import { alertsRouter } from "./routes/alerts";
import { marketerRouter } from "./routes/marketer";
import { inventoryRouter } from "./routes/inventory";
import { commentsRouter } from "./routes/comments";
import { homeRouter } from "./routes/home";
import { financeRouter } from "./routes/finance";
import { assistantRouter } from "./routes/assistant";

const app = express();

// اکسپرس ۵ به‌طور پیش‌فرض پارسر ساده (بدون پشتیبانی از پرانتز آرایه‌ای مثل years[]=x)
// استفاده می‌کند؛ چون axios فیلترهای آرایه‌ای (center, visitor, years, months, ...)
// را به همین شکل سریالایز می‌کند، باید صریحاً به پارسر extended (qs) برگردیم.
app.set("query parser", "extended");

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/meta", requireAuth, metaRouter);
app.use("/api/refresh", requireAuth, refreshRouter);
app.use("/api/sales", requireAuth, salesRouter);
app.use("/api/receivables", requireAuth, receivablesRouter);
app.use("/api/pnl", requireAuth, pnlRouter);
app.use("/api/hr", requireAuth, hrRouter);
app.use("/api/item-groups", requireAuth, itemGroupsRouter);
app.use("/api/forecast", requireAuth, forecastRouter);
app.use("/api/alerts", requireAuth, alertsRouter);
app.use("/api/marketer", requireAuth, marketerRouter);
app.use("/api/inventory", requireAuth, inventoryRouter);
app.use("/api/comments", requireAuth, commentsRouter);
app.use("/api/home", requireAuth, homeRouter);
app.use("/api/finance", requireAuth, financeRouter);
app.use("/api/assistant", requireAuth, assistantRouter);

// روی هاست، فایل‌های استاتیک فرانت‌اند build‌شده هم از همین یک پردازش سرو
// می‌شوند (هم‌مبدأ با API، بدون نیاز به CORS). چون BrowserRouter استفاده شده،
// مسیرهای فرانت‌اند (مثل /sales) باید همیشه به index.html برگردند، وگرنه رفرش
// صفحه در آن مسیرها ۴۰۴ می‌دهد.
if (config.publicDir) {
  app.use(express.static(config.publicDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(config.publicDir as string, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`26-SAP-D-MSR API listening on http://localhost:${config.port}`);
  if (config.etlEnabled) {
    startDataWatcher().catch((err) => console.error("[watcher] راه‌اندازی ناموفق:", err));
  }
});
