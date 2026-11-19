import {
  getExpensePurposeId,
  purposeById,
} from './expensePurposeCatalog';
import { readJson, writeJson as writeStorageJson } from './localStorageJson';
import type { CustomFieldDefinition, CustomFieldType, Entry, Transaction } from '../types';
import { NOT_ME_ACCOUNT_ID, NOT_ME_LABEL } from './cashMovementValidation';

const DEFS_KEY = 'myfi:customFieldDefinitions';
const VALUES_KEY = 'myfi:customFieldValues';
const CASH_KEY = 'myfi:cashMovements';

type StoredCustomFieldDefinition = CustomFieldDefinition & {
  fieldType?: CustomFieldType;
};

type StoredCashMovement = {
  id: number;
  date: string;
  amount: number;
  comment: string;
  accountId: number;
  movementType: string;
  movementSubtype: string;
  initiatorAccountId: number;
  receiverAccountId: number;
};

function writeJson(key: string, value: unknown) {
  try {
    writeStorageJson(key, value);
  } catch {
    throw new Error(
      'Could not save custom fields in this browser. Check storage settings or free some space.'
    );
  }
}

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return base || 'field';
}

function nextLocalId(existing: { id: number }[]): number {
  if (existing.length === 0) return -1;
  const min = existing.reduce((m, row) => Math.min(m, row.id), 0);
  return min <= 0 ? min - 1 : -1;
}

function normalizeDefinition(raw: StoredCustomFieldDefinition): CustomFieldDefinition {
  return {
    ...raw,
    fieldType: raw.fieldType ?? 'string',
  };
}

function readAllDefinitions(): CustomFieldDefinition[] {
  return readJson<StoredCustomFieldDefinition[]>(DEFS_KEY, []).map(
    normalizeDefinition
  );
}

export function findCustomFieldDuplicate(
  appliesTo: 'expense' | 'income',
  label: string,
  excludeId?: number
): CustomFieldDefinition | undefined {
  const trimmed = label.trim();
  if (!trimmed) return undefined;
  const key = slugify(trimmed);
  const norm = trimmed.toLowerCase();
  return readAllDefinitions().find(
    (d) =>
      d.id !== excludeId &&
      d.appliesTo === appliesTo &&
      (d.fieldKey === key || d.label.trim().toLowerCase() === norm)
  );
}

export function loadCustomFieldDefinitions(
  appliesTo: 'expense' | 'income'
): CustomFieldDefinition[] {
  return readAllDefinitions()
    .filter((d) => d.appliesTo === appliesTo)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export function addCustomFieldDefinition(
  appliesTo: 'expense' | 'income',
  label: string,
  fieldType: CustomFieldType
): CustomFieldDefinition[] {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Name the field before adding it.');
  }

  const duplicate = findCustomFieldDuplicate(appliesTo, trimmed);
  if (duplicate) {
    throw new Error(
      `A field called “${duplicate.label}” already exists for ${appliesTo === 'expense' ? 'expenses' : 'income'}.`
    );
  }

  const all = readAllDefinitions();
  const fieldKey = slugify(trimmed);
  const sortOrder = all.filter((d) => d.appliesTo === appliesTo).length + 1;
  const created: CustomFieldDefinition = {
    id: nextLocalId(all),
    appliesTo,
    fieldKey,
    label: trimmed,
    fieldType,
    sortOrder,
  };
  all.push(created);
  writeJson(DEFS_KEY, all);
  return loadCustomFieldDefinitions(appliesTo);
}

function migrateFieldKeyInValues(
  appliesTo: 'expense' | 'income',
  oldKey: string,
  newKey: string
) {
  if (oldKey === newKey) return;
  const store = valuesStore();
  const prefix = `${appliesTo}:`;
  for (const [entryKey, fields] of Object.entries(store)) {
    if (!entryKey.startsWith(prefix)) continue;
    if (Object.prototype.hasOwnProperty.call(fields, oldKey)) {
      fields[newKey] = fields[oldKey];
      delete fields[oldKey];
    }
  }
  writeJson(VALUES_KEY, store);
}

