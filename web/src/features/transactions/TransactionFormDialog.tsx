import type { Dispatch, FormEvent, SetStateAction } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { currencySymbol } from '../../utils/format';
import type {
  Account,
  Category,
  CustomFieldDefinition,
  ExpensePurpose,
  Transaction,
  TransactionKind,
} from '../../types';
import {
  subtypesForType,
  type CashMovementSubtype,
  type CashMovementType,
} from '../../utils/cashMovementCatalog';
import type { CatalogGap } from '../../utils/catalogGaps';
import { TransactionCatalogSetupAlert } from './TransactionCatalogSetupAlert';
import { AlertSlot } from '../../components/common/AlertSlot.styles';
import { FormDialog } from '../../components/common/FormDialog';
import {
  FormActions,
  FormGrid,
  FormGridFull,
} from '../../styles/shared.styles';
import {
  TransactionFormCustomColumns,
  type CustomColumnsFormSlice,
} from './TransactionFormCustomColumns';
import { TransactionKindPicker } from './TransactionKindPicker';
import {
  NOT_ME_ACCOUNT,
  NOT_ME_LABEL,
  resolveCashAccountFieldValue,
} from '../../utils/cashMovementValidation';
import { NEW_CATEGORY, type Draft } from './types';


type FormSlice = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: Transaction | null;
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  newCategory: string;
  setNewCategory: (value: string) => void;
  busy: boolean;
  formError: string;
  selectedCurrency: string;
  cashMovementCheck: { feasible: boolean; message: string | null };
  changeDraftKind: (kind: TransactionKind) => void;
  save: (event: FormEvent) => void;
  customColumns: CustomColumnsFormSlice;
};

