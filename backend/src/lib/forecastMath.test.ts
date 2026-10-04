import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentValueToFutureNominal } from "./forecastMath";

describe("currentValueToFutureNominal", () => {
  it("increases future nominal value when inflation is positive", () => {
    assert.ok(Math.abs(currentValueToFutureNominal(100, 0.1, 2) - 121) < 1e-9);
  });

  it("keeps current value unchanged for a zero-month horizon", () => {
    assert.equal(currentValueToFutureNominal(250, 0.2, 0), 250);
  });
});
