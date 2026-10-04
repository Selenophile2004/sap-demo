import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runScenario } from "./scenario";
import type { AnalyticsSnapshot } from "./presentation";

const snapshot: AnalyticsSnapshot = {
  generatedAt: "2026-10-04T10:00:00.000Z",
  sales: { netAmount: 1_000, previousNetAmount: 900, invoiceCount: 10, monthly: [] },
  receivables: { unpaidAmount: 300, collectionRatePct: 70 },
  finance: { cashBalance: 500, roiPct: 12, budgetAchievementPct: 90 },
  hr: { headcount: 20, monthly: [] },
  inventory: { sellableQty: 100, reservedQty: 25 },
};

describe("what-if scenario", () => {
  it("calculates transparent projections without mutating the source snapshot", () => {
    const before = structuredClone(snapshot);
    const result = runScenario(snapshot, { salesChangePct: 20, targetCollectionRatePct: 80, grossMarginPct: 30 });

    assert.equal(result.projected.sales, 1_200);
    assert.equal(result.projected.collectedCashProxy, 960);
    assert.equal(result.projected.grossProfitProxy, 360);
    assert.equal(result.projected.receivablesProxy, 240);
    assert.deepEqual(snapshot, before);
    assert.equal(result.assumptions.length >= 3, true);
  });

  it("rejects inputs outside the approved guardrails", () => {
    assert.throws(
      () => runScenario(snapshot, { salesChangePct: 400, targetCollectionRatePct: 80, grossMarginPct: 30 }),
      /salesChangePct/,
    );
  });
});
