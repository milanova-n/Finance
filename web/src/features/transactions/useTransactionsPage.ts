import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, queryString } from '../../services/api';
import type {
  Account,
  Category,
  CustomFieldDefinition,
  CustomFieldType,
  Entry,
  ExpensePurpose,
  Transaction,
  TransactionKind,
  TransactionView,
} from '../../types';
import {
  addCustomFieldDefinition,
  deleteCustomFieldDefinition,
  fetchCustomFieldDefinitions,
  findCustomFieldDuplicate,
  updateCustomFieldDefinition,
  validateCustomFieldValues,
} from '../../utils/customFieldsApi';
import {
  cashRowToTransaction,
  createCashMovement,
  deleteCashMovement,
  fetchCashMovements,
  updateCashMovement,
  type CashMovementRow,
} from '../../utils/cashMovementsApi';
import {
  adjustmentRowToTransaction,
  entryToTransaction,
  sortTransactions,
} from '../../utils/transactionMappers';
import { fetchBalanceAdjustments } from '../../utils/balanceAdjustmentsApi';
import {
  fetchCashMovementSubtypes,
  fetchCashMovementTypes,
  findSubtypeByName,
  findTypeByName,
  subtypesForType,
  type CashMovementSubtype,
  type CashMovementType,
} from '../../utils/cashMovementCatalog';
import { fetchExpensePurposes } from '../../utils/expensePurposeCatalog';
import {
  catalogGapForKind,
  type CatalogGap,
} from '../../utils/catalogGaps';
import {
  accountCashMovementStats,
  accountDisplayBalance,
} from '../../utils/accountStats';
import {
  assessCashMovement,
  defaultReceiverAccountValue,
  fromCashAccountSelectValue,
  resolveCashAccountFieldValue,
  toCashAccountSelectValue,
} from '../../utils/cashMovementValidation';
import { catalogChanged, notifyCatalogChanged } from '../../utils/catalogEvents';
import { blankCashDraft, blankLedgerDraft } from './draft';
import { defaultKindForView, NEW_CATEGORY, type Draft } from './types';

function parseView(viewParam: string | undefined): TransactionView {
  if (
    viewParam === 'income' ||
    viewParam === 'cash' ||
    viewParam === 'expenses'
  ) {
    return viewParam;
  }
  return 'all';
}

