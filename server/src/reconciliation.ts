import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { db } from './db.js';
import {
  accountBalanceAdjustments,
  accountMonthlyBalances,
  accounts,
  cashMovements,
  expenses,
  incomes,
} from './db/schema.js';
import { moneyString } from './ledgerValues.js';

export function parseMonthPeriod(input: string): string {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-01$/.test(trimmed)) return trimmed;
  throw Object.assign(new Error('Use a month as YYYY-MM.'), { status: 400 });
}

export function monthEnd(periodStart: string): string {
  const [y, m] = periodStart.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

export function previousMonthPeriod(periodStart: string): string {
  const [y, m] = periodStart.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 2, 1));
  return date.toISOString().slice(0, 10);
}

type ActivityTotals = {
  incomeTotal: number;
  expenseTotal: number;
  cashMovementTotal: number;
};

async function sumActivity(
  userId: number,
  accountId: number,
  fromInclusive: string | null,
  toInclusive: string | null
): Promise<ActivityTotals> {
  const incomeFilters = [
    eq(incomes.userId, userId),
    eq(incomes.accountId, accountId),
  ];
  const expenseFilters = [
    eq(expenses.userId, userId),
    eq(expenses.accountId, accountId),
  ];
  const cashFilters = [
    eq(cashMovements.userId, userId),
    sql`(${cashMovements.initiatorAccountId} = ${accountId} OR ${cashMovements.receiverAccountId} = ${accountId})`,
  ];

  if (fromInclusive) {
    incomeFilters.push(gte(incomes.date, fromInclusive));
    expenseFilters.push(gte(expenses.date, fromInclusive));
    cashFilters.push(gte(cashMovements.date, fromInclusive));
  }
  if (toInclusive) {
    incomeFilters.push(lte(incomes.date, toInclusive));
    expenseFilters.push(lte(expenses.date, toInclusive));
    cashFilters.push(lte(cashMovements.date, toInclusive));
  }

  const [[incomeRow], [expenseRow], cashResult] = await Promise.all([
    db
      .select({
        total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)`,
      })
      .from(incomes)
      .where(and(...incomeFilters)),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(...expenseFilters)),
    db.execute<{ net: number }>(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN initiator_account_id = ${accountId} THEN -amount
          WHEN receiver_account_id = ${accountId} THEN amount
          ELSE 0
        END
      ), 0)::float8 AS net
      FROM cash_movements
      WHERE user_id = ${userId}
        AND (initiator_account_id = ${accountId} OR receiver_account_id = ${accountId})
        ${fromInclusive ? sql`AND date >= ${fromInclusive}` : sql``}
        ${toInclusive ? sql`AND date <= ${toInclusive}` : sql``}
    `),
  ]);

  return {
    incomeTotal: Number(incomeRow?.total ?? 0),
    expenseTotal: Number(expenseRow?.total ?? 0),
    cashMovementTotal: Number(cashResult.rows[0]?.net ?? 0),
  };
}

