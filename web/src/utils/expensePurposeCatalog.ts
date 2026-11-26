import { api } from '../services/api';
import type { ExpensePurpose } from '../types';

export async function fetchExpensePurposes(): Promise<ExpensePurpose[]> {
  return api<ExpensePurpose[]>('/expense-purposes');
}

export async function addExpensePurpose(name: string): Promise<ExpensePurpose> {
  return api<ExpensePurpose>('/expense-purposes', {
    method: 'POST',
    body: { name },
  });
}

export async function renameExpensePurpose(id: number, name: string) {
  return api<ExpensePurpose>(`/expense-purposes/${id}`, {
    method: 'PUT',
    body: { name },
  });
}

export async function deleteExpensePurpose(id: number) {
  await api(`/expense-purposes/${id}`, { method: 'DELETE' });
}

export function purposeById(
  purposes: ExpensePurpose[],
  id: number
): ExpensePurpose | undefined {
  return purposes.find((p) => p.id === id);
}