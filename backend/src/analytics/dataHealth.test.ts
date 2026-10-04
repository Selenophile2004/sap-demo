import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDataHealthReport, type DatasetProfile } from "./dataHealth";

const now = new Date("2026-10-04T12:00:00.000Z");

describe("data health report", () => {
  it("scores completeness, validity, uniqueness and freshness with visible checks", () => {
    const profiles: DatasetProfile[] = [
      {
        id: "sales",
        label: "فروش",
        source: "sales.db / sales_lines",
        rowCount: 100,
        requiredValueCount: 1_000,
        missingRequiredValueCount: 10,
        duplicateKeyCount: 2,
        invalidValueCount: 1,
        updatedAt: "2026-10-04T11:00:00.000Z",
        latestPeriod: "1405/07",
      },
    ];

    const report = buildDataHealthReport(profiles, now);
    assert.equal(report.datasets[0]?.checks.length, 4);
    assert.equal(report.datasets[0]?.score > 90, true);
    assert.equal(report.datasets[0]?.status, "healthy");
    assert.equal(report.totalRows, 100);
  });

  it("marks empty or stale datasets as critical", () => {
    const report = buildDataHealthReport([{
      id: "empty",
      label: "خالی",
      source: "empty.db / rows",
      rowCount: 0,
      requiredValueCount: 0,
      missingRequiredValueCount: 0,
      duplicateKeyCount: 0,
      invalidValueCount: 0,
      updatedAt: "2026-09-01T00:00:00.000Z",
      latestPeriod: null,
    }], now);

    assert.equal(report.status, "critical");
    assert.equal(report.datasets[0]?.status, "critical");
  });

  it("does not hide a freshness warning behind a high weighted average", () => {
    const report = buildDataHealthReport([{
      id: "daily", label: "روزانه", source: "daily.db / rows", rowCount: 100,
      requiredValueCount: 500, missingRequiredValueCount: 0, duplicateKeyCount: 0,
      invalidValueCount: 0, updatedAt: "2026-09-30T12:00:00.000Z", latestPeriod: "1405/07/08",
      expectedFreshnessHours: 72,
    }], now);

    assert.equal(report.datasets[0]?.score > 90, true);
    assert.equal(report.datasets[0]?.status, "warning");
    assert.equal(report.status, "warning");
  });
});