export function useTransactionsPage() {
  const { view: viewParam } = useParams<{ view?: string }>();
  const navigate = useNavigate();
  const view = parseView(viewParam);

  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expensePurposes, setExpensePurposes] = useState<ExpensePurpose[]>([]);
  const [cashTypes, setCashTypes] = useState<CashMovementType[]>([]);
  const [allCashSubtypes, setAllCashSubtypes] = useState<CashMovementSubtype[]>(
    []
  );
  const [cashMovementRows, setCashMovementRows] = useState<CashMovementRow[]>(
    []
  );
  const [catalogStamp, setCatalogStamp] = useState(0);
  const [expenseFieldDefs, setExpenseFieldDefs] = useState<
    CustomFieldDefinition[]
  >([]);
  const [incomeFieldDefs, setIncomeFieldDefs] = useState<
    CustomFieldDefinition[]
  >([]);
  const [error, setError] = useState('');

  const [filters] = useState({
    accountId: '',
    categoryId: '',
    from: '',
    to: '',
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<Draft>(blankLedgerDraft('expense'));
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnType, setNewColumnType] = useState<CustomFieldType>('string');
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editColumnLabel, setEditColumnLabel] = useState('');
  const [editColumnType, setEditColumnType] =
    useState<CustomFieldType>('string');
  const [customColumnMessage, setCustomColumnMessage] = useState('');

  const resetCustomColumnUi = useCallback(() => {
    setNewColumnLabel('');
    setNewColumnType('string');
    setEditingColumnId(null);
    setEditColumnLabel('');
    setEditColumnType('string');
    setCustomColumnMessage('');
  }, []);

  useEffect(() => {
    if (!open) resetCustomColumnUi();
  }, [open, resetCustomColumnUi]);

  const refreshFieldDefs = useCallback(async () => {
    const [expense, income] = await Promise.all([
      fetchCustomFieldDefinitions('expense'),
      fetchCustomFieldDefinitions('income'),
    ]);
    setExpenseFieldDefs(expense);
    setIncomeFieldDefs(income);
  }, []);

  const loadRows = useCallback(() => {
    const qs = queryString(filters);

    const fetchLedger = (
      path: '/expenses' | '/incomes',
      kind: 'expense' | 'income'
    ) =>
      api<Entry[]>(`${path}${qs}`).then((entries) =>
        entries.map((entry) => entryToTransaction(entry, kind))
      );

    const ledgerTasks: Promise<Transaction[]>[] = [];

    if (view === 'all' || view === 'expenses') {
      ledgerTasks.push(fetchLedger('/expenses', 'expense'));
    }
    if (view === 'all' || view === 'income') {
      ledgerTasks.push(fetchLedger('/incomes', 'income'));
    }

    const adjustmentTask =
      view === 'all'
        ? fetchBalanceAdjustments({
            accountId: filters.accountId || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          }).then((adjRows) =>
            adjRows.map((row) => adjustmentRowToTransaction(row))
          )
        : Promise.resolve([] as Transaction[]);

    Promise.all([fetchCashMovements(qs), adjustmentTask, ...ledgerTasks])
      .then(([cashRows, adjustmentTx, ...ledgerGroups]) => {
        setCashMovementRows(cashRows);
        const cashTx =
          view === 'all' || view === 'cash'
            ? cashRows.map((row) => cashRowToTransaction(row, accounts))
            : [];
        const merged = sortTransactions([
          ...ledgerGroups.flat(),
          ...cashTx,
          ...adjustmentTx,
        ]);
        setRows(merged);
      })
      .catch((err) => setError(err.message));
  }, [filters, view, accounts]);

  useEffect(loadRows, [loadRows]);

  const loadLookups = useCallback(() => {
    void refreshFieldDefs();
    Promise.all([
      api<Account[]>('/accounts'),
      api<Category[]>('/categories?kind=expense'),
      api<Category[]>('/categories?kind=income'),
      fetchExpensePurposes(),
      fetchCashMovementTypes(),
      fetchCashMovementSubtypes(),
    ])
      .then(
        ([
          accountRows,
          expenseCats,
          incomeCats,
          purposes,
          types,
          subtypes,
        ]) => {
          setAccounts(accountRows);
          setExpenseCategories(expenseCats);
          setIncomeCategories(incomeCats);
          setExpensePurposes(purposes);
          setCashTypes(types);
          setAllCashSubtypes(subtypes);
          setCatalogStamp((n) => n + 1);
        }
      )
      .catch((err) => setError(err.message));
  }, [refreshFieldDefs]);

  useEffect(loadLookups, [loadLookups]);

  useEffect(() => {
    const onCatalogChange = () => loadLookups();
    catalogChanged.addEventListener('change', onCatalogChange);
    return () => catalogChanged.removeEventListener('change', onCatalogChange);
  }, [loadLookups]);

  const currency = accounts[0]?.currency ?? 'EUR';
  const noAccounts = accounts.length === 0;

  const catalogGap: CatalogGap | null = useMemo(
    () =>
      open
        ? catalogGapForKind(draft.kind, {
            expenseCategories,
            incomeCategories,
            expensePurposes,
            cashTypes,
          })
        : null,
    [
      open,
      draft.kind,
      expenseCategories,
      incomeCategories,
      expensePurposes,
      cashTypes,
    ]
  );

  const draftCashSubtypes = useMemo(() => {
    if (draft.kind !== 'cash') return [];
    const typeId = Number(draft.movementTypeId);
    if (!Number.isFinite(typeId) || draft.movementTypeId === '') return [];
    return subtypesForType(allCashSubtypes, typeId);
  }, [draft, allCashSubtypes, catalogStamp]);

  useEffect(() => {
    if (!open) return;
    setDraft((current) => {
      if (current.kind === 'expense') {
        const cats = expenseCategories;
        const purposes = expensePurposes;
        const categoryId = cats.some((c) => String(c.id) === current.categoryId)
          ? current.categoryId
          : String(cats[0]?.id ?? '');
        const purposeId = purposes.some(
          (p) => String(p.id) === current.purposeId
        )
          ? current.purposeId
          : String(purposes[0]?.id ?? '');
        if (
          categoryId === current.categoryId &&
          purposeId === current.purposeId
        ) {
          return current;
        }
        return { ...current, categoryId, purposeId };
      }
      if (current.kind === 'income') {
        const cats = incomeCategories;
        const categoryId = cats.some((c) => String(c.id) === current.categoryId)
          ? current.categoryId
          : String(cats[0]?.id ?? '');
        if (categoryId === current.categoryId) return current;
        return { ...current, categoryId };
      }
      if (current.kind === 'cash') {
        const types = cashTypes;
        const typeId = types.some(
          (t) => String(t.id) === current.movementTypeId
        )
          ? current.movementTypeId
          : String(types[0]?.id ?? '');
        const subs = typeId
          ? subtypesForType(allCashSubtypes, Number(typeId))
          : [];
        const subtypeId = subs.some(
          (s) => String(s.id) === current.movementSubtypeId
        )
          ? current.movementSubtypeId
          : String(subs[0]?.id ?? '');
        if (
          typeId === current.movementTypeId &&
          subtypeId === current.movementSubtypeId
        ) {
          return current;
        }
        return {
          ...current,
          movementTypeId: typeId,
          movementSubtypeId: subtypeId,
        };
      }
      return current;
    });
  }, [
    open,
    expenseCategories,
    incomeCategories,
    expensePurposes,
    cashTypes,
    allCashSubtypes,
    catalogStamp,
  ]);

  const accountIdsKey = useMemo(
    () => accounts.map((a) => a.id).join(','),
    [accounts]
  );

  const cashAccountsSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      cashAccountsSyncedRef.current = null;
      return;
    }
    if (accounts.length === 0) return;

    const syncKey = `${accountIdsKey}:${accounts.length}`;
    if (cashAccountsSyncedRef.current === syncKey) return;
    cashAccountsSyncedRef.current = syncKey;

    setDraft((current) => {
      if (current.kind !== 'cash') return current;

      const initiatorRaw = current.initiatorAccountId || current.accountId;
      const initiator =
        resolveCashAccountFieldValue(initiatorRaw, accounts) ||
        String(accounts[0].id);
      const receiver =
        resolveCashAccountFieldValue(current.receiverAccountId, accounts) ||
        defaultReceiverAccountValue(accounts);

      if (
        current.initiatorAccountId === initiator &&
        current.accountId === initiator &&
        current.receiverAccountId === receiver
      ) {
        return current;
      }

      return {
        ...current,
        accountId: initiator,
        initiatorAccountId: initiator,
        receiverAccountId: receiver,
      };
    });
  }, [open, accountIdsKey, accounts.length]);

  const selectedCurrency = useMemo(() => {
    if (draft.kind === 'cash') {
      const initiatorId = fromCashAccountSelectValue(
        draft.initiatorAccountId || draft.accountId
      );
      const receiverId = fromCashAccountSelectValue(draft.receiverAccountId);
      const lookupId = initiatorId > 0 ? initiatorId : receiverId;
      return (
        accounts.find((a) => a.id === lookupId)?.currency ?? currency
      );
    }
    return (
      accounts.find((a) => String(a.id) === draft.accountId)?.currency ??
      currency
    );
  }, [accounts, currency, draft]);

  const cashMovementCheck = useMemo(() => {
    if (draft.kind !== 'cash') {
      return { feasible: true, message: null as string | null };
    }
    const excludeId = editing?.kind === 'cash' ? editing.id : undefined;
    return assessCashMovement({
      initiatorAccountId: draft.initiatorAccountId || draft.accountId,
      receiverAccountId: draft.receiverAccountId,
      amountStr: draft.amount,
      accounts,
      balanceForAccount: (accountId) => {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) return 0;
        const cash = accountCashMovementStats(
          accountId,
          cashMovementRows,
          { excludeCashMovementId: excludeId }
        );
        return accountDisplayBalance(account, cash);
      },
    });
  }, [draft, accounts, editing, cashMovementRows]);

  const openNewWithKind = useCallback(
    (kind: TransactionKind) => {
      if (kind === 'adjustment') return;
      setEditing(null);
      setNewCategory('');
      setFormError('');
      if (kind === 'cash') {
        const firstType = cashTypes[0];
        const firstSub = firstType
          ? subtypesForType(allCashSubtypes, firstType.id)[0]
          : undefined;
        const first = String(accounts[0]?.id ?? '');
        setDraft({
          ...blankCashDraft(),
          accountId: first,
          initiatorAccountId: first,
          receiverAccountId: defaultReceiverAccountValue(accounts),
          movementTypeId: firstType ? String(firstType.id) : '',
          movementSubtypeId: firstSub ? String(firstSub.id) : '',
        });
      } else {
        const cats = kind === 'expense' ? expenseCategories : incomeCategories;
        setDraft({
          ...blankLedgerDraft(kind),
          accountId: String(accounts[0]?.id ?? ''),
          categoryId: String(cats[0]?.id ?? ''),
          purposeId:
            kind === 'expense' ? String(expensePurposes[0]?.id ?? '') : '',
        });
      }
      setOpen(true);
    },
    [
      accounts,
      expenseCategories,
      incomeCategories,
      expensePurposes,
      cashTypes,
      allCashSubtypes,
    ]
  );

  const openNew = useCallback(() => {
    let kind = defaultKindForView(view);
    if (kind === 'cash' && accounts.length < 1) {
      kind = 'expense';
    }
    openNewWithKind(kind);
  }, [view, accounts.length, openNewWithKind]);

  const changeDraftKind = useCallback(
    (next: TransactionKind) => {
      if (editing) return;
      if (next === 'adjustment') return;
      if (next === 'cash' && accounts.length < 1) return;

      setDraft((draft) => {
        const shared = {
          date: draft.date,
          amount: draft.amount,
          accountId: draft.accountId,
          comment: draft.comment,
        };

        if (next === 'cash') {
          const firstType = cashTypes[0];
          const firstSub = firstType
            ? subtypesForType(allCashSubtypes, firstType.id)[0]
            : undefined;
          return {
            ...blankCashDraft(),
            ...shared,
            initiatorAccountId:
              shared.accountId || String(accounts[0]?.id ?? ''),
            receiverAccountId: defaultReceiverAccountValue(accounts),
            movementTypeId: firstType ? String(firstType.id) : '',
            movementSubtypeId: firstSub ? String(firstSub.id) : '',
          };
        }

        const cats =
          next === 'expense' ? expenseCategories : incomeCategories;
        return {
          ...blankLedgerDraft(next),
          ...shared,
          categoryId: String(cats[0]?.id ?? ''),
          purposeId:
            next === 'expense' ? String(expensePurposes[0]?.id ?? '') : '',
        };
      });
      resetCustomColumnUi();
    },
    [
      editing,
      accounts,
      expenseCategories,
      incomeCategories,
      expensePurposes,
      cashTypes,
      allCashSubtypes,
      resetCustomColumnUi,
    ]
  );

  const openEdit = useCallback((row: Transaction) => {
    if (row.kind === 'adjustment') {
      setError(
        'Reconciliation adjustments are managed from Accounts → Reconcile month.'
      );
      return;
    }
    setEditing(row);
    setNewCategory('');
    setFormError('');
    if (row.kind === 'cash') {
      const subtypeFromId = row.movementSubtypeId
        ? allCashSubtypes.find((s) => s.id === row.movementSubtypeId)
        : undefined;
      const matchedType = subtypeFromId
        ? cashTypes.find((t) => t.id === subtypeFromId.typeId)
        : findTypeByName(cashTypes, row.movementType ?? '');
      const matchedSubtype =
        subtypeFromId ??
        (matchedType && row.movementSubtype
          ? findSubtypeByName(
              allCashSubtypes,
              matchedType.id,
              row.movementSubtype
            )
          : undefined);
      setDraft({
        kind: 'cash',
        date: row.date,
        amount: String(row.amount),
        accountId: toCashAccountSelectValue(
          row.initiatorAccountId ?? row.accountId
        ),
        comment: row.comment,
        movementTypeId: matchedType ? String(matchedType.id) : '',
        movementSubtypeId: matchedSubtype ? String(matchedSubtype.id) : '',
        initiatorAccountId: toCashAccountSelectValue(
          row.initiatorAccountId ?? row.accountId
        ),
        receiverAccountId: toCashAccountSelectValue(row.receiverAccountId),
      });
    } else {
      setDraft({
        kind: row.kind,
        date: row.date,
        amount: String(row.amount),
        accountId: String(row.accountId),
        categoryId: String(row.categoryId ?? ''),
        purposeId: String(row.purposeId ?? ''),
        comment: row.comment,
        customFields: { ...(row.customFields ?? {}) },
      });
    }
    setOpen(true);
  }, [cashTypes, allCashSubtypes]);

  const save = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setFormError('');
      try {
        const gap = catalogGapForKind(draft.kind, {
          expenseCategories,
          incomeCategories,
          expensePurposes,
          cashTypes,
        });
        if (gap) {
          throw new Error(
            `${gap.title} are not set up yet. Use “Set up” in the form or open Settings.`
          );
        }

        if (draft.kind === 'cash') {
          const typeId = Number(draft.movementTypeId);
          const subtypeId = Number(draft.movementSubtypeId);
          const type = cashTypes.find((t) => t.id === typeId);
          const subtype = allCashSubtypes.find((s) => s.id === subtypeId);
          if (!type || !subtype || subtype.typeId !== type.id) {
            throw new Error('Choose a cash movement type and subtype.');
          }
          const cashCheck = assessCashMovement({
            initiatorAccountId: draft.initiatorAccountId || draft.accountId,
            receiverAccountId: draft.receiverAccountId,
            amountStr: draft.amount,
            accounts,
            balanceForAccount: (accountId) => {
              const account = accounts.find((a) => a.id === accountId);
              if (!account) return 0;
              const excludeId =
                editing?.kind === 'cash' ? editing.id : undefined;
              const cash = accountCashMovementStats(
                accountId,
                cashMovementRows,
                { excludeCashMovementId: excludeId }
              );
              return accountDisplayBalance(account, cash);
            },
          });
          if (!cashCheck.feasible) {
            throw new Error(
              cashCheck.message ?? 'This cash movement cannot be recorded.'
            );
          }
          const initiatorAccountId = fromCashAccountSelectValue(
            draft.initiatorAccountId || draft.accountId
          );
          const receiverAccountId = fromCashAccountSelectValue(
            draft.receiverAccountId
          );
          const cashBody = {
            date: draft.date,
            amount: Number(draft.amount),
            comment: draft.comment,
            movementSubtypeId: subtypeId,
            initiatorAccountId,
            receiverAccountId,
          };
          if (editing?.kind === 'cash') {
            await updateCashMovement(editing.id, cashBody);
          } else {
            await createCashMovement(cashBody);
          }
        } else {
          let categoryId = draft.categoryId;
          if (categoryId === NEW_CATEGORY) {
            if (!newCategory.trim()) throw new Error('Name the new category.');
            const created = await api<Category>('/categories', {
              method: 'POST',
              body: { name: newCategory.trim(), kind: draft.kind },
            });
            categoryId = String(created.id);
            loadLookups();
            notifyCatalogChanged();
          }

          const path = draft.kind === 'expense' ? '/expenses' : '/incomes';
          const defs =
            draft.kind === 'expense' ? expenseFieldDefs : incomeFieldDefs;
          const validationError = validateCustomFieldValues(
            defs,
            draft.customFields
          );
          if (validationError) {
            throw new Error(validationError);
          }

          const body = {
            date: draft.date,
            amount: Number(draft.amount),
            accountId: Number(draft.accountId),
            categoryId: Number(categoryId),
            comment: draft.comment,
            customFields: draft.customFields,
            ...(draft.kind === 'expense'
              ? { purposeId: Number(draft.purposeId) }
              : {}),
          };

          if (editing && editing.kind !== 'cash') {
            await api(`${path}/${editing.id}`, { method: 'PUT', body });
          } else {
            await api<{ id: number }>(path, {
              method: 'POST',
              body,
            });
          }
        }

        setOpen(false);
        loadRows();
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : 'Could not save this transaction.'
        );
      } finally {
        setBusy(false);
      }
    },
    [
      draft,
      editing,
      newCategory,
      expenseFieldDefs,
      incomeFieldDefs,
      loadLookups,
      loadRows,
      expenseCategories,
      incomeCategories,
      expensePurposes,
      cashTypes,
      allCashSubtypes,
      cashMovementRows,
      accounts,
    ]
  );

  const goToCatalogSetup = useCallback(() => {
    setOpen(false);
  }, []);

  const remove = useCallback(
    async (row: Transaction) => {
      if (!confirm('Delete this transaction? This cannot be undone.')) return;
      try {
        if (row.kind === 'adjustment') {
          setError(
            'Re-run Reconcile month for that account to change the adjustment.'
          );
          return;
        }
        if (row.kind === 'cash') {
          await deleteCashMovement(row.id);
        } else {
          const path = row.kind === 'expense' ? '/expenses' : '/incomes';
          await api(`${path}/${row.id}`, { method: 'DELETE' });
        }
        loadRows();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not delete the transaction.'
        );
      }
    },
    [loadRows]
  );

  const syncFieldDefsFor = useCallback(async (appliesTo: 'expense' | 'income') => {
    const defs = await fetchCustomFieldDefinitions(appliesTo);
    if (appliesTo === 'expense') setExpenseFieldDefs(defs);
    else setIncomeFieldDefs(defs);
  }, []);

  const applyCustomFieldDefinition = useCallback(
    async (
      target: 'expense' | 'income',
      label: string,
      fieldType: CustomFieldType
    ) => {
      const created = await addCustomFieldDefinition(target, label, fieldType);
      await syncFieldDefsFor(created.appliesTo);
    },
    [syncFieldDefsFor]
  );

  const newColumnDuplicate = useMemo(() => {
    if (draft.kind === 'cash' || !newColumnLabel.trim()) return undefined;
    const defs =
      draft.kind === 'expense' ? expenseFieldDefs : incomeFieldDefs;
    return findCustomFieldDuplicate(defs, draft.kind, newColumnLabel);
  }, [draft.kind, newColumnLabel, expenseFieldDefs, incomeFieldDefs]);

  const editColumnDuplicate = useMemo(() => {
    if (draft.kind === 'cash' || editingColumnId == null || !editColumnLabel.trim()) {
      return undefined;
    }
    const defs =
      draft.kind === 'expense' ? expenseFieldDefs : incomeFieldDefs;
    return findCustomFieldDuplicate(
      defs,
      draft.kind,
      editColumnLabel,
      editingColumnId
    );
  }, [
    draft.kind,
    editingColumnId,
    editColumnLabel,
    expenseFieldDefs,
    incomeFieldDefs,
  ]);

  const addCustomColumn = useCallback(async () => {
    if (draft.kind === 'cash') return;
    setCustomColumnMessage('');
    try {
      if (newColumnDuplicate) {
        throw new Error(
          `A column called “${newColumnDuplicate.label}” already exists.`
        );
      }
      await applyCustomFieldDefinition(
        draft.kind,
        newColumnLabel,
        newColumnType
      );
      setNewColumnLabel('');
      setNewColumnType('string');
    } catch (err) {
      setCustomColumnMessage(
        err instanceof Error ? err.message : 'Could not add the column.'
      );
    }
  }, [
    draft.kind,
    newColumnDuplicate,
    newColumnLabel,
    newColumnType,
    applyCustomFieldDefinition,
  ]);

  const startEditCustomColumn = useCallback((def: CustomFieldDefinition) => {
    setCustomColumnMessage('');
    setEditingColumnId(def.id);
    setEditColumnLabel(def.label);
    setEditColumnType(def.fieldType);
  }, []);

  const cancelEditCustomColumn = useCallback(() => {
    setEditingColumnId(null);
    setEditColumnLabel('');
    setEditColumnType('string');
    setCustomColumnMessage('');
  }, []);

  const saveEditCustomColumn = useCallback(async () => {
    if (draft.kind === 'cash' || editingColumnId == null) return;
    setCustomColumnMessage('');
    try {
      if (editColumnDuplicate) {
        throw new Error(
          `A column called “${editColumnDuplicate.label}” already exists.`
        );
      }
      const editingDef = [...expenseFieldDefs, ...incomeFieldDefs].find(
        (d) => d.id === editingColumnId
      );
      if (!editingDef) throw new Error('Column not found.');

      const oldKey = editingDef.fieldKey;
      const saved = await updateCustomFieldDefinition(
        editingColumnId,
        editColumnLabel,
        editColumnType
      );
      await syncFieldDefsFor(saved.appliesTo);

      if (
        draft.kind === saved.appliesTo &&
        oldKey !== saved.fieldKey &&
        Object.prototype.hasOwnProperty.call(draft.customFields, oldKey)
      ) {
        const value = draft.customFields[oldKey];
        setDraft((d) => {
          if (d.kind === 'cash') return d;
          const { [oldKey]: _removed, ...rest } = d.customFields;
          return {
            ...d,
            customFields: { ...rest, [saved.fieldKey]: value },
          };
        });
      }

      loadRows();
      cancelEditCustomColumn();
    } catch (err) {
      setCustomColumnMessage(
        err instanceof Error ? err.message : 'Could not save the column.'
      );
    }
  }, [
    draft,
    editingColumnId,
    editColumnDuplicate,
    editColumnLabel,
    editColumnType,
    expenseFieldDefs,
    incomeFieldDefs,
    syncFieldDefsFor,
    loadRows,
    cancelEditCustomColumn,
  ]);

  const applyCustomFieldDefinitionAfterRemove = useCallback(
    (def: CustomFieldDefinition) => {
      syncFieldDefsFor(def.appliesTo);
      setDraft((d) => {
        if (d.kind === 'cash' || d.kind !== def.appliesTo) return d;
        if (!Object.prototype.hasOwnProperty.call(d.customFields, def.fieldKey)) {
          return d;
        }
        const { [def.fieldKey]: _removed, ...rest } = d.customFields;
        return { ...d, customFields: rest };
      });
      loadRows();
    },
    [syncFieldDefsFor, loadRows]
  );

  const removeCustomColumn = useCallback(
    async (def: CustomFieldDefinition) => {
      const scope = def.appliesTo === 'expense' ? 'expense' : 'income';
      if (
        !confirm(
          `Remove “${def.label}” from all ${scope} transactions? Saved values for this column are no longer shown in the grid.`
        )
      ) {
        return;
      }
      setCustomColumnMessage('');
      if (editingColumnId === def.id) {
        setEditingColumnId(null);
      }
      try {
        await deleteCustomFieldDefinition(def.id);
        applyCustomFieldDefinitionAfterRemove(def);
      } catch (err) {
        setCustomColumnMessage(
          err instanceof Error ? err.message : 'Could not remove the field.'
        );
      }
    },
    [editingColumnId, applyCustomFieldDefinitionAfterRemove]
  );

  const changeView = useCallback(
    (next: TransactionView) => {
      navigate(
        next === 'all' ? '/transactions' : `/transactions/${next}`
      );
    },
    [navigate]
  );

  return {
    view,
    navigate: changeView,
    rows,
    error,
    setError,
    accounts,
    expenseCategories,
    incomeCategories,
    expensePurposes,
    cashTypes,
    allCashSubtypes,
    cashSubtypes: draftCashSubtypes,
    catalogGap,
    goToCatalogSetup,
    expenseFieldDefs,
    incomeFieldDefs,
    noAccounts,
    openNew,
    openEdit,
    remove,
    form: {
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
      customColumns: {
        newLabel: newColumnLabel,
        setNewLabel: setNewColumnLabel,
        newType: newColumnType,
        setNewType: setNewColumnType,
        newDuplicate: newColumnDuplicate,
        addColumn: addCustomColumn,
        editingId: editingColumnId,
        editLabel: editColumnLabel,
        setEditLabel: setEditColumnLabel,
        editType: editColumnType,
        setEditType: setEditColumnType,
        editDuplicate: editColumnDuplicate,
        startEdit: startEditCustomColumn,
        cancelEdit: cancelEditCustomColumn,
        saveEdit: saveEditCustomColumn,
        removeColumn: removeCustomColumn,
        message: customColumnMessage,
      },
    },
  };
}

export type TransactionsPageModel = ReturnType<typeof useTransactionsPage>;
