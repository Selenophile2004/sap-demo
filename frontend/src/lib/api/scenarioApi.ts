import { apiClient } from "./client";

export interface ScenarioInputs {
  salesChangePct: number;
  targetCollectionRatePct: number;
  grossMarginPct: number;
}

export interface ScenarioResult {
  generatedAt: string;
  baseline: { sales: number; collectionRatePct: number; unpaidReceivables: number; cashBalance: number };
  inputs: ScenarioInputs;
  projected: { sales: number; collectedCashProxy: number; grossProfitProxy: number; receivablesProxy: number };
  deltas: { sales: number; collectionRatePct: number; receivables: number };
  assumptions: string[];
}

export const scenarioApi = {
  run: (inputs: ScenarioInputs) => apiClient.post<ScenarioResult>("/scenario", inputs).then((response) => response.data),
};