export async function monthOpeningBalance(
  userId: number,
  accountId: number,
  periodStart: string
): Promise<number> {
  const prevPeriod = previousMonthPeriod(periodStart);

  const [prev] = await db
    .select({ closingBalance: accountMonthlyBalances.closingBalance })
    .from(accountMonthlyBalances)
    .where(
      and(
        eq(accountMonthlyBalances.userId, userId),
        eq(accountMonthlyBalances.accountId, accountId),
        eq(accountMonthlyBalances.period, prevPeriod),
        isNotNull(accountMonthlyBalances.reconciledAt)
      )
    )
    .limit(1);

  if (prev) return Number(prev.closingBalance);

  const [account] = await db
    .select({ openingBalance: accounts.openingBalance })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    throw Object.assign(new Error('Account not found.'), { status: 404 });
  }

  const dayBefore = new Date(`${periodStart}T00:00:00Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const toDate = dayBefore.toISOString().slice(0, 10);

  if (toDate < '1970-01-01') {
    return Number(account.openingBalance);
  }

  const before = await sumActivity(userId, accountId, null, toDate);
  return (
    Number(account.openingBalance) +
    before.incomeTotal -
    before.expenseTotal +
    before.cashMovementTotal
  );
}

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

export async function buildReconciliationPreview(
  userId: number,
  accountId: number,
  periodInput: string
): Promise<ReconciliationPreview> {
  const period = parseMonthPeriod(periodInput);
  const periodEnd = monthEnd(period);

  const [existing] = await db
    .select()
    .from(accountMonthlyBalances)
    .where(
      and(
        eq(accountMonthlyBalances.userId, userId),
        eq(accountMonthlyBalances.accountId, accountId),
        eq(accountMonthlyBalances.period, period)
      )
    )
    .limit(1);

  const openingBalance = await monthOpeningBalance(userId, accountId, period);
  const activity = await sumActivity(userId, accountId, period, periodEnd);
  const calculatedBalance =
    openingBalance +
    activity.incomeTotal -
    activity.expenseTotal +
    activity.cashMovementTotal;

  const adjustments = existing
    ? await db
        .select({
          id: accountBalanceAdjustments.id,
          date: accountBalanceAdjustments.date,
          amount: accountBalanceAdjustments.amount,
          comment: accountBalanceAdjustments.comment,
        })
        .from(accountBalanceAdjustments)
        .where(
          and(
            eq(accountBalanceAdjustments.userId, userId),
            eq(accountBalanceAdjustments.monthlyBalanceId, existing.id)
          )
        )
    : [];

  return {
    accountId,
    period,
    periodEnd,
    openingBalance,
    incomeTotal: activity.incomeTotal,
    expenseTotal: activity.expenseTotal,
    cashMovementTotal: activity.cashMovementTotal,
    calculatedBalance,
    adjustmentsTotal: existing ? Number(existing.adjustmentsTotal) : 0,
    closingBalance: existing ? Number(existing.closingBalance) : null,
    reconciledAt: existing?.reconciledAt
      ? existing.reconciledAt.toISOString()
      : null,
    adjustments: adjustments.map((row) => ({
      id: row.id,
      date: row.date,
      amount: Number(row.amount),
      comment: row.comment,
    })),
  };
}

export async function reconcileMonth(
  userId: number,
  accountId: number,
  periodInput: string,
  closingBalance: number,
  comment?: string
) {
  const period = parseMonthPeriod(periodInput);
  const preview = await buildReconciliationPreview(userId, accountId, period);
  const adjustmentAmount = closingBalance - preview.calculatedBalance;
  const periodEnd = monthEnd(period);

  return db.transaction(async (tx) => {
    const [monthly] =
      (await tx
        .select({ id: accountMonthlyBalances.id })
        .from(accountMonthlyBalances)
        .where(
          and(
            eq(accountMonthlyBalances.userId, userId),
            eq(accountMonthlyBalances.accountId, accountId),
            eq(accountMonthlyBalances.period, period)
          )
        )
        .limit(1)) ?? [];

    let monthlyId: number;

    const monthlyValues = {
      userId,
      accountId,
      period,
      openingBalance: moneyString(preview.openingBalance),
      incomeTotal: moneyString(preview.incomeTotal),
      expenseTotal: moneyString(preview.expenseTotal),
      cashMovementTotal: moneyString(preview.cashMovementTotal),
      adjustmentsTotal: moneyString(adjustmentAmount),
      calculatedBalance: moneyString(preview.calculatedBalance),
      closingBalance: moneyString(closingBalance),
      reconciledAt: new Date(),
    };

    if (monthly) {
      const [updated] = await tx
        .update(accountMonthlyBalances)
        .set(monthlyValues)
        .where(eq(accountMonthlyBalances.id, monthly.id))
        .returning({ id: accountMonthlyBalances.id });
      monthlyId = updated!.id;
      await tx
        .delete(accountBalanceAdjustments)
        .where(
          and(
            eq(accountBalanceAdjustments.userId, userId),
            eq(accountBalanceAdjustments.monthlyBalanceId, monthlyId)
          )
        );
    } else {
      const [created] = await tx
        .insert(accountMonthlyBalances)
        .values(monthlyValues)
        .returning({ id: accountMonthlyBalances.id });
      monthlyId = created!.id;
    }

    if (Math.abs(adjustmentAmount) >= 0.005) {
      await tx.insert(accountBalanceAdjustments).values({
        userId,
        accountId,
        monthlyBalanceId: monthlyId,
        date: periodEnd,
        amount: moneyString(adjustmentAmount),
        comment: comment?.trim() || null,
      });
    }

    return buildReconciliationPreview(userId, accountId, period);
  });
}

/** Balance as of today using the latest reconciled month plus later activity. */
export async function reconciledCurrentBalance(
  userId: number,
  accountId: number
): Promise<number | null> {
  const [latest] = await db
    .select({
      period: accountMonthlyBalances.period,
      closingBalance: accountMonthlyBalances.closingBalance,
    })
    .from(accountMonthlyBalances)
    .where(
      and(
        eq(accountMonthlyBalances.userId, userId),
        eq(accountMonthlyBalances.accountId, accountId),
        isNotNull(accountMonthlyBalances.reconciledAt)
      )
    )
    .orderBy(sql`${accountMonthlyBalances.period} DESC`)
    .limit(1);

  if (!latest) return null;

  const end = monthEnd(latest.period);
  const nextDay = new Date(`${end}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const from = nextDay.toISOString().slice(0, 10);
  const after = await sumActivity(userId, accountId, from, null);

  return (
    Number(latest.closingBalance) +
    after.incomeTotal -
    after.expenseTotal +
    after.cashMovementTotal
  );
}

