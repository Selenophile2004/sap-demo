export type DataHealthStatus = "healthy" | "warning" | "critical";

export interface DatasetProfile {
  id: string;
  label: string;
  source: string;
  rowCount: number;
  requiredValueCount: number;
  missingRequiredValueCount: number;
  duplicateKeyCount: number;
  invalidValueCount: number;
  updatedAt: string;
  latestPeriod: string | null;
  expectedFreshnessHours?: number;
}

export interface DataHealthCheck {
  id: "completeness" | "uniqueness" | "validity" | "freshness";
  label: string;
  score: number;
  status: DataHealthStatus;
  affectedRows: number;
  affectedRatePct: number;
  detail: string;
}

export interface DatasetHealth extends DatasetProfile {
  score: number;
  status: DataHealthStatus;
  freshnessHours: number;
  checks: DataHealthCheck[];
}

export interface DataHealthReport {
  generatedAt: string;
  score: number;
  status: DataHealthStatus;
  totalRows: number;
  staleDatasetCount: number;
  datasets: DatasetHealth[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 10) / 10;

function statusFor(score: number, critical = false): DataHealthStatus {
  if (critical || score < 60) return "critical";
  return score < 85 ? "warning" : "healthy";
}

function rateScore(affected: number, denominator: number): { score: number; rate: number } {
  if (denominator <= 0) return { score: 0, rate: 100 };
  const rate = clamp((affected / denominator) * 100);
  return { score: round(100 - rate), rate: round(rate) };
}

function buildDatasetHealth(profile: DatasetProfile, now: Date): DatasetHealth {
  const completeness = rateScore(profile.missingRequiredValueCount, profile.requiredValueCount);
  const uniqueness = rateScore(profile.duplicateKeyCount, profile.rowCount);
  const validity = rateScore(profile.invalidValueCount, profile.rowCount);
  const freshnessHours = Math.max(0, (now.getTime() - new Date(profile.updatedAt).getTime()) / 3_600_000);
  const expectedFreshnessHours = profile.expectedFreshnessHours ?? 72;
  const freshnessScore = freshnessHours <= expectedFreshnessHours ? 100 : freshnessHours <= expectedFreshnessHours * 2 ? 85 : freshnessHours <= expectedFreshnessHours * 3 ? 65 : 35;
  const empty = profile.rowCount === 0;
  const score = empty ? 0 : round(
    completeness.score * 0.35 + uniqueness.score * 0.2 + validity.score * 0.2 + freshnessScore * 0.25,
  );
  const checks: DataHealthCheck[] = [
    {
      id: "completeness", label: "کامل‌بودن", score: completeness.score,
      status: statusFor(completeness.score, empty), affectedRows: profile.missingRequiredValueCount,
      affectedRatePct: completeness.rate, detail: `${profile.missingRequiredValueCount.toLocaleString("fa-IR")} مقدار الزامی خالی است.`,
    },
    {
      id: "uniqueness", label: "یکتایی کلید", score: uniqueness.score,
      status: statusFor(uniqueness.score, empty), affectedRows: profile.duplicateKeyCount,
      affectedRatePct: uniqueness.rate, detail: `${profile.duplicateKeyCount.toLocaleString("fa-IR")} رکورد با کلید تکراری شناسایی شد.`,
    },
    {
      id: "validity", label: "اعتبار مقادیر", score: validity.score,
      status: statusFor(validity.score, empty), affectedRows: profile.invalidValueCount,
      affectedRatePct: validity.rate, detail: `${profile.invalidValueCount.toLocaleString("fa-IR")} رکورد خارج از قواعد دامنه است.`,
    },
    {
      id: "freshness", label: "تازگی داده", score: freshnessScore,
      status: freshnessHours <= expectedFreshnessHours ? "healthy" : freshnessScore < 60 ? "critical" : "warning",
      affectedRows: freshnessHours > expectedFreshnessHours ? 1 : 0,
      affectedRatePct: freshnessHours > expectedFreshnessHours ? 100 : 0, detail: `آخرین داده ${round(freshnessHours).toLocaleString("fa-IR")} ساعت قبل ثبت شده؛ چرخه مورد انتظار ${expectedFreshnessHours.toLocaleString("fa-IR")} ساعت است.`,
    },
  ];
  const checkStatus: DataHealthStatus = checks.some((check) => check.status === "critical")
    ? "critical"
    : checks.some((check) => check.status === "warning") ? "warning" : "healthy";
  return { ...profile, freshnessHours: round(freshnessHours), score, status: empty ? "critical" : checkStatus, checks };
}

export function buildDataHealthReport(profiles: DatasetProfile[], now = new Date()): DataHealthReport {
  const datasets = profiles.map((profile) => buildDatasetHealth(profile, now));
  const score = datasets.length ? round(datasets.reduce((sum, item) => sum + item.score, 0) / datasets.length) : 0;
  const status: DataHealthStatus = datasets.length === 0 || datasets.some((item) => item.status === "critical")
    ? "critical"
    : datasets.some((item) => item.status === "warning") ? "warning" : statusFor(score);
  return {
    generatedAt: now.toISOString(),
    score,
    status,
    totalRows: datasets.reduce((sum, item) => sum + item.rowCount, 0),
    staleDatasetCount: datasets.filter((item) => item.checks.find((check) => check.id === "freshness")?.affectedRows).length,
    datasets,
  };
}
