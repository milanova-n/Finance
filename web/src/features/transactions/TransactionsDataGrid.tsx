import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import {
  ColumnsPanelTrigger,
  DataGrid,
  FilterPanelTrigger,
  Toolbar,
  GridLogicOperator,
  useGridApiRef,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridFilterModel,
  type GridRenderCellParams,
} from '@mui/x-data-grid';
import { money, parseIsoDateLocal, shortDate } from '../../utils/format';
import type {
  CustomFieldDefinition,
  Transaction,
  TransactionKind,
  TransactionView,
} from '../../types';
import { CUSTOM_FIELD_TYPES, TRANSACTION_KIND_LABELS } from '../../types';
import { Amount, CategoryChip, RowActions } from '../../styles/shared.styles';
import { filterTransactionGridRows } from './applyTransactionGridFilters';
import { TransactionsFilterPanel } from './TransactionsFilterPanel';

function formatGridDateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return shortDate(`${y}-${m}-${d}`);
  }
  return '—';
}

function customFieldColumnId(
  appliesTo: 'expense' | 'income',
  fieldKey: string
) {
  return `cf_${appliesTo}_${fieldKey}`;
}

function displayCustomFieldValue(
  def: CustomFieldDefinition,
  raw: string
): string {
  if (!raw.trim()) return '—';
  if (def.fieldType === 'boolean') {
    return raw === 'true' ? 'Yes' : raw === 'false' ? 'No' : '—';
  }
  if (def.fieldType === 'date') {
    return shortDate(raw);
  }
  return raw;
}

function defaultVisibilityForView(
  view: TransactionView
): GridColumnVisibilityModel {
  const model: GridColumnVisibilityModel = {};
  if (view === 'all') {
    model.movementType = false;
    model.movementSubtype = false;
  }
  if (view === 'cash') {
    model.accountName = false;
  }
  model.recordSeq = false;
  return model;
}

function sanitizeVisibilityModel(
  model: GridColumnVisibilityModel,
  allowedFields: Set<string>
): GridColumnVisibilityModel {
  const next: GridColumnVisibilityModel = {};
  for (const [field, visible] of Object.entries(model)) {
    if (allowedFields.has(field)) {
      next[field] = visible;
    }
  }
  return next;
}

function readVisibility(key: string): GridColumnVisibilityModel | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as GridColumnVisibilityModel;
  } catch {
    return undefined;
  }
}

function writeVisibility(key: string, model: GridColumnVisibilityModel) {
  try {
    localStorage.setItem(key, JSON.stringify(model));
  } catch {
    /* ignore */
  }
}

const EMPTY_FILTER_MODEL: GridFilterModel = {
  items: [],
  logicOperator: GridLogicOperator.And,
};

function readFilterModel(key: string): GridFilterModel | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as GridFilterModel;
    if (!parsed || !Array.isArray(parsed.items)) return undefined;
    return {
      ...parsed,
      logicOperator: GridLogicOperator.And,
    };
  } catch {
    return undefined;
  }
}

function writeFilterModel(key: string, model: GridFilterModel) {
  try {
    localStorage.setItem(key, JSON.stringify(model));
  } catch {
    /* ignore */
  }
}

function sanitizeFilterModel(
  model: GridFilterModel,
  allowedFields: Set<string>
): GridFilterModel {
  return {
    logicOperator: GridLogicOperator.And,
    items: model.items.filter((item) => allowedFields.has(item.field)),
  };
}

export type TransactionGridRow = {
  id: string;
  transaction: Transaction;
  date: string;
  kind: TransactionKind;
  typeLabel: string;
  accountName: string;
  categoryName: string;
  comment: string;
  amount: number;
  currency: string;
  movementType: string;
  movementSubtype: string;
  initiatorAccountName: string;
  receiverAccountName: string;
  /** Higher = added more recently (tiebreaker when dates match). */
  recordSeq: number;
};

function buildGridRows(
  transactions: Transaction[],
  expenseFieldDefs: CustomFieldDefinition[],
  incomeFieldDefs: CustomFieldDefinition[],
  view: TransactionView
): TransactionGridRow[] {
  const includeExpenseFields = view === 'expenses';
  const includeIncomeFields = view === 'income';

  const total = transactions.length;
  return transactions.map((tx, index) => {
    const base: Record<string, unknown> = {
      id: `${tx.kind}-${tx.id}`,
      transaction: tx,
      date: tx.date,
      recordSeq: total - index,
      kind: tx.kind,
      typeLabel: TRANSACTION_KIND_LABELS[tx.kind],
      accountName: tx.accountName,
      categoryName: tx.categoryName ?? '',
      comment: tx.comment,
      amount: tx.amount,
      currency: tx.currency,
      movementType: tx.movementType ?? '',
      movementSubtype: tx.movementSubtype ?? '',
      initiatorAccountName: tx.initiatorAccountName ?? '',
      receiverAccountName: tx.receiverAccountName ?? '',
    };

    if (includeExpenseFields) {
      for (const def of expenseFieldDefs) {
        const col = customFieldColumnId('expense', def.fieldKey);
        base[col] =
          tx.kind === 'expense' ? (tx.customFields[def.fieldKey] ?? '') : '';
      }
    }
    if (includeIncomeFields) {
      for (const def of incomeFieldDefs) {
        const col = customFieldColumnId('income', def.fieldKey);
        base[col] =
          tx.kind === 'income' ? (tx.customFields[def.fieldKey] ?? '') : '';
      }
    }

    return base as TransactionGridRow;
  });
}

