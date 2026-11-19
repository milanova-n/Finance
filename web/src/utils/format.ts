export function money(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

/** The symbol for a currency code — "€" for EUR — for use as a field prefix. */
export function currencySymbol(currency = 'EUR'): string {
  const parts = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/** Calendar day from an ISO or date-time string (`YYYY-MM-DD…`). */
export function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** Parse `YYYY-MM-DD` as a local calendar date (avoids UTC shift in grids). */
export function parseIsoDateLocal(iso: string): Date | null {
  const day = isoDateOnly(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shortDate(iso: string): string {
  const parsed = parseIsoDateLocal(iso);
  if (!parsed) return iso;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

/** Today in `YYYY-MM-DD`, in the browser's own timezone. */
export function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
