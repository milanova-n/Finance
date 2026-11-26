import type { Account } from '../types';
import { money } from './format';

/** Select value for an external party (not one of your accounts). */
export const NOT_ME_ACCOUNT = 'not-me';

export const NOT_ME_ACCOUNT_ID = 0;

export const NOT_ME_LABEL = 'Not me';

export function toCashAccountSelectValue(
  id: number | null | undefined
): string {
  if (id == null || id === NOT_ME_ACCOUNT_ID) return NOT_ME_ACCOUNT;
  return String(id);
}

export function fromCashAccountSelectValue(value: string): number {
  if (value === NOT_ME_ACCOUNT || value === '') return NOT_ME_ACCOUNT_ID;
  const n = Number(value);
  return Number.isFinite(n) ? n : NOT_ME_ACCOUNT_ID;
}

/** Returns a MenuItem value when `raw` is valid; otherwise `''`. */
export function resolveCashAccountFieldValue(
  raw: string | undefined,
  accounts: Account[]
): string {
  const v = (raw ?? '').trim();
  if (v === NOT_ME_ACCOUNT) return NOT_ME_ACCOUNT;
  if (v && accounts.some((a) => String(a.id) === v)) return v;
  return '';
}

export function defaultReceiverAccountValue(accounts: Account[]): string {
  if (accounts.length >= 2) return String(accounts[1].id);
  if (accounts.length === 1) return NOT_ME_ACCOUNT;
  return NOT_ME_ACCOUNT;
}

export type CashMovementCheck = {
  feasible: boolean;
  message: string | null;
};

export function assessCashMovement(input: {
  initiatorAccountId: string;
  receiverAccountId: string;
  amountStr: string;
  accounts: Account[];
  balanceForAccount: (accountId: number) => number;
}): CashMovementCheck {
  const amount = Number(input.amountStr);

  const initiatorId = fromCashAccountSelectValue(input.initiatorAccountId);
  const receiverId = fromCashAccountSelectValue(input.receiverAccountId);

  if (initiatorId === NOT_ME_ACCOUNT_ID && receiverId === NOT_ME_ACCOUNT_ID) {
    return {
      feasible: false,
      message:
        'Choose at least one of your accounts on either the initiator or receiver side.',
    };
  }

  const initiator =
    initiatorId > 0
      ? input.accounts.find((a) => a.id === initiatorId)
      : undefined;
  const receiver =
    receiverId > 0
      ? input.accounts.find((a) => a.id === receiverId)
      : undefined;

  if (initiatorId > 0 && receiverId > 0 && initiatorId === receiverId) {
    return {
      feasible: false,
      message: 'Initiator and receiver must be different accounts.',
    };
  }

  if (initiator && receiver && initiator.currency !== receiver.currency) {
    return {
      feasible: false,
      message: `Cannot move between ${initiator.currency} and ${receiver.currency}. Use accounts in the same currency.`,
    };
  }

  if (initiatorId > 0) {
    const available = input.balanceForAccount(initiatorId);
    if (available < amount) {
      return {
        feasible: false,
        message: `Not enough in ${initiator!.name}: ${money(available, initiator!.currency)} available, ${money(amount, initiator!.currency)} required.`,
      };
    }
  }

  return { feasible: true, message: null };
}
