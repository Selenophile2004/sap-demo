import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPresentation, detectAnalysisIntent, type AnalyticsSnapshot } from "./presentation";
import { getMetricDefinition } from "./metricCatalog";

const snapshot: AnalyticsSnapshot = {
  generatedAt: "2026-10-04T10:00:00.000Z",
  sales: {
    netAmount: 450_000_000,
    invoiceCount: 125,
    previousNetAmount: 400_000_000,
    monthly: [
      { label: "1405/05", value: 120_000_000 },
      { label: "1405/06", value: 140_000_000 },
      { label: "1405/07", value: 190_000_000 },
    ],
  },
  receivables: { unpaidAmount: 85_000_000, collectionRatePct: 72 },
  finance: { cashBalance: 230_000_000, roiPct: 18.4, budgetAchievementPct: 91 },
  hr: { headcount: 84, monthly: [{ label: "1405/07", value: 84 }] },
  inventory: { sellableQty: 12_500, reservedQty: 1_400 },
};

describe("analytics presentation", () => {
  it("exposes only catalogued metrics with approved dimensions", () => {
    assert.deepEqual(getMetricDefinition("sales.net_amount")?.allowedDimensions, ["month", "sales_center", "province"]);
    assert.equal(getMetricDefinition("sales.drop_table"), null);
  });

  it("detects a sales chart request without relying on a language model", () => {
    const intent = detectAnalysisIntent("فروش سه ماه اخیر را با نمودار نمایش بده");
    assert.equal(intent.topic, "sales");
    assert.equal(intent.wantsChart, true);
  });

  it("builds KPI cards and a whitelisted line chart from trusted snapshot values", () => {
    const presentation = buildPresentation("فروش سه ماه اخیر را با نمودار نمایش بده", snapshot);

    assert.equal(presentation.widgets.some((widget) => widget.type === "kpi"), true);
    const chart = presentation.widgets.find((widget) => widget.type === "chart");
    assert.ok(chart && chart.type === "chart");
    assert.equal(chart.chartType, "line");
    assert.deepEqual(chart.labels, ["1405/05", "1405/06", "1405/07"]);
    assert.equal(chart.series[0]?.metricId, "sales.net_amount");
    assert.equal(presentation.explainability.method, "deterministic-metrics");
    assert.equal(presentation.explainability.evidence.some((item) => item.metricId === "sales.net_amount"), true);
    const salesEvidence = presentation.explainability.evidence.find((item) => item.metricId === "sales.net_amount");
    assert.match(salesEvidence?.formula ?? "", /SUM/i);
    assert.match(salesEvidence?.source ?? "", /sales_lines/i);
  });

  it("falls back to an executive overview for an ambiguous request", () => {
    const presentation = buildPresentation("وضعیت شرکت چطور است؟", snapshot);
    const metricIds = presentation.widgets
      .filter((widget) => widget.type === "kpi")
      .map((widget) => widget.metricId);

    assert.equal(presentation.topic, "overview");
    assert.equal(metricIds.includes("sales.net_amount"), true);
    assert.equal(metricIds.includes("receivables.unpaid_amount"), true);
  });
});
