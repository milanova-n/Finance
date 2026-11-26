import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { api } from '../../services/api';
import { catalogChanged, notifyCatalogChanged } from '../../utils/catalogEvents';
import type { Category, ExpensePurpose } from '../../types';
import {
  addExpensePurpose,
  deleteExpensePurpose,
  fetchExpensePurposes,
  renameExpensePurpose,
} from '../../utils/expensePurposeCatalog';
import {
  addCashMovementSubtype,
  addCashMovementType,
  deleteCashMovementSubtype,
  deleteCashMovementType,
  fetchCashMovementSubtypes,
  fetchCashMovementTypes,
  renameCashMovementSubtype,
  renameCashMovementType,
  subtypesForType,
  type CashMovementSubtype,
  type CashMovementType,
} from '../../utils/cashMovementCatalog';
import { CatalogNameList } from './CatalogNameList';

export type CatalogFocus =
  | 'expense-categories'
  | 'income-categories'
  | 'expense-purposes'
  | 'cash-movement-types';

const TAB_INDEX: Record<CatalogFocus, number> = {
  'expense-categories': 0,
  'income-categories': 1,
  'expense-purposes': 2,
  'cash-movement-types': 3,
};

function TabPanel({
  index,
  active,
  children,
}: {
  index: number;
  active: number;
  children: ReactNode;
}) {
  if (active !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export function SettingsCatalogSection() {
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus') as CatalogFocus | null;
  const [tab, setTab] = useState(
    focusParam && focusParam in TAB_INDEX ? TAB_INDEX[focusParam] : 0
  );

  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expensePurposes, setExpensePurposes] = useState<ExpensePurpose[]>([]);
  const [cashTypes, setCashTypes] = useState<CashMovementType[]>([]);
  const [cashSubtypes, setCashSubtypes] = useState<CashMovementSubtype[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [error, setError] = useState('');

  const bumpLocalCatalog = useCallback(() => {
    setCatalogRevision((n) => n + 1);
  }, []);

  const selectedType = useMemo(
    () => cashTypes.find((t) => String(t.id) === selectedTypeId),
    [cashTypes, selectedTypeId]
  );
  const subtypes = useMemo(
    () =>
      selectedType ? subtypesForType(cashSubtypes, selectedType.id) : [],
    [selectedType, cashSubtypes, catalogRevision]
  );

  const reloadPurposes = useCallback(async () => {
    setExpensePurposes(await fetchExpensePurposes());
    bumpLocalCatalog();
  }, [bumpLocalCatalog]);

  const reloadServerCatalogs = useCallback(async () => {
    const [expense, income] = await Promise.all([
      api<Category[]>('/categories?kind=expense'),
      api<Category[]>('/categories?kind=income'),
    ]);
    setExpenseCategories(expense);
    setIncomeCategories(income);
  }, []);

  const reloadCashCatalog = useCallback(async () => {
    const [types, subtypes] = await Promise.all([
      fetchCashMovementTypes(),
      fetchCashMovementSubtypes(),
    ]);
    setCashTypes(types);
    setCashSubtypes(subtypes);
    setSelectedTypeId((prev) => {
      if (prev && types.some((t) => String(t.id) === prev)) return prev;
      return types[0] ? String(types[0].id) : '';
    });
    bumpLocalCatalog();
  }, [bumpLocalCatalog]);

  const reloadAll = useCallback(async () => {
    await reloadServerCatalogs();
    await reloadPurposes();
    await reloadCashCatalog();
  }, [reloadServerCatalogs, reloadPurposes, reloadCashCatalog]);

  useEffect(() => {
    reloadAll().catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not load labels.')
    );
  }, [reloadAll]);

  useEffect(() => {
    const onExternalChange = () => {
      void reloadAll();
    };
    catalogChanged.addEventListener('change', onExternalChange);
    return () =>
      catalogChanged.removeEventListener('change', onExternalChange);
  }, [reloadAll]);

  useEffect(() => {
    if (focusParam && focusParam in TAB_INDEX) {
      setTab(TAB_INDEX[focusParam]);
    }
  }, [focusParam]);

  const publishChange = useCallback(() => {
    notifyCatalogChanged();
  }, []);

  const renameCategory = async (id: number, name: string) => {
    await api(`/categories/${id}`, { method: 'PUT', body: { name } });
    await reloadServerCatalogs();
    publishChange();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        These labels populate dropdowns when you add transactions.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_e, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Expense categories" />
        <Tab label="Income categories" />
        <Tab label="Expense purposes" />
        <Tab label="Cash movements" />
      </Tabs>

      <TabPanel index={0} active={tab}>
        <CatalogNameList
          title="Expense categories"
          description="How you group spending."
          items={expenseCategories}
          onAdd={async (name) => {
            await api('/categories', {
              method: 'POST',
              body: { name, kind: 'expense' },
            });
            await reloadServerCatalogs();
            publishChange();
          }}
          onRename={renameCategory}
          onDelete={async (id) => {
            await api(`/categories/${id}`, { method: 'DELETE' });
            await reloadServerCatalogs();
            publishChange();
          }}
        />
      </TabPanel>

      <TabPanel index={1} active={tab}>
        <CatalogNameList
          title="Income categories"
          description="Where money comes from."
          items={incomeCategories}
          onAdd={async (name) => {
            await api('/categories', {
              method: 'POST',
              body: { name, kind: 'income' },
            });
            await reloadServerCatalogs();
            publishChange();
          }}
          onRename={renameCategory}
          onDelete={async (id) => {
            await api(`/categories/${id}`, { method: 'DELETE' });
            await reloadServerCatalogs();
            publishChange();
          }}
        />
      </TabPanel>

      <TabPanel index={2} active={tab}>
        <CatalogNameList
          title="Expense purposes"
          description="What an expense is for."
          items={expensePurposes}
          onAdd={async (name) => {
            await addExpensePurpose(name);
            await reloadPurposes();
            publishChange();
          }}
          onRename={async (id, name) => {
            await renameExpensePurpose(id, name);
            await reloadPurposes();
            publishChange();
          }}
          onDelete={async (id) => {
            await deleteExpensePurpose(id);
            await reloadPurposes();
            publishChange();
          }}
        />
      </TabPanel>

      <TabPanel index={3} active={tab}>
        <Stack spacing={2}>
          <CatalogNameList
            title="Cash movement types"
            description="High-level transfer kinds."
            items={cashTypes}
            onAdd={async (name) => {
              await addCashMovementType(name);
              await reloadCashCatalog();
              publishChange();
            }}
            onRename={async (id, name) => {
              await renameCashMovementType(id, name);
              await reloadCashCatalog();
              publishChange();
            }}
            onDelete={async (id) => {
              await deleteCashMovementType(id);
              if (String(id) === selectedTypeId) setSelectedTypeId('');
              await reloadCashCatalog();
              publishChange();
            }}
          />

          <TextField
            select
            label="Cash movement type"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            size="small"
            sx={{ maxWidth: 320 }}
            helperText="Subtypes below belong to this type."
          >
            {cashTypes.length === 0 ? (
              <MenuItem value="" disabled>
                Add a type first
              </MenuItem>
            ) : (
              cashTypes.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.name}
                </MenuItem>
              ))
            )}
          </TextField>

          <CatalogNameList
            key={selectedTypeId || 'no-type'}
            title={
              selectedType
                ? `Subtypes for “${selectedType.name}”`
                : 'Cash movement subtypes'
            }
            description="Pick a type, then manage subtypes."
            items={subtypes}
            onAdd={async (name) => {
              if (!selectedType) {
                throw new Error('Select a cash movement type first.');
              }
              await addCashMovementSubtype(selectedType.id, name);
              await reloadCashCatalog();
              publishChange();
            }}
            onRename={async (id, name) => {
              await renameCashMovementSubtype(id, name);
              await reloadCashCatalog();
              publishChange();
            }}
            onDelete={async (id) => {
              await deleteCashMovementSubtype(id);
              await reloadCashCatalog();
              publishChange();
            }}
            addLabel="Add subtype"
          />
        </Stack>
      </TabPanel>
    </Stack>
  );
}