type Props = {
  accounts: Account[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  expensePurposes: ExpensePurpose[];
  cashTypes: CashMovementType[];
  cashSubtypes: CashMovementSubtype[];
  catalogGap: CatalogGap | null;
  onGoToCatalogSetup: () => void;
  expenseFieldDefs: CustomFieldDefinition[];
  incomeFieldDefs: CustomFieldDefinition[];
  form: FormSlice;
};

export function TransactionFormDialog({
  accounts,
  expenseCategories,
  incomeCategories,
  expensePurposes,
  cashTypes,
  cashSubtypes,
  catalogGap,
  onGoToCatalogSetup,
  expenseFieldDefs,
  incomeFieldDefs,
  form,
}: Props) {
  const {
    open,
    setOpen,
    editing,
    draft,
    setDraft,
    newCategory,
    setNewCategory,
    busy,
    formError,
    selectedCurrency,
    cashMovementCheck,
    changeDraftKind,
    save,
    customColumns,
  } = form;

  const activeFieldDefs =
    draft.kind === 'expense' ? expenseFieldDefs : incomeFieldDefs;

  const initiatorSelectValue =
    draft.kind === 'cash'
      ? resolveCashAccountFieldValue(
          draft.initiatorAccountId || draft.accountId,
          accounts
        ) ||
        (accounts[0] ? String(accounts[0].id) : NOT_ME_ACCOUNT)
      : draft.accountId;

  const receiverSelectValue =
    draft.kind === 'cash'
      ? resolveCashAccountFieldValue(draft.receiverAccountId, accounts) ||
        NOT_ME_ACCOUNT
      : '';

  return (
    <FormDialog
      open={open}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      onClose={() => setOpen(false)}
    >
      <form onSubmit={save}>
        {catalogGap && (
          <TransactionCatalogSetupAlert
            gap={catalogGap}
            onNavigate={onGoToCatalogSetup}
          />
        )}

        {formError && (
          <AlertSlot>
            <Alert severity="error">{formError}</Alert>
          </AlertSlot>
        )}

        <FormGrid>
          <FormGridFull>
            <TransactionKindPicker
              value={draft.kind}
              onChange={changeDraftKind}
              disabled={Boolean(editing)}
              cashDisabled={accounts.length < 1}
              helperText={
                editing
                  ? 'Type cannot be changed when editing.'
                  : draft.kind === 'cash' && accounts.length < 1
                    ? 'Add an account first. Use Not me when the other party is outside your accounts.'
                    : undefined
              }
            />
          </FormGridFull>

          <TextField
            label="Date"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            size="small"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Amount"
            type="number"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="0.00"
            size="small"
            required
            slotProps={{
              htmlInput: {
                step: '0.01',
                min: '0.01',
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    {currencySymbol(selectedCurrency)}
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            label= {draft.kind === 'cash' ? 'Initiator account' : 'Account'}
            value={initiatorSelectValue}
            onChange={(e) => {
              const next = e.target.value;
              if (draft.kind === 'cash') {
                setDraft({
                  ...draft,
                  accountId: next,
                  initiatorAccountId: next,
                });
              } else {
                setDraft({ ...draft, accountId: next });
              }
            }}
            size="small"
            required
          >
            {draft.kind === 'cash' ? (
              [
                <MenuItem key={NOT_ME_ACCOUNT} value={NOT_ME_ACCOUNT}>
                  {NOT_ME_LABEL}
                </MenuItem>,
                ...accounts.map((account) => (
                  <MenuItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </MenuItem>
                )),
              ]
            ) : (
              accounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name}
                </MenuItem>
              ))
            )}
          </TextField>

          {draft.kind !== 'cash' && (
            <>
              <TextField
                select
                label="Category"
                value={draft.categoryId}
                onChange={(e) =>
                  setDraft({ ...draft, categoryId: e.target.value })
                }
                size="small"
                required
              >
                {(draft.kind === 'expense'
                  ? expenseCategories
                  : incomeCategories
                ).map((category) => (
                  <MenuItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </MenuItem>
                ))}
                <MenuItem value={NEW_CATEGORY}>Add a new category…</MenuItem>
              </TextField>

              {draft.categoryId === NEW_CATEGORY && (
                <TextField
                  label="New category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  size="small"
                  required
                />
              )}

              {draft.kind === 'expense' && (
                <TextField
                  select
                  label="Purpose"
                  value={draft.purposeId}
                  onChange={(e) =>
                    setDraft({ ...draft, purposeId: e.target.value })
                  }
                  size="small"
                  required
                  helperText="What this expense is for (stored in this browser — prototype)"
                >
                  {expensePurposes.map((purpose) => (
                    <MenuItem key={purpose.id} value={String(purpose.id)}>
                      {purpose.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TransactionFormCustomColumns
                draft={draft}
                fieldDefs={activeFieldDefs}
                setDraft={setDraft}
                columns={customColumns}
              />
            </>
          )}

          {draft.kind === 'cash' && (
            <>
              <TextField
                select
                label="Type"
                value={draft.movementTypeId}
                onChange={(e) => {
                  const typeId = e.target.value;
                  const subs = typeId
                    ? subtypesForType(Number(typeId))
                    : [];
                  setDraft({
                    ...draft,
                    movementTypeId: typeId,
                    movementSubtypeId: subs[0] ? String(subs[0].id) : '',
                  });
                }}
                size="small"
                required
              >
                {cashTypes.map((type) => (
                  <MenuItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Subtype"
                value={draft.movementSubtypeId}
                onChange={(e) =>
                  setDraft({ ...draft, movementSubtypeId: e.target.value })
                }
                size="small"
                required
                disabled={!draft.movementTypeId}
              >
                {cashSubtypes
                  .filter(
                    (s) => String(s.typeId) === draft.movementTypeId
                  )
                  .map((sub) => (
                    <MenuItem key={sub.id} value={String(sub.id)}>
                      {sub.name}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                select
                label="Receiver account"
                value={receiverSelectValue}
                onChange={(e) =>
                  setDraft({ ...draft, receiverAccountId: e.target.value })
                }
                size="small"
                required
              >
                <MenuItem value={NOT_ME_ACCOUNT}>{NOT_ME_LABEL}</MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={String(account.id)}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          {draft.kind === 'cash' && cashMovementCheck.message && (
            <FormGridFull>
              <Alert
                severity={cashMovementCheck.feasible ? 'success' : 'warning'}
              >
                {cashMovementCheck.message}
              </Alert>
            </FormGridFull>
          )}

          <FormGridFull>
            <TextField
              label="Comment"
              value={draft.comment}
              onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
              placeholder="Optional note"
              size="small"
              multiline
              minRows={2}
              fullWidth
            />
          </FormGridFull>
        </FormGrid>

        <FormActions>
          <Button
            type="submit"
            variant="contained"
            disabled={
              busy ||
              Boolean(catalogGap) ||
              (draft.kind === 'cash' && !cashMovementCheck.feasible)
            }
          >
            {busy ? 'Saving' : editing ? 'Save changes' : 'Save'}
          </Button>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </FormActions>
      </form>
    </FormDialog>
  );
}
