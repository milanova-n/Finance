import { today } from '../../utils/format';
import { NOT_ME_ACCOUNT } from '../../utils/cashMovementValidation';
import type { CashDraft, LedgerDraft } from './types';

export function blankLedgerDraft(kind: 'expense' | 'income'): LedgerDraft {
  return {
    kind,
    date: today(),
    amount: '',
    accountId: '',
    categoryId: '',
    purposeId: '',
    comment: '',
    customFields: {},
  };
}

export function blankCashDraft(): CashDraft {
  return {
    kind: 'cash',
    date: today(),
    amount: '',
    accountId: '',
    comment: '',
    movementTypeId: '',
    movementSubtypeId: '',
    initiatorAccountId: '',
    receiverAccountId: NOT_ME_ACCOUNT,
  };
}
