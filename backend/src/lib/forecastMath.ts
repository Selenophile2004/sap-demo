/** Converts a value expressed in today's purchasing power to its future nominal amount. */
export function currentValueToFutureNominal(currentValue: number, monthlyInflationRate: number, monthsAhead: number): number {
  const safeMonths = Math.max(0, Math.floor(monthsAhead));
  return currentValue * (1 + monthlyInflationRate) ** safeMonths;
}
