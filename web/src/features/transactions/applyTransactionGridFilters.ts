import type { RefObject } from 'react';
import {
  getGridDefaultColumnTypes,
  type GridApi,
  type GridColDef,
  type GridFilterItem,
  type GridFilterModel,
  type GridFilterOperator,
  GridLogicOperator,
  type GridValidRowModel,
} from '@mui/x-data-grid';

function getColumnFilterOperators<R extends GridValidRowModel>(
  colDef: GridColDef<R>
) {
  if (colDef.filterOperators?.length) {
    return colDef.filterOperators;
  }
  const type = colDef.type ?? 'string';
  const defaults = getGridDefaultColumnTypes();
  const columnType =
    type in defaults
      ? defaults[type as keyof typeof defaults]
      : defaults.string;
  return columnType.filterOperators ?? defaults.string.filterOperators;
}

function getRowValueForFilter<R extends GridValidRowModel>(
  row: R,
  colDef: GridColDef<R>,
  apiRef: RefObject<GridApi | null>
) {
  const raw = row[colDef.field as keyof R];
  if (colDef.valueGetter) {
    return colDef.valueGetter(
      raw as never,
      row,
      colDef,
      apiRef as unknown as Parameters<
        NonNullable<GridColDef<R>['valueGetter']>
      >[3]
    );
  }
  return raw;
}

function buildPredicate<R extends GridValidRowModel>(
  item: GridFilterItem,
  colDef: GridColDef<R>,
  apiRef: RefObject<GridApi | null>
): ((row: R) => boolean) | null {
  const operators = getColumnFilterOperators(colDef) ?? [];
  const operator = operators.find(
    (op: GridFilterOperator) => op.value === item.operator
  );
  if (!operator) {
    return null;
  }
  const apply = operator.getApplyFilterFn(item, colDef);
  if (!apply) {
    return null;
  }
  const api = apiRef as unknown as Parameters<typeof apply>[3];
  return (row: R) =>
    apply(getRowValueForFilter(row, colDef, apiRef), row, colDef, api);
}

export function filterTransactionGridRows<R extends GridValidRowModel>(
  rows: R[],
  columns: GridColDef<R>[],
  filterModel: GridFilterModel,
  apiRef: RefObject<GridApi | null>
): R[] {
  const activeItems = filterModel.items.filter(
    (item) => item.field && item.operator
  );
  if (activeItems.length === 0) {
    return rows;
  }

  const columnByField = new Map(columns.map((col) => [col.field, col]));
  const predicates: Array<(row: R) => boolean> = [];

  for (const item of activeItems) {
    const colDef = columnByField.get(item.field);
    if (!colDef || colDef.filterable === false) {
      continue;
    }
    const predicate = buildPredicate(item, colDef, apiRef);
    if (predicate) {
      predicates.push(predicate);
    }
  }

  if (predicates.length === 0) {
    return rows;
  }

  const useOr = filterModel.logicOperator === GridLogicOperator.Or;
  return rows.filter((row) =>
    useOr ? predicates.some((fn) => fn(row)) : predicates.every((fn) => fn(row))
  );
}
