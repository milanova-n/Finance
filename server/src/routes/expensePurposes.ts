import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { expensePurposes, expenses } from '../db/schema.js';

export const expensePurposesRouter = Router();

expensePurposesRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select({ id: expensePurposes.id, name: expensePurposes.name })
      .from(expensePurposes)
      .where(eq(expensePurposes.userId, req.user!.id))
      .orderBy(asc(expensePurposes.name));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

expensePurposesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(1, 'Name the purpose.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [existing] = await db
      .select({ id: expensePurposes.id, name: expensePurposes.name })
      .from(expensePurposes)
      .where(
        and(
          eq(expensePurposes.userId, req.user!.id),
          sql`lower(${expensePurposes.name}) = lower(${parsed.data.name})`
        )
      )
      .limit(1);

    if (existing) return res.status(200).json(existing);

    const [created] = await db
      .insert(expensePurposes)
      .values({ userId: req.user!.id, name: parsed.data.name })
      .returning({ id: expensePurposes.id, name: expensePurposes.name });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

expensePurposesRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(1, 'Name the purpose.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const purposeId = Number(req.params.id);

    const [duplicate] = await db
      .select({ id: expensePurposes.id })
      .from(expensePurposes)
      .where(
        and(
          eq(expensePurposes.userId, req.user!.id),
          sql`lower(${expensePurposes.name}) = lower(${parsed.data.name})`,
          sql`${expensePurposes.id} <> ${purposeId}`
        )
      )
      .limit(1);
    if (duplicate) {
      return res
        .status(409)
        .json({ error: 'You already have a purpose with that name.' });
    }

    const [updated] = await db
      .update(expensePurposes)
      .set({ name: parsed.data.name })
      .where(
        and(
          eq(expensePurposes.id, purposeId),
          eq(expensePurposes.userId, req.user!.id)
        )
      )
      .returning({ id: expensePurposes.id, name: expensePurposes.name });

    if (!updated) {
      return res.status(404).json({ error: 'Purpose not found.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

expensePurposesRouter.delete('/:id', async (req, res, next) => {
  try {
    const purposeId = Number(req.params.id);

    const [inUse] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, req.user!.id),
          eq(expenses.purposeId, purposeId)
        )
      )
      .limit(1);

    if (inUse) {
      return res
        .status(409)
        .json({ error: 'This purpose is used by existing expenses.' });
    }

    const [deleted] = await db
      .delete(expensePurposes)
      .where(
        and(
          eq(expensePurposes.id, purposeId),
          eq(expensePurposes.userId, req.user!.id)
        )
      )
      .returning({ id: expensePurposes.id });

    if (!deleted) {
      return res.status(404).json({ error: 'Purpose not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
