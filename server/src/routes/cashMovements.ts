import { Router } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import {
  accounts,
  cashMovementSubtypes,
  cashMovementTypes,
  cashMovements,
} from '../db/schema.js';
import { moneyString } from '../ledgerValues.js';

export const cashMovementsRouter = Router();

const NOT_ME = 0;

function toApiAccountId(id: number | null): number {
  return id == null ? NOT_ME : id;
}

function toDbAccountId(id: number): number | null {
  return id === NOT_ME ? null : id;
}

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  amount: z.coerce.number().positive('Amount must be more than zero.'),
  comment: z.string().trim().max(500).optional(),
  movementSubtypeId: z.coerce.number().int().positive('Choose a subtype.'),
  initiatorAccountId: z.coerce.number().int().min(0),
  receiverAccountId: z.coerce.number().int().min(0),
});

async function assertSubtype(userId: number, movementSubtypeId: number) {
  const [row] = await db
    .select({ id: cashMovementSubtypes.id })
    .from(cashMovementSubtypes)
    .where(
      and(
        eq(cashMovementSubtypes.id, movementSubtypeId),
        eq(cashMovementSubtypes.userId, userId)
      )
    )
    .limit(1);
  if (!row) {
    throw Object.assign(new Error('That cash movement subtype does not exist.'), {
      status: 400,
    });
  }
}

async function assertOwnedAccount(userId: number, accountId: number) {
  if (accountId === NOT_ME) return;
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!row) {
    throw Object.assign(new Error('That account does not exist.'), {
      status: 400,
    });
  }
}

function validateParties(initiator: number, receiver: number) {
  if (initiator === NOT_ME && receiver === NOT_ME) {
    throw Object.assign(
      new Error('Choose at least one account or “Not me”.'),
      { status: 400 }
    );
  }
  if (
    initiator !== NOT_ME &&
    receiver !== NOT_ME &&
    initiator === receiver
  ) {
    throw Object.assign(
      new Error('Initiator and receiver must be different accounts.'),
      { status: 400 }
    );
  }
}

cashMovementsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const filters: ReturnType<typeof sql>[] = [sql`cm.user_id = ${userId}`];

    if (req.query.from) {
      filters.push(sql`cm.date >= ${String(req.query.from)}`);
    }
    if (req.query.to) {
      filters.push(sql`cm.date <= ${String(req.query.to)}`);
    }

    const whereClause = sql.join(filters, sql` AND `);

    const result = await db.execute<{
      id: number;
      date: string;
      amount: number;
      comment: string;
      movementSubtypeId: number;
      movementType: string;
      movementSubtype: string;
      initiatorAccountId: number;
      receiverAccountId: number;
      initiatorAccountName: string | null;
      receiverAccountName: string | null;
    }>(sql`
      SELECT
        cm.id,
        to_char(cm.date, 'YYYY-MM-DD') AS date,
        cm.amount::float8 AS amount,
        COALESCE(cm.comment, '') AS comment,
        cm.movement_subtype_id AS "movementSubtypeId",
        ty.name AS "movementType",
        st.name AS "movementSubtype",
        COALESCE(cm.initiator_account_id, 0) AS "initiatorAccountId",
        COALESCE(cm.receiver_account_id, 0) AS "receiverAccountId",
        ai.name AS "initiatorAccountName",
        ar.name AS "receiverAccountName"
      FROM cash_movements cm
      JOIN cash_movement_subtypes st
        ON st.id = cm.movement_subtype_id AND st.user_id = cm.user_id
      JOIN cash_movement_types ty
        ON ty.id = st.type_id AND ty.user_id = cm.user_id
      LEFT JOIN accounts ai
        ON ai.id = cm.initiator_account_id AND ai.user_id = cm.user_id
      LEFT JOIN accounts ar
        ON ar.id = cm.receiver_account_id AND ar.user_id = cm.user_id
      WHERE ${whereClause}
      ORDER BY cm.date DESC, cm.id DESC
      LIMIT 500
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

cashMovementsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const userId = req.user!.id;
    const body = parsed.data;
    validateParties(body.initiatorAccountId, body.receiverAccountId);
    await assertSubtype(userId, body.movementSubtypeId);
    await assertOwnedAccount(userId, body.initiatorAccountId);
    await assertOwnedAccount(userId, body.receiverAccountId);

    const [created] = await db
      .insert(cashMovements)
      .values({
        userId,
        date: body.date,
        amount: moneyString(body.amount),
        comment: body.comment ?? '',
        movementSubtypeId: body.movementSubtypeId,
        initiatorAccountId: toDbAccountId(body.initiatorAccountId),
        receiverAccountId: toDbAccountId(body.receiverAccountId),
      })
      .returning({ id: cashMovements.id });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

cashMovementsRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const userId = req.user!.id;
    const movementId = Number(req.params.id);
    const body = parsed.data;
    validateParties(body.initiatorAccountId, body.receiverAccountId);
    await assertSubtype(userId, body.movementSubtypeId);
    await assertOwnedAccount(userId, body.initiatorAccountId);
    await assertOwnedAccount(userId, body.receiverAccountId);

    const [updated] = await db
      .update(cashMovements)
      .set({
        date: body.date,
        amount: moneyString(body.amount),
        comment: body.comment ?? '',
        movementSubtypeId: body.movementSubtypeId,
        initiatorAccountId: toDbAccountId(body.initiatorAccountId),
        receiverAccountId: toDbAccountId(body.receiverAccountId),
      })
      .where(
        and(eq(cashMovements.id, movementId), eq(cashMovements.userId, userId))
      )
      .returning({ id: cashMovements.id });

    if (!updated) {
      return res.status(404).json({ error: 'Cash movement not found.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

cashMovementsRouter.delete('/:id', async (req, res, next) => {
  try {
    const movementId = Number(req.params.id);
    const [deleted] = await db
      .delete(cashMovements)
      .where(
        and(
          eq(cashMovements.id, movementId),
          eq(cashMovements.userId, req.user!.id)
        )
      )
      .returning({ id: cashMovements.id });

    if (!deleted) {
      return res.status(404).json({ error: 'Cash movement not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { NOT_ME as CASH_NOT_ME_ACCOUNT_ID, toApiAccountId };