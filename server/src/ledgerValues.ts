/** PostgreSQL `numeric(14,2)` columns use string mode in Drizzle. */
export function moneyString(amount: number): string {
  return amount.toFixed(2);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}