export function updateCustomFieldDefinition(
  id: number,
  label: string,
  fieldType: CustomFieldType
): CustomFieldDefinition {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Name the field before saving.');
  }

  const all = readAllDefinitions();
  const index = all.findIndex((d) => d.id === id);
  if (index < 0) {
    throw new Error('Custom field not found.');
  }

  const current = all[index];
  const duplicate = findCustomFieldDuplicate(current.appliesTo, trimmed, id);
  if (duplicate) {
    throw new Error(
      `A field called “${duplicate.label}” already exists for ${current.appliesTo === 'expense' ? 'expenses' : 'income'}.`
    );
  }

  const newKey = slugify(trimmed);
  migrateFieldKeyInValues(current.appliesTo, current.fieldKey, newKey);

  const updated: CustomFieldDefinition = {
    ...current,
    label: trimmed,
    fieldType,
    fieldKey: newKey,
  };
  all[index] = updated;
  writeJson(DEFS_KEY, all);
  return updated;
}

function purgeFieldKeyFromValues(
  appliesTo: 'expense' | 'income',
  fieldKey: string
) {
  const store = valuesStore();
  const prefix = `${appliesTo}:`;
  for (const [entryKey, fields] of Object.entries(store)) {
    if (!entryKey.startsWith(prefix)) continue;
    if (Object.prototype.hasOwnProperty.call(fields, fieldKey)) {
      delete fields[fieldKey];
      if (Object.keys(fields).length === 0) {
        delete store[entryKey];
      }
    }
  }
  writeJson(VALUES_KEY, store);
}

/** Removes a field definition and clears its values on all transactions. */
export function deleteCustomFieldDefinition(id: number): CustomFieldDefinition {
  const all = readAllDefinitions();
  const index = all.findIndex((d) => d.id === id);
  if (index < 0) {
    throw new Error('Custom field not found.');
  }
  const removed = all[index]!;
  all.splice(index, 1);
  writeJson(DEFS_KEY, all);
  purgeFieldKeyFromValues(removed.appliesTo, removed.fieldKey);
  return removed;
}

export function validateCustomFieldValues(
  defs: CustomFieldDefinition[],
  values: Record<string, string>
): string | null {
  for (const def of defs) {
    const raw = values[def.fieldKey]?.trim() ?? '';
    if (!raw) continue;

    if (def.fieldType === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `“${def.label}” must be a valid date (YYYY-MM-DD).`;
    }
    if (def.fieldType === 'number' && !Number.isFinite(Number(raw))) {
      return `“${def.label}” must be a number.`;
    }
    if (def.fieldType === 'boolean' && raw !== 'true' && raw !== 'false') {
      return `“${def.label}” must be Yes or No.`;
    }
  }
  return null;
}

type ValueMap = Record<string, Record<string, string>>;

function valuesStore(): ValueMap {
  return readJson<ValueMap>(VALUES_KEY, {});
}

export function getCustomFieldValues(
  kind: 'expense' | 'income',
  entryId: number
): Record<string, string> {
  const key = `${kind}:${entryId}`;
  return valuesStore()[key] ?? {};
}

export function setCustomFieldValues(
  kind: 'expense' | 'income',
  entryId: number,
  values: Record<string, string>
) {
  const store = valuesStore();
  store[`${kind}:${entryId}`] = values;
  writeJson(VALUES_KEY, store);
}

export function deleteCustomFieldValues(
  kind: 'expense' | 'income',
  entryId: number
) {
  const store = valuesStore();
  delete store[`${kind}:${entryId}`];
  writeJson(VALUES_KEY, store);
}

export function entryToTransaction(
  entry: Entry,
  kind: 'expense' | 'income'
): Transaction {
  const purposeId =
    kind === 'expense' ? getExpensePurposeId(entry.id) : null;
  const purpose = purposeId != null ? purposeById(purposeId) : undefined;
  return {
    id: entry.id,
    kind,
    date: entry.date,
    amount: entry.amount,
    comment: entry.comment,
    accountId: entry.accountId,
    accountName: entry.accountName,
    currency: entry.currency,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    purposeId: purpose?.id ?? null,
    purposeName: purpose?.name ?? null,
    customFields: getCustomFieldValues(kind, entry.id),
  };
}

