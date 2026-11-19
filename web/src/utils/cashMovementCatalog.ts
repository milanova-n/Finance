import { DEFAULT_CASH_MOVEMENT_CATALOG } from './catalogDefaults';
import { readJson, writeJson } from './localStorageJson';

const TYPES_KEY = 'myfi:cashMovementTypes';
const SUBTYPES_KEY = 'myfi:cashMovementSubtypes';

export type CashMovementType = { id: number; name: string };
export type CashMovementSubtype = { id: number; typeId: number; name: string };

function nextLocalId(existing: { id: number }[]): number {
  if (existing.length === 0) return -1;
  const min = existing.reduce((m, row) => Math.min(m, row.id), 0);
  return min <= 0 ? min - 1 : -1;
}

export function loadCashMovementTypes(): CashMovementType[] {
  return readJson<CashMovementType[]>(TYPES_KEY, []).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function loadCashMovementSubtypes(): CashMovementSubtype[] {
  return readJson<CashMovementSubtype[]>(SUBTYPES_KEY, []);
}

export function subtypesForType(typeId: number): CashMovementSubtype[] {
  return loadCashMovementSubtypes()
    .filter((s) => s.typeId === typeId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function ensureDefaultCashMovementCatalog(): void {
  if (loadCashMovementTypes().length > 0) return;

  const types: CashMovementType[] = [];
  const subtypes: CashMovementSubtype[] = [];
  let typeId = -1;
  let subtypeId = -1;

  for (const row of DEFAULT_CASH_MOVEMENT_CATALOG) {
    const type: CashMovementType = { id: typeId, name: row.type };
    typeId -= 1;
    types.push(type);
    for (const name of row.subtypes) {
      subtypes.push({ id: subtypeId, typeId: type.id, name });
      subtypeId -= 1;
    }
  }

  writeJson(TYPES_KEY, types);
  writeJson(SUBTYPES_KEY, subtypes);
}

export function addCashMovementType(name: string): CashMovementType {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name the cash movement type.');
  const types = readJson<CashMovementType[]>(TYPES_KEY, []);
  const duplicate = types.find(
    (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return duplicate;
  const created: CashMovementType = { id: nextLocalId(types), name: trimmed };
  types.push(created);
  writeJson(TYPES_KEY, types);
  return created;
}

function renameInStoredCashMovements(
  patch: (row: { movementType: string; movementSubtype: string }) => void
) {
  const CASH_KEY = 'myfi:cashMovements';
  const rows = readJson<
    Array<{
      movementType: string;
      movementSubtype: string;
    }>
  >(CASH_KEY, []);
  if (rows.length === 0) return;
  for (const row of rows) patch(row);
  writeJson(CASH_KEY, rows);
}

export function renameCashMovementType(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a name.');
  const types = readJson<CashMovementType[]>(TYPES_KEY, []);
  const type = types.find((t) => t.id === id);
  if (!type) throw new Error('Type not found.');
  const duplicate = types.find(
    (t) =>
      t.id !== id && t.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) throw new Error(`“${duplicate.name}” already exists.`);
  const previous = type.name;
  type.name = trimmed;
  writeJson(TYPES_KEY, types);
  renameInStoredCashMovements((row) => {
    if (row.movementType === previous) row.movementType = trimmed;
  });
}

export function renameCashMovementSubtype(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a name.');
  const subtypes = readJson<CashMovementSubtype[]>(SUBTYPES_KEY, []);
  const subtype = subtypes.find((s) => s.id === id);
  if (!subtype) throw new Error('Subtype not found.');
  const duplicate = subtypes.find(
    (s) =>
      s.id !== id &&
      s.typeId === subtype.typeId &&
      s.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) throw new Error(`“${duplicate.name}” already exists.`);
  const previous = subtype.name;
  subtype.name = trimmed;
  writeJson(SUBTYPES_KEY, subtypes);
  renameInStoredCashMovements((row) => {
    if (row.movementSubtype === previous) row.movementSubtype = trimmed;
  });
}

export function deleteCashMovementType(id: number) {
  const types = loadCashMovementTypes().filter((t) => t.id !== id);
  const subtypes = loadCashMovementSubtypes().filter((s) => s.typeId !== id);
  writeJson(TYPES_KEY, types);
  writeJson(SUBTYPES_KEY, subtypes);
}

export function addCashMovementSubtype(
  typeId: number,
  name: string
): CashMovementSubtype {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name the subtype.');
  const subtypes = readJson<CashMovementSubtype[]>(SUBTYPES_KEY, []);
  const duplicate = subtypes.find(
    (s) =>
      s.typeId === typeId &&
      s.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) return duplicate;
  const created: CashMovementSubtype = {
    id: nextLocalId(subtypes),
    typeId,
    name: trimmed,
  };
  subtypes.push(created);
  writeJson(SUBTYPES_KEY, subtypes);
  return created;
}

export function deleteCashMovementSubtype(id: number) {
  const subtypes = loadCashMovementSubtypes().filter((s) => s.id !== id);
  writeJson(SUBTYPES_KEY, subtypes);
}

export function seedDefaultCashMovementCatalog(): number {
  ensureDefaultCashMovementCatalog();
  let added = 0;
  const types = loadCashMovementTypes();
  const typeNames = new Set(types.map((t) => t.name.toLowerCase()));

  for (const row of DEFAULT_CASH_MOVEMENT_CATALOG) {
    let type = types.find(
      (t) => t.name.toLowerCase() === row.type.toLowerCase()
    );
    if (!type) {
      type = addCashMovementType(row.type);
      added += 1;
      typeNames.add(row.type.toLowerCase());
    }
    for (const sub of row.subtypes) {
      const existing = subtypesForType(type.id).find(
        (s) => s.name.toLowerCase() === sub.toLowerCase()
      );
      if (!existing) {
        addCashMovementSubtype(type.id, sub);
        added += 1;
      }
    }
  }
  return added;
}

export function findTypeByName(name: string): CashMovementType | undefined {
  const norm = name.trim().toLowerCase();
  return loadCashMovementTypes().find((t) => t.name.toLowerCase() === norm);
}

export function findSubtypeByName(
  typeId: number,
  name: string
): CashMovementSubtype | undefined {
  const norm = name.trim().toLowerCase();
  return subtypesForType(typeId).find((s) => s.name.toLowerCase() === norm);
}