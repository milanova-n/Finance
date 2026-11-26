import type { Category, TransactionKind, ExpensePurpose } from '../types';
import type { CashMovementType } from './cashMovementCatalog';

export type CatalogFocus =
  | 'expense-categories'
  | 'income-categories'
  | 'expense-purposes'
  | 'cash-movement-types';

export type CatalogGap = {
  focus: CatalogFocus;
  title: string;
  description: string;
};

export function settingsPath(focus: CatalogFocus): string {
  return `/settings?section=labels&focus=${focus}`;
}

export function catalogGapForKind(
  kind: TransactionKind,
  ctx: {
    expenseCategories: Category[];
    incomeCategories: Category[];
    expensePurposes: ExpensePurpose[];
    cashTypes: CashMovementType[];
  }
): CatalogGap | null {
  if (kind === 'expense') {
    if (ctx.expenseCategories.length === 0) {
      return {
        focus: 'expense-categories',
        title: 'Expense categories',
        description:
          'Add at least one expense category before logging expenses.',
      };
    }
    if (ctx.expensePurposes.length === 0) {
      return {
        focus: 'expense-purposes',
        title: 'Expense purposes',
        description:
          'Define what the expense is for — add purposes or load the suggested defaults.',
      };
    }
    return null;
  }

  if (kind === 'income') {
    if (ctx.incomeCategories.length === 0) {
      return {
        focus: 'income-categories',
        title: 'Income categories',
        description: 'Add at least one income category before logging income.',
      };
    }
    return null;
  }

  if (ctx.cashTypes.length === 0) {
    return {
      focus: 'cash-movement-types',
      title: 'Cash movement types',
      description: 'Define cash movement types and subtypes.',
    };
  }

  return null;
}
