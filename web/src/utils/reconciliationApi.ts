import { api } from '../services/api';

export type ReconciliationPreview = {
  accountId: number;
  period: string;
  periodEnd: string;
  openingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  cashMovementTotal: number;
  calculatedBalance: number;
  adjustmentsTotal: number;
  closingBalance: number | null;
  reconciledAt: string | null;
  adjustments: Array<{
    id: number;
    date: string;
    amount: number;
    comment: string | null;
  }>;
};

export type ReconciliationHistoryRow = {
  id: number;
  period: string;
  openingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  cashMovementTotal: number;
  calculatedBalance: number;
  adjustmentsTotal: number;
  closingBalance: number;
  reconciledAt: string | null;
};

export function currentMonthParam(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function periodLabel(periodStart: string): string {
  const [y, m] = periodStart.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export async function fetchReconciliationPreview(
  accountId: number,
  period: string
): Promise<ReconciliationPreview> {
  const query = encodeURIComponent(period);
  return api<ReconciliationPreview>(
    `/accounts/${accountId}/reconciliation/preview?period=${query}`
  );
}

export async function submitReconciliation(
  accountId: number,
  body: { period: string; closingBalance: number; comment?: string }
): Promise<ReconciliationPreview> {
  return api<ReconciliationPreview>(`/accounts/${accountId}/reconciliation`, {
    method: 'POST',
    body,
  });
}

export async function fetchReconciliationHistory(
  accountId: number
): Promise<ReconciliationHistoryRow[]> {
  return api<ReconciliationHistoryRow[]>(
    `/accounts/${accountId}/reconciliation/history`
  );
}
