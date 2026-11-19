import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { CustomFieldDefinition } from '../../types';

type Props = {
  def: CustomFieldDefinition;
  value: string;
  onChange: (next: string) => void;
};

export function CustomFieldValueInput({ def, value, onChange }: Props) {
  if (def.fieldType === 'boolean') {
    return (
      <TextField
        select
        label={def.label}
        value={value === 'true' || value === 'false' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
      >
        <MenuItem value="">—</MenuItem>
        <MenuItem value="true">Yes</MenuItem>
        <MenuItem value="false">No</MenuItem>
      </TextField>
    );
  }

  if (def.fieldType === 'date') {
    return (
      <TextField
        label={def.label}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}

      />
    );
  }

  return (
    <TextField
      label={def.label}
      type={def.fieldType === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      slotProps={
        def.fieldType === 'number'
          ? { htmlInput: { step: 'any' } }
          : undefined
      }
    />
  );
}
