const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faNumber1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return faNumber.format(Math.round(n));
}

export function formatRial(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${faNumber.format(Math.round(n))} ریال`;
}

export function formatCompactRial(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${faNumber1.format(n / 1e12)} هزار میلیارد ریال`;
  if (abs >= 1e9) return `${faNumber1.format(n / 1e9)} میلیارد ریال`;
  if (abs >= 1e6) return `${faNumber1.format(n / 1e6)} میلیون ریال`;
  return formatRial(n);
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${faNumber1.format(n)}٪`;
}
