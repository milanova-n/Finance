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
  cashToTransaction,
  deleteCashMovement,
  deleteCustomFieldDefinition,
  deleteCustomFieldValues,
  entryToTransaction,
  findCustomFieldDuplicate,
  loadCashMovements,
  loadCustomFieldDefinitions,
  setCustomFieldValues,
  sortTransactions,
  updateCustomFieldDefinition,
  upsertCashMovement,
  validateCustomFieldValues,
} from '../../utils/transactionLocal';
import {
  findSubtypeByName,
  findTypeByName,
  loadCashMovementSubtypes,
  loadCashMovementTypes,
  subtypesForType,
  type CashMovementType,
} from '../../utils/cashMovementCatalog';
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
import {
  deleteExpensePurposeValue,
  loadExpensePurposes,
  setExpensePurpose,
} from '../../utils/expensePurposeCatalog';
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

  const refreshFieldDefs = useCallback(() => {
    setExpenseFieldDefs(loadCustomFieldDefinitions('expense'));
    setIncomeFieldDefs(loadCustomFieldDefinitions('income'));
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

    const tasks: Promise<Transaction[]>[] = [];

    if (view === 'all' || view === 'expenses') {
      tasks.push(fetchLedger('/expenses', 'expense'));
    }
    if (view === 'all' || view === 'income') {
      tasks.push(fetchLedger('/incomes', 'income'));
    }
    if (view === 'all' || view === 'cash') {
      tasks.push(
        Promise.resolve(
          loadCashMovements().map((row) => cashToTransaction(row, accounts))
        )
      );
    }

    Promise.all(tasks)
      .then((groups) => {
        const merged = sortTransactions(groups.flat());
        setRows(merged);
      })
      .catch((err) => setError(err.message));
  }, [filters, view, accounts]);

  useEffect(loadRows, [loadRows]);

  const loadLookups = useCallback(() => {
    refreshFieldDefs();
    api<Account[]>('/accounts')
      .then(setAccounts)
      .catch((err) => setError(err.message));
    api<Category[]>('/categories?kind=expense')
      .then(setExpenseCategories)
      .catch((err) => setError(err.message));
    api<Category[]>('/categories?kind=income')
      .then(setIncomeCategories)
      .catch((err) => setError(err.message));
    setExpensePurposes(loadExpensePurposes());
    setCashTypes(loadCashMovementTypes());
    setCatalogStamp((n) => n + 1);
  }, [refreshFieldDefs]);

  useEffect(loadLookups, [loadLookups]);

  useEffect(() => {
    const onCatalogChange = () => loadLookups();
    catalogChanged.addEventListener('change', onCatalogChange);
    return () => catalogChanged.removeEventListener('change', onCatalogChange);
  }, [loadLookups]);

  useEffect(() => {
    refreshFieldDefs();
  }, [refreshFieldDefs]);

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

  const cashSubtypes = useMemo(() => {
    if (draft.kind !== 'cash') return [];
    const typeId = Number(draft.movementTypeId);
    if (!Number.isFinite(typeId) || draft.movementTypeId === '') return [];
    return subtypesForType(typeId);
  }, [draft, catalogStamp]);

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
        const subs = typeId ? subtypesForType(Number(typeId)) : [];
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
        const cash = accountCashMovementStats(accountId, {
          excludeCashMovementId: excludeId,
        });
        return accountDisplayBalance(account, cash);
      },
    });
  }, [draft, accounts, editing]);

  const openNewWithKind = useCallback(
    (kind: TransactionKind) => {
      setEditing(null);
      setNewCategory('');
      setFormError('');
      if (kind === 'cash') {
        const types = loadCashMovementTypes();
        const firstType = types[0];
        const firstSub = firstType
          ? subtypesForType(firstType.id)[0]
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
    [accounts, expenseCategories, incomeCategories, expensePurposes]
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
      if (next === 'cash' && accounts.length < 1) return;

      setDraft((draft) => {
        const shared = {
          date: draft.date,
          amount: draft.amount,
          accountId: draft.accountId,
          comment: draft.comment,
        };

        if (next === 'cash') {
          const types = loadCashMovementTypes();
          const firstType = types[0];
          const firstSub = firstType
            ? subtypesForType(firstType.id)[0]
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
      resetCustomColumnUi,
    ]
  );

  const openEdit = useCallback((row: Transaction) => {
    setEditing(row);
    setNewCategory('');
    setFormError('');
    if (row.kind === 'cash') {
      const matchedType = findTypeByName(row.movementType ?? '');
      const matchedSubtype =
        matchedType && row.movementSubtype
          ? findSubtypeByName(matchedType.id, row.movementSubtype)
          : undefined;
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
  }, []);

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
          const type = loadCashMovementTypes().find((t) => t.id === typeId);
          const subtype = loadCashMovementSubtypes().find(
            (s) => s.id === subtypeId
          );
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
              const cash = accountCashMovementStats(accountId, {
                excludeCashMovementId: excludeId,
              });
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
          upsertCashMovement({
            id: editing?.kind === 'cash' ? editing.id : undefined,
            date: draft.date,
            amount: Number(draft.amount),
            accountId:
              initiatorAccountId > 0
                ? initiatorAccountId
                : receiverAccountId,
            comment: draft.comment,
            movementType: type.name,
            movementSubtype: subtype.name,
            initiatorAccountId,
            receiverAccountId,
          });
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
          const body = {
            date: draft.date,
            amount: Number(draft.amount),
            accountId: Number(draft.accountId),
            categoryId: Number(categoryId),
            comment: draft.comment,
            ...(draft.kind === 'expense' ? { country: '' } : { from: '' }),
          };

          const defs =
            draft.kind === 'expense' ? expenseFieldDefs : incomeFieldDefs;
          const validationError = validateCustomFieldValues(
            defs,
            draft.customFields
          );
          if (validationError) {
            throw new Error(validationError);
          }

          let entryId: number;
          if (editing && editing.kind !== 'cash') {
            await api(`${path}/${editing.id}`, { method: 'PUT', body });
            entryId = editing.id;
          } else {
            const created = await api<{ id: number }>(path, {
              method: 'POST',
              body,
            });
            entryId = created.id;
          }
          setCustomFieldValues(draft.kind, entryId, draft.customFields);
          if (draft.kind === 'expense') {
            setExpensePurpose(entryId, Number(draft.purposeId));
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
    ]
  );

  const goToCatalogSetup = useCallback(() => {
    setOpen(false);
  }, []);

  const remove = useCallback(
    async (row: Transaction) => {
      if (!confirm('Delete this transaction? This cannot be undone.')) return;
      try {
        if (row.kind === 'cash') {
          deleteCashMovement(row.id);
        } else {
          const path = row.kind === 'expense' ? '/expenses' : '/incomes';
          await api(`${path}/${row.id}`, { method: 'DELETE' });
          deleteCustomFieldValues(row.kind, row.id);
          if (row.kind === 'expense') {
            deleteExpensePurposeValue(row.id);
          }
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

  const syncFieldDefsFor = useCallback((appliesTo: 'expense' | 'income') => {
    if (appliesTo === 'expense') {
      setExpenseFieldDefs(loadCustomFieldDefinitions('expense'));
    } else {
      setIncomeFieldDefs(loadCustomFieldDefinitions('income'));
    }
  }, []);

  const applyCustomFieldDefinition = useCallback(
    (target: 'expense' | 'income', label: string, fieldType: CustomFieldType) => {
      if (target === 'expense') {
        setExpenseFieldDefs(
          addCustomFieldDefinition('expense', label, fieldType)
        );
      } else {
        setIncomeFieldDefs(
          addCustomFieldDefinition('income', label, fieldType)
        );
      }
    },
    []
  );

  const newColumnDuplicate = useMemo(() => {
    if (draft.kind === 'cash' || !newColumnLabel.trim()) return undefined;
    return findCustomFieldDuplicate(draft.kind, newColumnLabel);
  }, [draft.kind, newColumnLabel]);

  const editColumnDuplicate = useMemo(() => {
    if (draft.kind === 'cash' || editingColumnId == null || !editColumnLabel.trim()) {
      return undefined;
    }
    return findCustomFieldDuplicate(
      draft.kind,
      editColumnLabel,
      editingColumnId
    );
  }, [draft.kind, editingColumnId, editColumnLabel]);

  const addCustomColumn = useCallback(() => {
    if (draft.kind === 'cash') return;
    setCustomColumnMessage('');
    try {
      if (newColumnDuplicate) {
        throw new Error(
          `A column called “${newColumnDuplicate.label}” already exists.`
        );
      }
      applyCustomFieldDefinition(draft.kind, newColumnLabel, newColumnType);
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

  const saveEditCustomColumn = useCallback(() => {
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
      const saved = updateCustomFieldDefinition(
        editingColumnId,
        editColumnLabel,
        editColumnType
      );
      syncFieldDefsFor(saved.appliesTo);

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
    (def: CustomFieldDefinition) => {
      const scope = def.appliesTo === 'expense' ? 'expense' : 'income';
      if (
        !confirm(
          `Remove “${def.label}” from all ${scope} transactions? Saved values will be deleted.`
        )
      ) {
        return;
      }
      setCustomColumnMessage('');
      if (editingColumnId === def.id) {
        setEditingColumnId(null);
      }
      try {
        deleteCustomFieldDefinition(def.id);
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
    cashSubtypes,
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
