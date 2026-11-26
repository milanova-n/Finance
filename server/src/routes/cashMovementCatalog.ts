import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import {
  cashMovementSubtypes,
  cashMovementTypes,
  cashMovements,
} from '../db/schema.js';

export const cashMovementTypesRouter = Router();
export const cashMovementSubtypesRouter = Router();

cashMovementTypesRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select({ id: cashMovementTypes.id, name: cashMovementTypes.name })
      .from(cashMovementTypes)
      .where(eq(cashMovementTypes.userId, req.user!.id))
      .orderBy(asc(cashMovementTypes.name));
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

cashMovementTypesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(1, 'Name the type.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [existing] = await db
      .select({ id: cashMovementTypes.id, name: cashMovementTypes.name })
      .from(cashMovementTypes)
      .where(
        and(
          eq(cashMovementTypes.userId, req.user!.id),
          sql`lower(${cashMovementTypes.name}) = lower(${parsed.data.name})`
        )
      )
      .limit(1);

    if (existing) return res.status(200).json(existing);

    const [created] = await db
      .insert(cashMovementTypes)
      .values({ userId: req.user!.id, name: parsed.data.name })
      .returning({ id: cashMovementTypes.id, name: cashMovementTypes.name });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

cashMovementTypesRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(1, 'Enter a name.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const typeId = Number(req.params.id);

    const [updated] = await db
      .update(cashMovementTypes)
      .set({ name: parsed.data.name })
      .where(
        and(
          eq(cashMovementTypes.id, typeId),
          eq(cashMovementTypes.userId, req.user!.id)
        )
      )
      .returning({ id: cashMovementTypes.id, name: cashMovementTypes.name });

    if (!updated) {
      return res.status(404).json({ error: 'Type not found.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

cashMovementTypesRouter.delete('/:id', async (req, res, next) => {
  try {
    const typeId = Number(req.params.id);

    const [subtype] = await db
      .select({ id: cashMovementSubtypes.id })
      .from(cashMovementSubtypes)
      .where(
        and(
          eq(cashMovementSubtypes.userId, req.user!.id),
          eq(cashMovementSubtypes.typeId, typeId)
        )
      )
      .limit(1);

    if (subtype) {
      return res
        .status(409)
        .json({ error: 'Remove subtypes under this type first.' });
    }

    const [deleted] = await db
      .delete(cashMovementTypes)
      .where(
        and(
          eq(cashMovementTypes.id, typeId),
          eq(cashMovementTypes.userId, req.user!.id)
        )
      )
      .returning({ id: cashMovementTypes.id });

    if (!deleted) {
      return res.status(404).json({ error: 'Type not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

cashMovementSubtypesRouter.get('/', async (req, res, next) => {
  try {
    const typeId = req.query.typeId
      ? Number(req.query.typeId)
      : undefined;
    const filters = [eq(cashMovementSubtypes.userId, req.user!.id)];
    if (typeId != null && Number.isFinite(typeId)) {
      filters.push(eq(cashMovementSubtypes.typeId, typeId));
    }

    const rows = await db
      .select({
        id: cashMovementSubtypes.id,
        typeId: cashMovementSubtypes.typeId,
        name: cashMovementSubtypes.name,
      })
      .from(cashMovementSubtypes)
      .where(and(...filters))
      .orderBy(asc(cashMovementSubtypes.name));

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

cashMovementSubtypesRouter.post('/', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        typeId: z.coerce.number().int().positive('Choose a type.'),
        name: z.string().trim().min(1, 'Name the subtype.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const [type] = await db
      .select({ id: cashMovementTypes.id })
      .from(cashMovementTypes)
      .where(
        and(
          eq(cashMovementTypes.id, parsed.data.typeId),
          eq(cashMovementTypes.userId, req.user!.id)
        )
      )
      .limit(1);
    if (!type) {
      return res.status(400).json({ error: 'That type does not exist.' });
    }

    const [existing] = await db
      .select({
        id: cashMovementSubtypes.id,
        typeId: cashMovementSubtypes.typeId,
        name: cashMovementSubtypes.name,
      })
      .from(cashMovementSubtypes)
      .where(
        and(
          eq(cashMovementSubtypes.userId, req.user!.id),
          eq(cashMovementSubtypes.typeId, parsed.data.typeId),
          sql`lower(${cashMovementSubtypes.name}) = lower(${parsed.data.name})`
        )
      )
      .limit(1);

    if (existing) return res.status(200).json(existing);

    const [created] = await db
      .insert(cashMovementSubtypes)
      .values({
        userId: req.user!.id,
        typeId: parsed.data.typeId,
        name: parsed.data.name,
      })
      .returning({
        id: cashMovementSubtypes.id,
        typeId: cashMovementSubtypes.typeId,
        name: cashMovementSubtypes.name,
      });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

cashMovementSubtypesRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        name: z.string().trim().min(1, 'Enter a name.').max(80),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const subtypeId = Number(req.params.id);

    const [updated] = await db
      .update(cashMovementSubtypes)
      .set({ name: parsed.data.name })
      .where(
        and(
          eq(cashMovementSubtypes.id, subtypeId),
          eq(cashMovementSubtypes.userId, req.user!.id)
        )
      )
      .returning({
        id: cashMovementSubtypes.id,
        typeId: cashMovementSubtypes.typeId,
        name: cashMovementSubtypes.name,
      });

    if (!updated) {
      return res.status(404).json({ error: 'Subtype not found.' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

cashMovementSubtypesRouter.delete('/:id', async (req, res, next) => {
  try {
    const subtypeId = Number(req.params.id);

    const [inUse] = await db
      .select({ id: cashMovements.id })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.userId, req.user!.id),
          eq(cashMovements.movementSubtypeId, subtypeId)
        )
      )
      .limit(1);

    if (inUse) {
      return res
        .status(409)
        .json({ error: 'This subtype is used by cash movements.' });
    }

    const [deleted] = await db
      .delete(cashMovementSubtypes)
      .where(
        and(
          eq(cashMovementSubtypes.id, subtypeId),
          eq(cashMovementSubtypes.userId, req.user!.id)
        )
      )
      .returning({ id: cashMovementSubtypes.id });

    if (!deleted) {
      return res.status(404).json({ error: 'Subtype not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});