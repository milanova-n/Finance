import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: 'string' });

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
});

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    currency: text('currency').notNull(),
    openingBalance: money('opening_balance').notNull(),
    openingDate: date('opening_date').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.name),
    unique().on(t.userId, t.id),
    check(
      'accounts_kind_check',
      sql`${t.kind} IN ('cash', 'bank')`,
    ),
    index('accounts_user_deleted_idx').on(t.userId, t.deletedAt),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.kind, t.name),
    unique().on(t.userId, t.id),
    check(
      'categories_kind_check',
      sql`${t.kind} IN ('expense', 'income')`,
    ),
  ],
);

export const expensePurposes = pgTable(
  'expense_purposes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.name),
    unique().on(t.userId, t.id),
  ],
);

export const cashMovementTypes = pgTable(
  'cash_movement_types',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.name),
    unique().on(t.userId, t.id),
  ],
);

export const cashMovementSubtypes = pgTable(
  'cash_movement_subtypes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    typeId: integer('type_id').notNull(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.typeId, t.name),
    unique().on(t.userId, t.id),
    foreignKey({
      columns: [t.userId, t.typeId],
      foreignColumns: [cashMovementTypes.userId, cashMovementTypes.id],
      name: 'cash_movement_subtypes_type_fk',
    }).onDelete('cascade'),
  ],
);

export const customFieldDefinitions = pgTable(
  'custom_field_definitions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appliesTo: text('applies_to').notNull(),
    fieldKey: text('field_key').notNull(),
    label: text('label').notNull(),
    fieldType: text('field_type').notNull(),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.appliesTo, t.fieldKey),
    check(
      'custom_fields_applies_to_check',
      sql`${t.appliesTo} IN ('expense', 'income')`,
    ),
    check(
      'custom_fields_type_check',
      sql`${t.fieldType} IN ('string', 'date', 'number', 'boolean')`,
    ),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull(),
    categoryId: integer('category_id').notNull(),
    purposeId: integer('purpose_id'),
    name: text('name').notNull(),
    amount: money('amount').notNull(),
    currency: text('currency').notNull(),
    frequency: text('frequency').notNull(),
    involvedParty: text('involved_party'),
    comment: text('comment'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.userId, t.id),
    foreignKey({
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'subscriptions_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
      name: 'subscriptions_category_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.purposeId],
      foreignColumns: [expensePurposes.userId, expensePurposes.id],
      name: 'subscriptions_purpose_fk',
    }).onDelete('restrict'),
    check('subscriptions_amount_check', sql`${t.amount} > 0`),
    check(
      'subscriptions_frequency_check',
      sql`${t.frequency} IN ('daily', 'weekly', 'monthly', 'yearly')`,
    ),
  ],
);

export const expenses = pgTable(
  'expenses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull(),
    categoryId: integer('category_id').notNull(),
    purposeId: integer('purpose_id'),
    subscriptionId: integer('subscription_id'),
    amount: money('amount').notNull(),
    comment: text('comment'),
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>(),
    date: date('date').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'expenses_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
      name: 'expenses_category_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.purposeId],
      foreignColumns: [expensePurposes.userId, expensePurposes.id],
      name: 'expenses_purpose_fk',
    }).onDelete('restrict'),
    // Subscriptions are soft-deleted. Keep their reference on generated
    // expenses so the historical link is not accidentally removed.
    foreignKey({
      columns: [t.userId, t.subscriptionId],
      foreignColumns: [subscriptions.userId, subscriptions.id],
      name: 'expenses_subscription_fk',
    }).onDelete('restrict'),
    check('expenses_amount_check', sql`${t.amount} > 0`),
    index('expenses_user_date_idx').on(t.userId, t.date),
    index('expenses_account_date_idx').on(t.accountId, t.date),
    index('expenses_category_idx').on(t.categoryId),
    index('expenses_subscription_idx').on(t.subscriptionId),
  ],
);

export const incomes = pgTable(
  'incomes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull(),
    categoryId: integer('category_id').notNull(),
    amount: money('amount').notNull(),
    comment: text('comment'),
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>(),
    date: date('date').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'incomes_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
      name: 'incomes_category_fk',
    }).onDelete('restrict'),
    check('incomes_amount_check', sql`${t.amount} > 0`),
    index('incomes_user_date_idx').on(t.userId, t.date),
    index('incomes_account_date_idx').on(t.accountId, t.date),
    index('incomes_category_idx').on(t.categoryId),
  ],
);

export const cashMovements = pgTable(
  'cash_movements',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    amount: money('amount').notNull(),
    comment: text('comment'),
    initiatorAccountId: integer('initiator_account_id'),
    receiverAccountId: integer('receiver_account_id'),
    movementSubtypeId: integer('movement_subtype_id').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.initiatorAccountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'cash_movements_initiator_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.receiverAccountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'cash_movements_receiver_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.movementSubtypeId],
      foreignColumns: [cashMovementSubtypes.userId, cashMovementSubtypes.id],
      name: 'cash_movements_subtype_fk',
    }).onDelete('restrict'),
    check('cash_movements_amount_check', sql`${t.amount} > 0`),
    check(
      'cash_movements_account_check',
      sql`${t.initiatorAccountId} IS NOT NULL OR ${t.receiverAccountId} IS NOT NULL`,
    ),
    check(
      'cash_movements_distinct_accounts_check',
      sql`${t.initiatorAccountId} IS NULL
        OR ${t.receiverAccountId} IS NULL
        OR ${t.initiatorAccountId} <> ${t.receiverAccountId}`,
    ),
    index('cash_movements_user_date_idx').on(t.userId, t.date),
    index('cash_movements_initiator_idx').on(t.initiatorAccountId, t.date),
    index('cash_movements_receiver_idx').on(t.receiverAccountId, t.date),
  ],
);

export const accountMonthlyBalances = pgTable(
  'account_monthly_balances',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull(),
    period: date('period').notNull(), // Always the first day of the month
    openingBalance: money('opening_balance').notNull(),
    incomeTotal: money('income_total').notNull().default('0'),
    expenseTotal: money('expense_total').notNull().default('0'),
    cashMovementTotal: money('cash_movement_total').notNull().default('0'),
    adjustmentsTotal: money('adjustments_total').notNull().default('0'),
    calculatedBalance: money('calculated_balance').notNull(),
    closingBalance: money('closing_balance').notNull(),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.accountId, t.period),
    unique().on(t.userId, t.accountId, t.id),
    foreignKey({
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'account_monthly_balances_account_fk',
    }).onDelete('restrict'),
    check(
      'account_monthly_balances_period_check',
      sql`EXTRACT(DAY FROM ${t.period}::date) = 1`,
    ),
    index('account_monthly_balances_user_period_idx').on(t.userId, t.period),
  ],
);

export const accountBalanceAdjustments = pgTable(
  'account_balance_adjustments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: integer('account_id').notNull(),
    monthlyBalanceId: integer('monthly_balance_id').notNull(),
    date: date('date').notNull(),
    amount: money('amount').notNull(), // Signed difference: actual - calculated
    comment: text('comment'),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
      name: 'account_balance_adjustments_account_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.userId, t.accountId, t.monthlyBalanceId],
      foreignColumns: [
        accountMonthlyBalances.userId,
        accountMonthlyBalances.accountId,
        accountMonthlyBalances.id,
      ],
      name: 'account_balance_adjustments_monthly_balance_fk',
    }).onDelete('cascade'),
    index('account_balance_adjustments_account_date_idx').on(
      t.accountId,
      t.date,
    ),
  ],
);