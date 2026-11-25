import { Router } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { categories } from '../db/schema.js';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../catalogDefaults.js';

export const catalogRouter = Router();

async function insertMissingCategories(
  userId: number,
  names: readonly string[],
  kind: 'expense' | 'income'
) {
  let added = 0;
  for (const name of names) {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.kind, kind),
          sql`lower(${categories.name}) = lower(${name})`
        )
      )
      .limit(1);

    if (existing) continue;

    await db.insert(categories).values({ userId, name, kind });
    added += 1;
  }
  return added;
}

/** Adds built-in category names the user does not already have. */
catalogRouter.post('/seed-defaults', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const expenseCategories = await insertMissingCategories(
      userId,
      DEFAULT_EXPENSE_CATEGORIES,
      'expense'
    );
    const incomeCategories = await insertMissingCategories(
      userId,
      DEFAULT_INCOME_CATEGORIES,
      'income'
    );
    res.json({
      added: {
        expenseCategories,
        incomeCategories,
      },
    });
  } catch (err) {
    next(err);
  }
});