export const DEFAULT_EXPENSE_CATEGORIES = [
  'Car',
  'Laundry',
  'Groceries',
  'Rent',
  'Utilities',
  'Eating out',
  'Travel',
  'Health',
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Interest',
] as const;

/** Empty until you add suggested defaults in Settings or seed data. */
export const DEFAULT_EXPENSE_PURPOSES: readonly string[] = [];

/** Cash movement types and their subtypes (stored locally in the browser). */
export const DEFAULT_CASH_MOVEMENT_CATALOG: ReadonlyArray<{
  type: string;
  subtypes: readonly string[];
}> = [
  {
    type: 'Transfer',
    subtypes: ['Between accounts', 'To savings', 'From savings'],
  },
  {
    type: 'Inflow',
    subtypes: ['ATM', 'Bank counter'],
  },
  {
    type: 'Outflow',
    subtypes: ['Cash deposit', 'Correction'],
  },
];
