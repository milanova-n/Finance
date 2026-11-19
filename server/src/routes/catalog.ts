import { Router } from 'express';
import { query } from '../db.js';
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
    const exists = await query(
      `SELECT 1 FROM categories
       WHERE user_id = $1 AND kind = $2 AND lower(name) = lower($3)`,
      [userId, kind, name]
    );
    if (exists.length > 0) continue;
    await query(
      `INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3)`,
      [userId, name, kind]
    );
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