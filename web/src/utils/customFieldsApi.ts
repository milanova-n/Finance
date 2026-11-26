import { api } from '../services/api';
import type { CustomFieldDefinition, CustomFieldType } from '../types';

export async function fetchCustomFieldDefinitions(
  appliesTo: 'expense' | 'income'
): Promise<CustomFieldDefinition[]> {
  return api<CustomFieldDefinition[]>(
    `/custom-field-definitions?appliesTo=${appliesTo}`
  );
}

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return base || 'field';
}

export function findCustomFieldDuplicate(
  defs: CustomFieldDefinition[],
  appliesTo: 'expense' | 'income',
  label: string,
  excludeId?: number
): CustomFieldDefinition | undefined {
  const trimmed = label.trim();
  if (!trimmed) return undefined;
  const key = slugify(trimmed);
  const norm = trimmed.toLowerCase();
  return defs.find(
    (d) =>
      d.id !== excludeId &&
      d.appliesTo === appliesTo &&
      (d.fieldKey === key || d.label.trim().toLowerCase() === norm)
  );
}

export async function addCustomFieldDefinition(
  appliesTo: 'expense' | 'income',
  label: string,
  fieldType: CustomFieldType
): Promise<CustomFieldDefinition> {
  return api<CustomFieldDefinition>('/custom-field-definitions', {
    method: 'POST',
    body: { appliesTo, label, fieldType },
  });
}

export async function updateCustomFieldDefinition(
  id: number,
  label: string,
  fieldType: CustomFieldType
): Promise<CustomFieldDefinition> {
  return api<CustomFieldDefinition>(`/custom-field-definitions/${id}`, {
    method: 'PUT',
    body: { label, fieldType },
  });
}

export async function deleteCustomFieldDefinition(id: number) {
  await api(`/custom-field-definitions/${id}`, { method: 'DELETE' });
}

export function validateCustomFieldValues(
  defs: CustomFieldDefinition[],
  values: Record<string, string>
): string | null {
  for (const def of defs) {
    const raw = values[def.fieldKey]?.trim() ?? '';
    if (!raw) continue;

    if (def.fieldType === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `“${def.label}” must be a valid date (YYYY-MM-DD).`;
    }
    if (def.fieldType === 'number' && !Number.isFinite(Number(raw))) {
      return `“${def.label}” must be a number.`;
    }
    if (def.fieldType === 'boolean' && raw !== 'true' && raw !== 'false') {
      return `“${def.label}” must be Yes or No.`;
    }
  }
  return null;
}
