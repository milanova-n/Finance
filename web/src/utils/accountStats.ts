import { shortDate } from './format';
import { loadCashMovements } from './transactionLocal';
import type { Account } from '../types';

export type AccountCashStats = {
  net: number;
  firstDate: string | null;
  lastDate: string | null;
};

export function accountCashMovementStats(
  accountId: number,
  options?: { excludeCashMovementId?: number }
): AccountCashStats {
  const dates: string[] = [];
  let net = 0;

  for (const row of loadCashMovements()) {
    if (options?.excludeCashMovementId === row.id) continue;
    if (
      row.initiatorAccountId === accountId &&
      row.initiatorAccountId > 0
    ) {
      net -= row.amount;
      dates.push(row.date);
    }
    if (
      row.receiverAccountId === accountId &&
      row.receiverAccountId > 0
    ) {
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
  date: string;
  source: LatestAccountActivitySource;
};

/** Most recent ledger or cash movement date on this account, and which line it came from. */
export function latestAccountActivity(
  account: Account,
  cash: AccountCashStats
): LatestAccountActivity | null {
  const candidates: LatestAccountActivity[] = [];
  if (account.incomeLastDate) {
    candidates.push({ date: account.incomeLastDate, source: 'income' });
  }
  if (account.expenseLastDate) {
    candidates.push({ date: account.expenseLastDate, source: 'expense' });
  }
  if (cash.lastDate) {
    candidates.push({ date: cash.lastDate, source: 'cashflow' });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

export function formatLatestAccountActivity(
  activity: LatestAccountActivity | null
): string | null {
  if (!activity) return null;
  return `${shortDate(activity.date)}`;
}

/** Ledger net (income − expense) plus local cash transfers in/out of this account. */
export function accountCashflowAmount(cash: AccountCashStats): number {
  return cash.net;
}

export function accountDisplayBalance(
  account: Account,
  cash: AccountCashStats
): number {
  return (
    account.openingBalance +
    account.incomeTotal -
    account.expenseTotal +
    cash.net
  );
}
