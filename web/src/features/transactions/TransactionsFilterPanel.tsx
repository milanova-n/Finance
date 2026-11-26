import { useCallback } from 'react';
import {
  GridLogicOperator,
  useGridApiContext,
  useGridRootProps,
} from '@mui/x-data-grid';
import type { GridFilterItem, GridFilterModel } from '@mui/x-data-grid';
import {
  GridFilterPanelBase,
  GridPanelFooter,
} from '@mui/x-data-grid/components';

/** Matches MUI `getGridFilter` (not exported from `@mui/x-data-grid/components`). */
function createFilterItemForColumn(col: {
  field: string;
  filterOperators?: ReadonlyArray<{ value: string }>;
}): GridFilterItem {
  return {
    field: col.field,
    operator: col.filterOperators![0].value,
    id: Math.round(Math.random() * 1e5),
  };
}

export type TransactionsFilterPanelProps = {
  filterModel: GridFilterModel;
  onFilterModelChange: (model: GridFilterModel) => void;
};

/** Community grid keeps one filter in state; this panel edits our external multi-filter model. */
export function TransactionsFilterPanel({
  filterModel,
  onFilterModelChange,
}: TransactionsFilterPanelProps) {
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();
  const BaseButton = rootProps.slots.baseButton;
  const AddIcon = rootProps.slots.filterPanelAddIcon;
  const RemoveAllIcon = rootProps.slots.filterPanelRemoveAllIcon;

  const handleAddFilter = useCallback(() => {
    const filterable = apiRef.current
      .getAllColumns()
      .filter((col) => col.filterable !== false);
    const usedFields = new Set(filterModel.items.map((item) => item.field));
    const nextColumn =
      filterable.find((col) => !usedFields.has(col.field)) ??
      filterable.find((col) => col.filterOperators?.length);
    if (!nextColumn?.filterOperators?.length) {
      return;
    }
    const newItem = createFilterItemForColumn(nextColumn);
    onFilterModelChange({
      ...filterModel,
      logicOperator: GridLogicOperator.And,
      items: [...filterModel.items, newItem],
    });
  }, [apiRef, filterModel, onFilterModelChange]);

  const handleRemoveAll = useCallback(() => {
    onFilterModelChange({
      items: [],
      logicOperator: GridLogicOperator.And,
    });
    apiRef.current.hideFilterPanel();
  }, [apiRef, onFilterModelChange]);

  const activeCount = filterModel.items.filter((item) => item.field).length;

  return (
    <GridFilterPanelBase
      filterModel={filterModel}
      onFilterModelChange={onFilterModelChange}
      onClose={() => apiRef.current.hideFilterPanel()}
      logicOperators={[GridLogicOperator.And]}
      disableDebounce
    >
      <GridPanelFooter>
        <BaseButton
          onClick={handleAddFilter}
          startIcon={<AddIcon />}
          {...rootProps.slotProps?.baseButton}
        >
          {apiRef.current.getLocaleText('filterPanelAddFilter')}
        </BaseButton>
        {activeCount > 0 ? (
          <BaseButton
            onClick={handleRemoveAll}
            startIcon={<RemoveAllIcon />}
            {...rootProps.slotProps?.baseButton}
          >
            {apiRef.current.getLocaleText('filterPanelRemoveAll')}
          </BaseButton>
        ) : null}
      </GridPanelFooter>
    </GridFilterPanelBase>
  );
}
