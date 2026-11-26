import type { Dispatch, SetStateAction } from 'react';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CustomFieldDefinition, CustomFieldType } from '../../types';
import { CUSTOM_FIELD_TYPES } from '../../types';
import { FormGridFull } from '../../styles/shared.styles';
import { CustomFieldValueInput } from './CustomFieldValueInput';
import type { Draft } from './types';

export type CustomColumnsFormSlice = {
  newLabel: string;
  setNewLabel: (value: string) => void;
  newType: CustomFieldType;
  setNewType: (value: CustomFieldType) => void;
  newDuplicate: CustomFieldDefinition | undefined;
  addColumn: () => void;
  editingId: number | null;
  editLabel: string;
  setEditLabel: (value: string) => void;
  editType: CustomFieldType;
  setEditType: (value: CustomFieldType) => void;
  editDuplicate: CustomFieldDefinition | undefined;
  startEdit: (def: CustomFieldDefinition) => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  removeColumn: (def: CustomFieldDefinition) => void;
  message: string;
};

type Props = {
  draft: Draft;
  fieldDefs: CustomFieldDefinition[];
  setDraft: Dispatch<SetStateAction<Draft>>;
  columns: CustomColumnsFormSlice;
};

function ColumnTypeSelect({
  value,
  onChange,
  label = 'Type',
}: {
  value: CustomFieldType;
  onChange: (value: CustomFieldType) => void;
  label?: string;
}) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as CustomFieldType)}
      size="small"
      sx={{ minWidth: { sm: 130 } }}
    >
      {CUSTOM_FIELD_TYPES.map((t) => (
        <MenuItem key={t.value} value={t.value}>
          {t.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function TransactionFormCustomColumns({
  draft,
  fieldDefs,
  setDraft,
  columns,
}: Props) {
  if (draft.kind === 'cash') return null;

  const {
    newLabel,
    setNewLabel,
    newType,
    setNewType,
    newDuplicate,
    addColumn,
    editingId,
    editLabel,
    setEditLabel,
    editType,
    setEditType,
    editDuplicate,
    startEdit,
    cancelEdit,
    saveEdit,
    removeColumn,
    message,
  } = columns;

  return (
    <>
      {fieldDefs.length > 0 && (
        <FormGridFull>
          <Typography variant="body2" color="text.secondary">
            Extra fields
          </Typography>
        </FormGridFull>
      )}

      {fieldDefs.map((def) =>
        editingId === def.id ? (
          <FormGridFull key={def.id}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'flex-start' } }}
            >
              <TextField
                label="Field name"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                size="small"
                fullWidth
                error={Boolean(editDuplicate)}
                helperText={
                  editDuplicate
                    ? `Already used: “${editDuplicate.label}”.`
                    : ' '
                }
              />
              <ColumnTypeSelect value={editType} onChange={setEditType} />
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexShrink: 0, pt: { sm: 0.25 } }}
              >
                <Button
                  type="button"
                  size="small"
                  variant="contained"
                  onClick={saveEdit}
                  disabled={Boolean(editDuplicate) || !editLabel.trim()}
                >
                  Done
                </Button>
                <Button type="button" size="small" onClick={cancelEdit}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </FormGridFull>
        ) : (
          <Stack
            key={def.id}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'flex-end' }, gridColumn: '1 / -1' }}
          >
            <Stack direction="row" spacing={1} sx={{ flex: 1, width: '100%' }}>
              <CustomFieldValueInput
                def={def}
                value={draft.customFields[def.fieldKey] ?? ''}
                onChange={(next) =>
                  setDraft((d) => {
                    if (d.kind === 'cash') return d;
                    return {
                      ...d,
                      customFields: { ...d.customFields, [def.fieldKey]: next },
                    };
                  })
                }
              />
            </Stack>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ flexShrink: 0, pb: 0.25 }}
            >
              <Button type="button" size="small" onClick={() => startEdit(def)}>
                Edit
              </Button>
              <Button
                type="button"
                size="small"
                color="error"
                onClick={() => removeColumn(def)}
              >
                Remove
              </Button>
            </Stack>
          </Stack>
        )
      )}

      <FormGridFull>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {fieldDefs.length === 0 ? 'Extra fields' : 'Add another field'}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'flex-start' } }}
        >
          <TextField
            label="Field name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            size="small"
            fullWidth
            placeholder={
              draft.kind === 'expense' ? 'Country' : 'Invoice number'
            }
            error={Boolean(newDuplicate)}
            helperText={
              newDuplicate ? `Already used: “${newDuplicate.label}”.` : ' '
            }
          />
          <ColumnTypeSelect value={newType} onChange={setNewType} />
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={addColumn}
            disabled={Boolean(newDuplicate) || !newLabel.trim()}
            sx={{ flexShrink: 0, mt: { sm: 0.25 } }}
          >
            Add
          </Button>
        </Stack>
        {message && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mt: 1 }}
          >
            {message}
          </Typography>
        )}
      </FormGridFull>
    </>
  );
}
