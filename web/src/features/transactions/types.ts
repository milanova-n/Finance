import type { TransactionKind, TransactionView } from '../../types';

export const NEW_CATEGORY = '__new__';

export type LedgerDraft = {
  kind: 'expense' | 'income';
  date: string;
  amount: string;
  accountId: string;
  categoryId: string;
  purposeId: string;
  comment: string;
  customFields: Record<string, string>;
};

export type CashDraft = {
  kind: 'cash';
  date: string;
  amount: string;
  accountId: string;
  comment: string;
  movementTypeId: string;
  movementSubtypeId: string;
  initiatorAccountId: string;
  receiverAccountId: string;
};

export type Draft = LedgerDraft | CashDraft;

export function defaultKindForView(view: TransactionView): TransactionKind {
  if (view === 'income') return 'income';
  if (view === 'cash') return 'cash';
  return 'expense';
}
