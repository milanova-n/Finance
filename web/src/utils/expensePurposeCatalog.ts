import { DEFAULT_EXPENSE_PURPOSES } from './catalogDefaults';
import { readJson, writeJson } from './localStorageJson';
import type { ExpensePurpose } from '../types';

const PURPOSES_KEY = 'myfi:expensePurposes';
const PURPOSE_VALUES_KEY = 'myfi:expensePurposeValues';

function nextLocalId(existing: { id: number }[]): number {
  if (existing.length === 0) return -1;
  const min = existing.reduce((m, row) => Math.min(m, row.id), 0);
  return min <= 0 ? min - 1 : -1;
}

export function loadExpensePurposes(): ExpensePurpose[] {
  return readJson<ExpensePurpose[]>(PURPOSES_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function ensureDefaultExpensePurposes(): void {
  if (loadExpensePurposes().length > 0) return;
  const created: ExpensePurpose[] = DEFAULT_EXPENSE_PURPOSES.map((name, i) => ({
    id: -(i + 1),
    name,
  }));
  writeJson(PURPOSES_KEY, created);
}

export function addExpensePurpose(name: string): ExpensePurpose {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name the purpose.');
  const all = readJson<ExpensePurpose[]>(PURPOSES_KEY, []);
  const duplicate = all.find(
    (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return duplicate;
  const created: ExpensePurpose = { id: nextLocalId(all), name: trimmed };
  all.push(created);
  writeJson(PURPOSES_KEY, all);
  return created;
}

export function renameExpensePurpose(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a name.');
  const all = readJson<ExpensePurpose[]>(PURPOSES_KEY, []);
  const duplicate = all.find(
    (p) =>
      p.id !== id && p.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`“${duplicate.name}” already exists.`);
  }
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error('Purpose not found.');
  all[idx] = { ...all[idx], name: trimmed };
  writeJson(PURPOSES_KEY, all);
}

export function deleteExpensePurpose(id: number) {
  const all = loadExpensePurposes().filter((p) => p.id !== id);
  writeJson(PURPOSES_KEY, all);
  const values = readJson<Record<string, number>>(PURPOSE_VALUES_KEY, {});
  for (const [key, purposeId] of Object.entries(values)) {
    if (purposeId === id) delete values[key];
  }
  writeJson(PURPOSE_VALUES_KEY, values);
}

export function seedDefaultExpensePurposes(): number {
  ensureDefaultExpensePurposes();
  let added = 0;
  for (const name of DEFAULT_EXPENSE_PURPOSES) {
    const exists = loadExpensePurposes().some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (!exists) {
      addExpensePurpose(name);
      added += 1;
    }
  }
  return added;
}

export function purposeById(id: number): ExpensePurpose | undefined {
  return loadExpensePurposes().find((p) => p.id === id);
}

function valuesStore(): Record<string, number> {
  return readJson<Record<string, number>>(PURPOSE_VALUES_KEY, {});
}

export function getExpensePurposeId(expenseId: number): number | null {
  return valuesStore()[String(expenseId)] ?? null;
}

export function setExpensePurpose(expenseId: number, purposeId: number) {
  const store = valuesStore();
  store[String(expenseId)] = purposeId;
  writeJson(PURPOSE_VALUES_KEY, store);
}

export function deleteExpensePurposeValue(expenseId: number) {
  const store = valuesStore();
  delete store[String(expenseId)];
  writeJson(PURPOSE_VALUES_KEY, store);
}