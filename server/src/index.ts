import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import cors from 'cors';
import { config } from './config.js';
import { db, pool } from './db.js';
import { sql } from 'drizzle-orm';
import { requireAuth } from './auth.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { catalogRouter } from './routes/catalog.js';
import { categoriesRouter } from './routes/categories.js';
import { expensesRouter, incomesRouter } from './routes/entries.js';
import { cashMovementsRouter } from './routes/cashMovements.js';
import { expensePurposesRouter } from './routes/expensePurposes.js';
import {
  cashMovementSubtypesRouter,
  cashMovementTypesRouter,
} from './routes/cashMovementCatalog.js';
import { customFieldDefinitionsRouter } from './routes/customFieldDefinitions.js';
import { balanceAdjustmentsRouter } from './routes/balanceAdjustments.js';

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/accounts', requireAuth, accountsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);
app.use('/api/catalog', requireAuth, catalogRouter);
app.use('/api/expenses', requireAuth, expensesRouter);
app.use('/api/incomes', requireAuth, incomesRouter);
app.use('/api/cash-movements', requireAuth, cashMovementsRouter);
app.use('/api/expense-purposes', requireAuth, expensePurposesRouter);
app.use('/api/cash-movement-types', requireAuth, cashMovementTypesRouter);
app.use(
  '/api/cash-movement-subtypes',
  requireAuth,
  cashMovementSubtypesRouter
);
app.use(
  '/api/custom-field-definitions',
  requireAuth,
  customFieldDefinitionsRouter
);
app.use('/api/balance-adjustments', requireAuth, balanceAdjustmentsRouter);

app.use((_req, res) => res.status(404).json({ error: 'No such endpoint.' }));

app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: status >= 500 ? 'Something went wrong on our end.' : err.message,
    });
  }
);

app.listen(config.port, () => {
  console.log(`Verdant API listening on http://localhost:${config.port}`);
});
