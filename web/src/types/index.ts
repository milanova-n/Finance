export type User = {
  id: number;
  email: string;
  username: string | null;
  fullName: string;
};

export type AccountKind = 'cash' | 'bank';

export type Account = {
  id: number;
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  incomeFirstDate: string | null;
  incomeLastDate: string | null;
  expenseFirstDate: string | null;
  expenseLastDate: string | null;
  /** When set, current balance is anchored on the latest reconciled month. */
  reconciledBalance?: number | null;
  adjustmentsTotal?: number;
  reconciledThrough?: string | null;
};

export type Category = { id: number; name: string; kind: 'expense' | 'income' };

export type ExpensePurpose = { id: number; name: string };

export type TransactionKind = 'expense' | 'income' | 'cash' | 'adjustment';

export type CustomFieldType = 'string' | 'date' | 'number' | 'boolean';

export const CUSTOM_FIELD_TYPES: Array<{
  value: CustomFieldType;
  label: string;
}> = [
  { value: 'string', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
];

export type CustomFieldDefinition = {
  id: number;
  appliesTo: 'expense' | 'income';
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  sortOrder: number;
};

export type Transaction = {
  id: number;
  kind: TransactionKind;
  date: string;
  amount: number;
  comment: string;
  accountId: number;
  accountName: string;
  currency: string;
  categoryId: number | null;
  categoryName: string | null;
  purposeId?: number | null;
  purposeName?: string | null;
  customFields: Record<string, string>;
  movementSubtypeId?: number | null;
  movementType?: string | null;
  movementSubtype?: string | null;
  initiatorAccountId?: number | null;
  initiatorAccountName?: string | null;
  receiverAccountId?: number | null;
  receiverAccountName?: string | null;
  /** First day of reconciled month (YYYY-MM-DD), for adjustment rows. */
  reconciliationPeriod?: string | null;
};

export type Entry = {
  id: number;
  date: string;
  amount: number;
  comment: string;
  accountId: number;
  accountName: string;
  currency: string;
  categoryId: number;
  categoryName: string;
  purposeId?: number | null;
  purposeName?: string | null;
  customFields?: Record<string, string> | null;
  country?: string;
  from?: string;
};

export const ACCOUNT_KINDS: Array<{ value: AccountKind; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank account' },
];

export function accountKindLabel(kind: AccountKind): string {
  return ACCOUNT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  expense: 'Expense',
  income: 'Income',
  cash: 'Cash movement',
  adjustment: 'Reconciliation',
};

export type TransactionView = 'all' | 'expenses' | 'income' | 'cash';

export function viewToApiKind(
  view: TransactionView
): TransactionKind | undefined {
  if (view === 'expenses') return 'expense';
  if (view === 'income') return 'income';
  if (view === 'cash') return 'cash';
  return undefined;
}