export async function reconciliationMetaByAccount(userId: number) {
  const adjRows = await db
    .select({
      accountId: accountBalanceAdjustments.accountId,
      total: sql<string>`COALESCE(SUM(${accountBalanceAdjustments.amount}), 0)`,
    })
    .from(accountBalanceAdjustments)
    .where(eq(accountBalanceAdjustments.userId, userId))
    .groupBy(accountBalanceAdjustments.accountId);

  const adjustments = new Map<number, number>(
    adjRows.map((row) => [row.accountId, Number(row.total)])
  );

  const periodResult = await db.execute<{ accountId: number; period: string }>(
    sql`
      SELECT DISTINCT ON (account_id)
        account_id AS "accountId",
        to_char(period, 'YYYY-MM-DD') AS period
      FROM account_monthly_balances
      WHERE user_id = ${userId}
        AND reconciled_at IS NOT NULL
      ORDER BY account_id, period DESC
    `
  );

  const reconciledThrough = new Map<number, string>(
    periodResult.rows.map((row) => [row.accountId, row.period])
  );

  return { adjustments, reconciledThrough };
}

export async function listReconciliationHistory(
  userId: number,
  accountId: number
) {
  const rows = await db
    .select({
      id: accountMonthlyBalances.id,
      period: accountMonthlyBalances.period,
      openingBalance: accountMonthlyBalances.openingBalance,
      incomeTotal: accountMonthlyBalances.incomeTotal,
      expenseTotal: accountMonthlyBalances.expenseTotal,
      cashMovementTotal: accountMonthlyBalances.cashMovementTotal,
      calculatedBalance: accountMonthlyBalances.calculatedBalance,
      adjustmentsTotal: accountMonthlyBalances.adjustmentsTotal,
      closingBalance: accountMonthlyBalances.closingBalance,
      reconciledAt: accountMonthlyBalances.reconciledAt,
    })
    .from(accountMonthlyBalances)
    .where(
      and(
        eq(accountMonthlyBalances.userId, userId),
        eq(accountMonthlyBalances.accountId, accountId)
      )
    )
    .orderBy(sql`${accountMonthlyBalances.period} DESC`);

  return rows.map((row) => ({
    ...row,
    openingBalance: Number(row.openingBalance),
    incomeTotal: Number(row.incomeTotal),
    expenseTotal: Number(row.expenseTotal),
    cashMovementTotal: Number(row.cashMovementTotal),
    calculatedBalance: Number(row.calculatedBalance),
    adjustmentsTotal: Number(row.adjustmentsTotal),
    closingBalance: Number(row.closingBalance),
    reconciledAt: row.reconciledAt?.toISOString() ?? null,
  }));
}