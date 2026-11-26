import { api } from '../services/api';
import type { Account, Transaction } from '../types';
import { NOT_ME_ACCOUNT_ID, NOT_ME_LABEL } from './cashMovementValidation';

export type CashMovementRow = {
  id: number;
  date: string;
  amount: number;
  comment: string;
  movementSubtypeId: number;
  movementType: string;
  movementSubtype: string;
  initiatorAccountId: number;
  receiverAccountId: number;
  initiatorAccountName: string | null;
  receiverAccountName: string | null;
};

export async function fetchCashMovements(
  query = ''
): Promise<CashMovementRow[]> {
  return api<CashMovementRow[]>(`/cash-movements${query}`);
}

export function cashRowToTransaction(
  row: CashMovementRow,
  accounts: Pick<Account, 'id' | 'name' | 'currency'>[]
): Transaction {
  const initiatorName =
    row.initiatorAccountId === NOT_ME_ACCOUNT_ID
      ? NOT_ME_LABEL
      : (row.initiatorAccountName ??
        accounts.find((a) => a.id === row.initiatorAccountId)?.name ??
        '—');
  const receiverName =
    row.receiverAccountId === NOT_ME_ACCOUNT_ID
      ? NOT_ME_LABEL
      : (row.receiverAccountName ??
        accounts.find((a) => a.id === row.receiverAccountId)?.name ??
        '—');
  const currencyAccount =
    accounts.find(
      (a) =>
        a.id ===
        (row.initiatorAccountId > 0
          ? row.initiatorAccountId
          : row.receiverAccountId)
    ) ?? accounts[0];

  return {
    id: row.id,
    kind: 'cash',
    date: row.date,
    amount: row.amount,
    comment: row.comment,
    accountId:
      row.initiatorAccountId > 0
        ? row.initiatorAccountId
        : row.receiverAccountId,
    accountName: currencyAccount?.name ?? initiatorName,
    currency: currencyAccount?.currency ?? 'EUR',
    categoryId: null,
    categoryName: null,
    customFields: {},
    movementSubtypeId: row.movementSubtypeId,
    movementType: row.movementType,
    movementSubtype: row.movementSubtype,
    initiatorAccountId: row.initiatorAccountId,
    initiatorAccountName: initiatorName,
    receiverAccountId: row.receiverAccountId,
    receiverAccountName: receiverName,
  };
}

export type CashMovementBody = {
  date: string;
  amount: number;
  comment: string;
  movementSubtypeId: number;
  initiatorAccountId: number;
  receiverAccountId: number;
};

export async function createCashMovement(body: CashMovementBody) {
  return api<{ id: number }>('/cash-movements', {
    method: 'POST',
    body,
  });
}

export async function updateCashMovement(id: number, body: CashMovementBody) {
  return api<{ id: number }>(`/cash-movements/${id}`, {
    method: 'PUT',
    body,
  });
}

export async function deleteCashMovement(id: number) {
  await api(`/cash-movements/${id}`, { method: 'DELETE' });
}