function TransactionsToolbar() {
  return (
    <Toolbar>
      <Stack direction="row" spacing={0.5} sx={{ p: 1, flexWrap: 'wrap' }}>
        <ColumnsPanelTrigger />
        <FilterPanelTrigger />
      </Stack>
    </Toolbar>
  );
}

type TransactionsDataGridProps = {
  view: TransactionView;
  rows: Transaction[];
  expenseFieldDefs: CustomFieldDefinition[];
  incomeFieldDefs: CustomFieldDefinition[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
};

export function TransactionsDataGrid({
  view,
  rows,
  expenseFieldDefs,
  incomeFieldDefs,
  onEdit,
  onDelete,
}: TransactionsDataGridProps) {
  const apiRef = useGridApiRef();
  const visibilityKey = `myfi:txGridVisibility:${view}`;
  const filterKey = `myfi:txGridFilter:${view}`;

  const gridRows = useMemo(
    () => buildGridRows(rows, expenseFieldDefs, incomeFieldDefs, view),
    [rows, expenseFieldDefs, incomeFieldDefs, view]
  );

  const columns = useMemo((): GridColDef<TransactionGridRow>[] => {
    const cols: GridColDef<TransactionGridRow>[] = [
      {
        field: 'date',
        headerName: 'Date',
        type: 'date',
        width: 118,
        valueGetter: (_value, row) => parseIsoDateLocal(row.date),
        valueFormatter: (value) => formatGridDateValue(value),
        sortComparator: (_v1, _v2, cp1, cp2) => {
          const t1 = cp1?.api.getRow(cp1.id) as TransactionGridRow | null;
          const t2 = cp2?.api.getRow(cp2.id) as TransactionGridRow | null;
          if (!t1 || !t2) return 0;
          if (t1.date !== t2.date) {
            return t1.date < t2.date ? 1 : -1;
          }
          return t2.recordSeq - t1.recordSeq;
        },
      },
      {
        field: 'recordSeq',
        headerName: 'Added',
        type: 'number',
        width: 0,
        minWidth: 0,
        maxWidth: 0,
        sortable: true,
        filterable: false,
        disableColumnMenu: true,
        renderCell: () => null,
      },
    ];

    if (view === 'all') {
      cols.push({
        field: 'typeLabel',
        headerName: 'Type',
        width: 130,
        renderCell: (params) => (
          <Chip label={params.value as string} size="small" />
        ),
      });
    }

    if (view !== 'cash') {
      cols.push({
        field: 'accountName',
        headerName: 'Account',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          if (params.row.kind === 'cash') return '—';
          return params.value as string;
        },
      });
    }

    if (view !== 'cash') {
      cols.push({
        field: 'categoryName',
        headerName: 'Category',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const tx = params.row.transaction;
          if (!params.value) return '—';
          return (
            <CategoryChip
              label={String(params.value)}
              size="small"
              flow={
                tx.kind === 'income'
                  ? 'earn'
                  : undefined
              }
            />
          );
        },
      });
    }

    if (view === 'all' || view === 'cash') {
      cols.push(
        {
          field: 'movementType',
          headerName: 'Movement type',
          width: 130,
        },
        {
          field: 'movementSubtype',
          headerName: 'Subtype',
          width: 120,
        }
      );
    }

    if (view === 'cash') {
      cols.push(
        {
          field: 'initiatorAccountName',
          headerName: 'From',
          width: 120,
        },
        {
          field: 'receiverAccountName',
          headerName: 'To',
          width: 120,
        }
      );
    }

    const addCustomColumns = (
      defs: CustomFieldDefinition[],
      appliesTo: 'expense' | 'income'
    ) => {
      for (const def of defs) {
        const field = customFieldColumnId(appliesTo, def.fieldKey);
        const typeLabel =
          CUSTOM_FIELD_TYPES.find((t) => t.value === def.fieldType)?.label ??
          def.fieldType;
        const colDef: GridColDef<TransactionGridRow> = {
          field,
          headerName: def.label,
          description: `${typeLabel} · hide via Columns in the toolbar`,
          flex: 1,
          minWidth: 130,
          valueFormatter: (value) =>
            def.fieldType === 'date'
              ? formatGridDateValue(value)
              : displayCustomFieldValue(def, String(value ?? '')),
          renderHeader: () => (
            <Box sx={{ lineHeight: 1.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {def.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {typeLabel}
              </Typography>
            </Box>
          ),
        };
        if (def.fieldType === 'date') {
          colDef.type = 'date';
          colDef.valueGetter = (_value, row) => {
            const raw = row[field as keyof TransactionGridRow];
            return typeof raw === 'string'
              ? parseIsoDateLocal(raw)
              : null;
          };
        }
        cols.push(colDef);
      }
    };

    if (view === 'expenses') {
      addCustomColumns(expenseFieldDefs, 'expense');
    }
    if (view === 'income') {
      addCustomColumns(incomeFieldDefs, 'income');
    }

    cols.push(
      {
        field: 'comment',
        headerName: 'Comment',
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={String(params.value ?? '')}
          >
            {(params.value as string) || '—'}
          </Typography>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        type: 'number',
        valueFormatter: (_value, row) =>
          money(row.amount, row.currency),
        renderCell: (params: GridRenderCellParams<TransactionGridRow>) => {
          const tx = params.row.transaction;
          const flow =
            tx.kind === 'income'
              ? 'earn'
              : tx.kind === 'expense'
                ? 'spend'
                : tx.kind === 'adjustment'
                  ? tx.amount >= 0
                    ? 'earn'
                    : 'spend'
                  : undefined;
          const displayAmount =
            tx.kind === 'adjustment' ? tx.amount : tx.amount;
          return (
            <Amount component="span" flow={flow} strong>
              {money(displayAmount, tx.currency)}
            </Amount>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 148,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        headerAlign: 'center',
        renderCell: (params) => {
          const tx = params.row.transaction;
          return (
            <RowActions>
              <Button size="small" onClick={() => onEdit(tx)} disabled={tx.kind === 'adjustment'}>
                Edit
              </Button>
              <Button size="small" color="error" onClick={() => onDelete(tx)} disabled={tx.kind === 'adjustment'}>
                Delete
              </Button>
            </RowActions>
          );
        },
      }
    );

    return cols;
  }, [view, expenseFieldDefs, incomeFieldDefs, onEdit, onDelete]);

  const columnFields = useMemo(
    () => new Set(columns.map((col) => col.field)),
    [columns]
  );

  const mergeVisibility = useCallback(() => {
    const saved = readVisibility(visibilityKey);
    const merged = {
      ...defaultVisibilityForView(view),
      ...saved,
    };
    return sanitizeVisibilityModel(merged, columnFields);
  }, [view, visibilityKey, columnFields]);

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({});

  const mergeFilterModel = useCallback(() => {
    const saved = readFilterModel(filterKey);
    if (!saved) return EMPTY_FILTER_MODEL;
    return sanitizeFilterModel(saved, columnFields);
  }, [filterKey, columnFields]);

  const [filterModel, setFilterModel] =
    useState<GridFilterModel>(EMPTY_FILTER_MODEL);

  useEffect(() => {
    setColumnVisibilityModel(mergeVisibility());
  }, [mergeVisibility]);

  useEffect(() => {
    setFilterModel(mergeFilterModel());
  }, [mergeFilterModel]);

  const handleFilterModelChange = useCallback(
    (model: GridFilterModel) => {
      const sanitized = sanitizeFilterModel(
        { ...model, logicOperator: GridLogicOperator.And },
        columnFields
      );
      setFilterModel(sanitized);
      writeFilterModel(filterKey, sanitized);
    },
    [filterKey, columnFields]
  );

  const displayedRows = useMemo(
    () =>
      filterTransactionGridRows(
        gridRows,
        columns,
        filterModel,
        apiRef
      ),
    [gridRows, columns, filterModel, apiRef]
  );

  const handleVisibilityChange = useCallback(
    (model: GridColumnVisibilityModel) => {
      const sanitized = sanitizeVisibilityModel(model, columnFields);
      setColumnVisibilityModel(sanitized);
      writeVisibility(visibilityKey, sanitized);
    },
    [visibilityKey, columnFields]
  );

  const ToolbarSlot = useCallback(() => <TransactionsToolbar />, []);

  const FilterPanelSlot = useCallback(
    () => (
      <TransactionsFilterPanel
        filterModel={filterModel}
        onFilterModelChange={handleFilterModelChange}
      />
    ),
    [filterModel, handleFilterModelChange]
  );

  return (
    <Box
      sx={{
        width: '100%',
        '& .MuiDataGrid-root': {
          border: 'none',
        },
      }}
    >
      <DataGrid
        apiRef={apiRef}
        rows={displayedRows}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={handleVisibilityChange}
        filterModel={EMPTY_FILTER_MODEL}
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          density: 'standard',
          pagination: { paginationModel: { pageSize: 25 } },
          sorting: {
            sortModel: [
              { field: 'date', sort: 'desc' },
              { field: 'recordSeq', sort: 'desc' },
            ],
          },
        }}
        slots={{
          toolbar: ToolbarSlot,
          filterPanel: FilterPanelSlot,
        }}
        sx={(theme) => ({
          minHeight: 420,
          bgcolor: 'background.paper',
          borderRadius: `${theme.shape.borderRadius}px`,
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: theme.app?.sunken ?? theme.palette.action.hover,
          },
        })}
      />
    </Box>
  );
}
