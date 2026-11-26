import type { BalanceAdjustmentRow } from './balanceAdjustmentsApi';
import type { Entry, Transaction } from '../types';
import { periodLabel } from './reconciliationApi';

export function sortTransactions(rows: Transaction[]): Transaction[] {
  return [...rows].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id - a.id;
  });
}

function normalizeCustomFields(
  raw: Record<string, unknown> | undefined | null
): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val == null) continue;
    const s = String(val).trim();
    if (s) out[key] = s;
  }
  return out;
}

export function adjustmentRowToTransaction(
  row: BalanceAdjustmentRow
): Transaction {
  const monthLabel = periodLabel(row.period);
  const defaultComment = `Month-end reconciliation (${monthLabel})`;
  return {
    id: row.id,
    kind: 'adjustment',
    date: row.date,
    amount: row.amount,
    comment: row.comment?.trim() || defaultComment,
    accountId: row.accountId,
    accountName: row.accountName,
    currency: row.currency,
    categoryId: null,
    categoryName: 'Reconciliation',
    customFields: {},
    reconciliationPeriod: row.period,
  };
}

export function entryToTransaction(
  entry: Entry,
  kind: 'expense' | 'income'
): Transaction {
  return {
    id: entry.id,
    kind,
    date: entry.date,
    amount: entry.amount,
    comment: entry.comment,
    accountId: entry.accountId,
    accountName: entry.accountName,
    currency: entry.currency,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    purposeId: entry.purposeId ?? null,
    purposeName: entry.purposeName ?? null,
    customFields: normalizeCustomFields(entry.customFields),
  };
}
