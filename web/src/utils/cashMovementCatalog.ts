import { api } from '../services/api';
import { DEFAULT_CASH_MOVEMENT_CATALOG } from './catalogDefaults';

export type CashMovementType = { id: number; name: string };
export type CashMovementSubtype = { id: number; typeId: number; name: string };

export async function fetchCashMovementTypes(): Promise<CashMovementType[]> {
  return api<CashMovementType[]>('/cash-movement-types');
}

export async function fetchCashMovementSubtypes(
  typeId?: number
): Promise<CashMovementSubtype[]> {
  const qs = typeId != null ? `?typeId=${typeId}` : '';
  return api<CashMovementSubtype[]>(`/cash-movement-subtypes${qs}`);
}

export function subtypesForType(
  subtypes: CashMovementSubtype[],
  typeId: number
): CashMovementSubtype[] {
  return subtypes
    .filter((s) => s.typeId === typeId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCashMovementType(
  name: string
): Promise<CashMovementType> {
  return api<CashMovementType>('/cash-movement-types', {
    method: 'POST',
    body: { name },
  });
}

export async function renameCashMovementType(id: number, name: string) {
  return api<CashMovementType>(`/cash-movement-types/${id}`, {
    method: 'PUT',
    body: { name },
  });
}

export async function deleteCashMovementType(id: number) {
  await api(`/cash-movement-types/${id}`, { method: 'DELETE' });
}

export async function addCashMovementSubtype(
  typeId: number,
  name: string
): Promise<CashMovementSubtype> {
  return api<CashMovementSubtype>('/cash-movement-subtypes', {
    method: 'POST',
    body: { typeId, name },
  });
}

export async function renameCashMovementSubtype(id: number, name: string) {
  return api<CashMovementSubtype>(`/cash-movement-subtypes/${id}`, {
    method: 'PUT',
    body: { name },
  });
}

export async function deleteCashMovementSubtype(id: number) {
  await api(`/cash-movement-subtypes/${id}`, { method: 'DELETE' });
}

export function findTypeByName(
  types: CashMovementType[],
  name: string
): CashMovementType | undefined {
  const norm = name.trim().toLowerCase();
  return types.find((t) => t.name.toLowerCase() === norm);
}

export function findSubtypeByName(
  subtypes: CashMovementSubtype[],
  typeId: number,
  name: string
): CashMovementSubtype | undefined {
  const norm = name.trim().toLowerCase();
  return subtypes
    .filter((s) => s.typeId === typeId)
    .find((s) => s.name.toLowerCase() === norm);
}

/** Creates default types/subtypes on the server when the user has none. */
export async function seedDefaultCashMovementCatalog(): Promise<number> {
  const types = await fetchCashMovementTypes();
  if (types.length > 0) return 0;

  let added = 0;
  for (const row of DEFAULT_CASH_MOVEMENT_CATALOG) {
    const type = await addCashMovementType(row.type);
    added += 1;
    for (const subtypeName of row.subtypes) {
      await addCashMovementSubtype(type.id, subtypeName);
      added += 1;
    }
  }
  return added;
}
