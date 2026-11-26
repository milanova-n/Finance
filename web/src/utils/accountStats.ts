import { shortDate } from './format';
import type { CashMovementRow } from './cashMovementsApi';
import type { Account } from '../types';

export type AccountCashStats = {
  net: number;
  firstDate: string | null;
  lastDate: string | null;
};

export function accountCashMovementStats(
  accountId: number,
  rows: CashMovementRow[],
  options?: { excludeCashMovementId?: number }
): AccountCashStats {
  const dates: string[] = [];
  let net = 0;

  for (const row of rows) {
    if (options?.excludeCashMovementId === row.id) continue;
    if (row.initiatorAccountId === accountId && row.initiatorAccountId > 0) {
      net -= row.amount;
      dates.push(row.date);
    }
    if (row.receiverAccountId === accountId && row.receiverAccountId > 0) {
      net += row.amount;
      dates.push(row.date);
    }
  }

  if (dates.length === 0) {
    return { net: 0, firstDate: null, lastDate: null };
  }

  dates.sort();
  return {
    net,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}

export type LatestAccountActivitySource = 'income' | 'expense' | 'cashflow';

export type LatestAccountActivity = {
  source: LatestAccountActivitySource;
  date: string;
  label: string;
};

export function accountDisplayBalance(
  account: Pick<Account, 'balance' | 'reconciledBalance'>,
  cash: AccountCashStats
): number {
  if (
    account.reconciledBalance != null &&
    Number.isFinite(account.reconciledBalance)
  ) {
    return account.reconciledBalance;
  }
  return account.balance + cash.net;
}

export function accountCashflowAmount(cash: AccountCashStats): number {
  return cash.net;
}

export function latestAccountActivity(
  account: Account,
  cash: AccountCashStats
): LatestAccountActivity | null {
  const candidates: LatestAccountActivity[] = [];
  if (account.incomeLastDate) {
    candidates.push({
      source: 'income',
      date: account.incomeLastDate,
      label: 'Income',
    });
  }
  if (account.expenseLastDate) {
    candidates.push({
      source: 'expense',
      date: account.expenseLastDate,
      label: 'Expense',
    });
  }
  if (cash.lastDate) {
    candidates.push({
      source: 'cashflow',
      date: cash.lastDate,
      label: 'Cash movement',
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

export function formatLatestAccountActivity(
  activity: LatestAccountActivity | null
): string {
  if (!activity) return 'No activity yet';
  return `${activity.label} · ${shortDate(activity.date)}`;
}
