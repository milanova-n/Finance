import { Router } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import {
  accounts,
  categories,
  expensePurposes,
  expenses,
  incomes,
} from '../db/schema.js';
import { moneyString } from '../ledgerValues.js';

type EntryConfig = {
  tableName: 'expenses' | 'incomes';
  textField: 'country' | 'from';
  categoryKind: 'expense' | 'income';
  withPurpose: boolean;
};

const customFieldsSchema = z.record(z.string(), z.string()).optional();

function buildEntryRouter(cfg: EntryConfig): Router {
  const router = Router();

  const bodySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
    country: z.string().trim().max(80).optional(),
    from: z.string().trim().max(80).optional(),
    amount: z.coerce.number().positive('Amount must be more than zero.'),
    accountId: z.coerce.number().int().positive('Choose an account.'),
    categoryId: z.coerce.number().int().positive('Choose a category.'),
    comment: z.string().trim().max(500).optional(),
    purposeId: z.coerce.number().int().positive().optional().nullable(),
    customFields: customFieldsSchema,
  });

  type EntryBody = z.infer<typeof bodySchema>;
  const textValue = (body: EntryBody) => body[cfg.textField] ?? '';

  function mergeCustomFields(body: EntryBody): Record<string, string> | null {
    const fromBody = body.customFields ?? {};
    const text = textValue(body).trim();
    const merged = { ...fromBody };
    if (text) merged[cfg.textField] = text;
    else if (!(cfg.textField in fromBody)) {
      // legacy country/from only when provided
    }
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(merged)) {
      const t = val.trim();
      if (t) cleaned[key] = t;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  }

  async function assertOwnership(
    userId: number,
    accountId: number,
    categoryId: number,
    purposeId?: number | null
  ) {
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);

    if (!account) {
      throw Object.assign(new Error('That account does not exist.'), {
        status: 400,
      });
    }

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId),
          eq(categories.kind, cfg.categoryKind)
        )
      )
      .limit(1);

    if (!category) {
      throw Object.assign(new Error('That category does not exist.'), {
        status: 400,
      });
    }

    if (cfg.withPurpose && purposeId != null) {
      const [purpose] = await db
        .select({ id: expensePurposes.id })
        .from(expensePurposes)
        .where(
          and(
            eq(expensePurposes.id, purposeId),
            eq(expensePurposes.userId, userId)
          )
        )
        .limit(1);
      if (!purpose) {
        throw Object.assign(new Error('That purpose does not exist.'), {
          status: 400,
        });
      }
    }
  }

  router.get('/', async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const filters: ReturnType<typeof sql>[] = [sql`t.user_id = ${userId}`];

      if (req.query.accountId) {
        filters.push(sql`t.account_id = ${Number(req.query.accountId)}`);
      }
      if (req.query.categoryId) {
        filters.push(sql`t.category_id = ${Number(req.query.categoryId)}`);
      }
      if (req.query.from) {
        filters.push(sql`t.date >= ${String(req.query.from)}`);
      }
      if (req.query.to) {
        filters.push(sql`t.date <= ${String(req.query.to)}`);
      }

      const whereClause = sql.join(filters, sql` AND `);
      const textAlias = cfg.textField === 'from' ? 'from' : 'country';

      const purposeSelect = cfg.withPurpose
        ? sql`, t.purpose_id AS "purposeId", p.name AS "purposeName"`
        : sql``;
      const purposeJoin = cfg.withPurpose
        ? sql`LEFT JOIN expense_purposes p
            ON p.id = t.purpose_id AND p.user_id = t.user_id`
        : sql``;

      const result = await db.execute<{
        id: number;
        date: string;
        country?: string;
        from?: string;
        amount: number;
        comment: string;
        accountId: number;
        accountName: string;
        currency: string;
        categoryId: number;
        categoryName: string;
        purposeId?: number | null;
        purposeName?: string | null;
        customFields: Record<string, string> | null;
      }>(sql`
        SELECT
          t.id,
          to_char(t.date, 'YYYY-MM-DD') AS date,
          ${sql.raw(`COALESCE(t.custom_fields->>'${cfg.textField}', '') AS "${textAlias}"`)},
          t.amount::float8 AS amount,
          COALESCE(t.comment, '') AS comment,
          t.account_id          AS "accountId",
          a.name                AS "accountName",
          a.currency            AS currency,
          t.category_id         AS "categoryId",
          c.name                AS "categoryName",
          t.custom_fields       AS "customFields"
          ${purposeSelect}
        FROM ${sql.raw(cfg.tableName)} t
        JOIN accounts   a ON a.id = t.account_id AND a.user_id = t.user_id
        JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        ${purposeJoin}
        WHERE ${whereClause}
        ORDER BY t.date DESC, t.id DESC
        LIMIT 500
      `);

      res.json(
        result.rows.map((row) => ({
          ...row,
          customFields: row.customFields ?? {},
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const body = parsed.data;
      await assertOwnership(
        req.user!.id,
        body.accountId,
        body.categoryId,
        body.purposeId
      );

      const base = {
        userId: req.user!.id,
        accountId: body.accountId,
        categoryId: body.categoryId,
        amount: moneyString(body.amount),
        comment: body.comment ?? '',
        date: body.date,
        customFields: mergeCustomFields(body),
      };

      const [created] =
        cfg.tableName === 'expenses'
          ? await db
              .insert(expenses)
              .values({
                ...base,
                purposeId: body.purposeId ?? null,
              })
              .returning({ id: expenses.id })
          : await db
              .insert(incomes)
              .values(base)
              .returning({ id: incomes.id });

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const body = parsed.data;
      await assertOwnership(
        req.user!.id,
        body.accountId,
        body.categoryId,
        body.purposeId
      );
      const entryId = Number(req.params.id);

      const patch = {
        accountId: body.accountId,
        categoryId: body.categoryId,
        date: body.date,
        amount: moneyString(body.amount),
        comment: body.comment ?? '',
        customFields: mergeCustomFields(body),
        ...(cfg.withPurpose ? { purposeId: body.purposeId ?? null } : {}),
      };

      const table = cfg.tableName === 'expenses' ? expenses : incomes;

      const [updated] = await db
        .update(table)
        .set(patch)
        .where(and(eq(table.id, entryId), eq(table.userId, req.user!.id)))
        .returning({ id: table.id });

      if (!updated) return res.status(404).json({ error: 'Entry not found.' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const entryId = Number(req.params.id);

      const [deleted] =
        cfg.tableName === 'expenses'
          ? await db
              .delete(expenses)
              .where(
                and(eq(expenses.id, entryId), eq(expenses.userId, req.user!.id))
              )
              .returning({ id: expenses.id })
          : await db
              .delete(incomes)
              .where(
                and(eq(incomes.id, entryId), eq(incomes.userId, req.user!.id))
              )
              .returning({ id: incomes.id });

      if (!deleted) return res.status(404).json({ error: 'Entry not found.' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const expensesRouter = buildEntryRouter({
  tableName: 'expenses',
  textField: 'country',
  categoryKind: 'expense',
  withPurpose: true,
});

export const incomesRouter = buildEntryRouter({
  tableName: 'incomes',
  textField: 'from',
  categoryKind: 'income',
  withPurpose: false,
});