function normalizeCashMovement(row: StoredCashMovement): StoredCashMovement {
  let initiatorAccountId: number;
  if (row.initiatorAccountId === NOT_ME_ACCOUNT_ID) {
    initiatorAccountId = NOT_ME_ACCOUNT_ID;
  } else if (row.initiatorAccountId != null && row.initiatorAccountId > 0) {
    initiatorAccountId = row.initiatorAccountId;
  } else if (row.accountId > 0) {
    initiatorAccountId = row.accountId;
  } else {
    initiatorAccountId = NOT_ME_ACCOUNT_ID;
  }

  const receiverAccountId =
    row.receiverAccountId != null && row.receiverAccountId >= 0
      ? row.receiverAccountId
      : NOT_ME_ACCOUNT_ID;

  const primaryAccountId =
    initiatorAccountId > 0 ? initiatorAccountId : receiverAccountId;

  return {
    ...row,
    accountId: primaryAccountId,
    initiatorAccountId,
    receiverAccountId,
  };
}

export function loadCashMovements(): StoredCashMovement[] {
  return readJson<StoredCashMovement[]>(CASH_KEY, []).map(normalizeCashMovement);
}

export function saveCashMovements(rows: StoredCashMovement[]) {
  writeJson(CASH_KEY, rows);
}

export function cashToTransaction(
  row: StoredCashMovement,
  accounts: { id: number; name: string; currency: string }[]
): Transaction {
  const normalized = normalizeCashMovement(row);
  const initiator = accounts.find(
    (a) => a.id === normalized.initiatorAccountId
  );
  const receiver = accounts.find(
    (a) => a.id === normalized.receiverAccountId
  );
  const initiatorName =
    normalized.initiatorAccountId === NOT_ME_ACCOUNT_ID
      ? NOT_ME_LABEL
      : (initiator?.name ?? '—');
  const receiverName =
    normalized.receiverAccountId === NOT_ME_ACCOUNT_ID
      ? NOT_ME_LABEL
      : (receiver?.name ?? '—');
  const currencyAccount = initiator ?? receiver;

  return {
    id: normalized.id,
    kind: 'cash',
    date: normalized.date,
    amount: normalized.amount,
    comment: normalized.comment,
    accountId:
      normalized.initiatorAccountId > 0
        ? normalized.initiatorAccountId
        : normalized.receiverAccountId,
    accountName: currencyAccount?.name ?? initiatorName,
    currency: currencyAccount?.currency ?? 'EUR',
    categoryId: null,
    categoryName: null,
    customFields: {},
    movementType: normalized.movementType,
    movementSubtype: normalized.movementSubtype,
    initiatorAccountId: normalized.initiatorAccountId,
    initiatorAccountName: initiatorName,
    receiverAccountId: normalized.receiverAccountId,
    receiverAccountName: receiverName,
  };
}

export function upsertCashMovement(
  row: Omit<StoredCashMovement, 'id'> & { id?: number }
): StoredCashMovement {
  const rows = loadCashMovements();
  const normalized = normalizeCashMovement(row as StoredCashMovement);
  if (row.id != null) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const saved: StoredCashMovement = { ...normalized, id: row.id };
    if (idx >= 0) rows[idx] = saved;
    else rows.push(saved);
    saveCashMovements(rows);
    return saved;
  }
  const saved: StoredCashMovement = {
    ...normalized,
    id: nextLocalId(rows),
  };
  rows.push(saved);
  saveCashMovements(rows);
  return saved;
}

export function deleteCashMovement(id: number) {
  saveCashMovements(loadCashMovements().filter((r) => r.id !== id));
}

export function sortTransactions(rows: Transaction[]): Transaction[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.id !== b.id) return b.id - a.id;
    return a.kind.localeCompare(b.kind);
  });
}

export type { StoredCashMovement };
