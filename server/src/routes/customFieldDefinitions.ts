import { Router } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { customFieldDefinitions } from '../db/schema.js';

export const customFieldDefinitionsRouter = Router();

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return base || 'field';
}

const fieldTypeSchema = z.enum(['string', 'date', 'number', 'boolean']);

customFieldDefinitionsRouter.get('/', async (req, res, next) => {
  try {
    const appliesTo = req.query.appliesTo;
    const filters = [eq(customFieldDefinitions.userId, req.user!.id)];
    if (appliesTo === 'expense' || appliesTo === 'income') {
      filters.push(eq(customFieldDefinitions.appliesTo, appliesTo));
    }

    const rows = await db
      .select({
        id: customFieldDefinitions.id,
        appliesTo: customFieldDefinitions.appliesTo,
        fieldKey: customFieldDefinitions.fieldKey,
        label: customFieldDefinitions.label,
        fieldType: customFieldDefinitions.fieldType,
      })
      .from(customFieldDefinitions)
      .where(and(...filters))
      .orderBy(
        asc(customFieldDefinitions.appliesTo),
        asc(customFieldDefinitions.id)
      );

    res.json(
      rows.map((row, index) => ({
        ...row,
        sortOrder: index + 1,
      }))
    );
  } catch (err) {
    next(err);
  }
});

customFieldDefinitionsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        appliesTo: z.enum(['expense', 'income']),
        label: z.string().trim().min(1, 'Name the field.').max(80),
        fieldType: fieldTypeSchema,
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const fieldKey = slugify(parsed.data.label);

    const [duplicate] = await db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.userId, req.user!.id),
          eq(customFieldDefinitions.appliesTo, parsed.data.appliesTo),
          sql`lower(${customFieldDefinitions.fieldKey}) = lower(${fieldKey})`
        )
      )
      .limit(1);

    if (duplicate) {
      return res
        .status(409)
        .json({ error: 'A field with that name already exists.' });
    }

    const [created] = await db
      .insert(customFieldDefinitions)
      .values({
        userId: req.user!.id,
        appliesTo: parsed.data.appliesTo,
        fieldKey,
        label: parsed.data.label,
        fieldType: parsed.data.fieldType,
      })
      .returning({
        id: customFieldDefinitions.id,
        appliesTo: customFieldDefinitions.appliesTo,
        fieldKey: customFieldDefinitions.fieldKey,
        label: customFieldDefinitions.label,
        fieldType: customFieldDefinitions.fieldType,
      });

    res.status(201).json({ ...created, sortOrder: 1 });
  } catch (err) {
    next(err);
  }
});

customFieldDefinitionsRouter.put('/:id', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        label: z.string().trim().min(1, 'Name the field.').max(80),
        fieldType: fieldTypeSchema,
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const defId = Number(req.params.id);
    const fieldKey = slugify(parsed.data.label);

    const [updated] = await db
      .update(customFieldDefinitions)
      .set({
        label: parsed.data.label,
        fieldType: parsed.data.fieldType,
        fieldKey,
      })
      .where(
        and(
          eq(customFieldDefinitions.id, defId),
          eq(customFieldDefinitions.userId, req.user!.id)
        )
      )
      .returning({
        id: customFieldDefinitions.id,
        appliesTo: customFieldDefinitions.appliesTo,
        fieldKey: customFieldDefinitions.fieldKey,
        label: customFieldDefinitions.label,
        fieldType: customFieldDefinitions.fieldType,
      });

    if (!updated) {
      return res.status(404).json({ error: 'Custom field not found.' });
    }
    res.json({ ...updated, sortOrder: 1 });
  } catch (err) {
    next(err);
  }
});

customFieldDefinitionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const defId = Number(req.params.id);

    const [deleted] = await db
      .delete(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, defId),
          eq(customFieldDefinitions.userId, req.user!.id)
        )
      )
      .returning({ id: customFieldDefinitions.id });

    if (!deleted) {
      return res.status(404).json({ error: 'Custom field not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});