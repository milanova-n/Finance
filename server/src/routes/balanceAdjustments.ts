import { Router } from 'express';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import {
  accountBalanceAdjustments,
  accountMonthlyBalances,
  accounts,
} from '../db/schema.js';

export const balanceAdjustmentsRouter = Router();

balanceAdjustmentsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const filters = [eq(accountBalanceAdjustments.userId, userId)];

    const accountId = req.query.accountId
      ? Number(req.query.accountId)
      : undefined;
    if (accountId != null && Number.isFinite(accountId)) {
      filters.push(eq(accountBalanceAdjustments.accountId, accountId));
    }
    if (req.query.from) {
      filters.push(gte(accountBalanceAdjustments.date, String(req.query.from)));
    }
    if (req.query.to) {
      filters.push(lte(accountBalanceAdjustments.date, String(req.query.to)));
    }

    const rows = await db
      .select({
        id: accountBalanceAdjustments.id,
        accountId: accountBalanceAdjustments.accountId,
        accountName: accounts.name,
        currency: accounts.currency,
        date: accountBalanceAdjustments.date,
        amount: accountBalanceAdjustments.amount,
        comment: accountBalanceAdjustments.comment,
        period: accountMonthlyBalances.period,
      })
      .from(accountBalanceAdjustments)
      .innerJoin(
        accounts,
        and(
          eq(accounts.id, accountBalanceAdjustments.accountId),
          eq(accounts.userId, userId)
        )
      )
      .innerJoin(
        accountMonthlyBalances,
        eq(
          accountMonthlyBalances.id,
          accountBalanceAdjustments.monthlyBalanceId
        )
      )
      .where(and(...filters))
      .orderBy(
        sql`${accountBalanceAdjustments.date} DESC`,
        sql`${accountBalanceAdjustments.id} DESC`
      );

    res.json(
      rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        accountName: row.accountName,
        currency: row.currency,
        date: row.date,
        amount: Number(row.amount),
        comment: row.comment,
        period: row.period,
      }))
    );
  } catch (err) {
    next(err);
  }
});
