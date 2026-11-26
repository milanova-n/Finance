import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { accounts } from '../db/schema.js';
import {
  buildReconciliationPreview,
  listReconciliationHistory,
  reconcileMonth,
} from '../reconciliation.js';

export const reconciliationRouter = Router({ mergeParams: true });

async function assertAccount(userId: number, accountId: number) {
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!row) {
    throw Object.assign(new Error('Account not found.'), { status: 404 });
  }
}

function accountIdFrom(req: { params: { accountId?: string } }) {
  return Number(req.params.accountId);
}

reconciliationRouter.get('/history', async (req, res, next) => {
  try {
    const accountId = accountIdFrom(req);
    await assertAccount(req.user!.id, accountId);
    res.json(await listReconciliationHistory(req.user!.id, accountId));
  } catch (err) {
    next(err);
  }
});

reconciliationRouter.get('/preview', async (req, res, next) => {
  try {
    const accountId = accountIdFrom(req);
    const period = String(req.query.period ?? '');
    if (!period) {
      return res
        .status(400)
        .json({ error: 'Choose a month (period=YYYY-MM).' });
    }
    await assertAccount(req.user!.id, accountId);
    res.json(await buildReconciliationPreview(req.user!.id, accountId, period));
  } catch (err) {
    next(err);
  }
});

reconciliationRouter.post('/', async (req, res, next) => {
  try {
    const accountId = accountIdFrom(req);
    const parsed = z
      .object({
        period: z.string().min(1, 'Choose a month.'),
        closingBalance: z.coerce.number().finite(),
        comment: z.string().trim().max(500).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    await assertAccount(req.user!.id, accountId);
    const result = await reconcileMonth(
      req.user!.id,
      accountId,
      parsed.data.period,
      parsed.data.closingBalance,
      parsed.data.comment
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
