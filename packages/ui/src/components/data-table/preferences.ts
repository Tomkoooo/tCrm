const STORAGE_KEY = 'tcrm:table-prefs:v1';

export type TablePreferences = {
  visibleColumns?: string[];
  pageSize?: number;
};

type PrefsStore = Record<string, TablePreferences>;

function readStore(): PrefsStore {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PrefsStore;
  } catch {
    return {};
  }
}

function writeStore(store: PrefsStore) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

export function getTablePreferences(tableId: string): TablePreferences {
  return readStore()[tableId] ?? {};
}

export function setTablePreferences(tableId: string, patch: TablePreferences) {
  const store = readStore();
  store[tableId] = { ...store[tableId], ...patch };
  writeStore(store);
}

export function getDefaultVisibleColumns(
  tableId: string,
  columns: Array<{ key: string; defaultVisible?: boolean; hideable?: boolean }>
): string[] {
  const allKeys = columns.map((c) => c.key);
  const keySet = new Set(allKeys);
  const defaultKeys = columns.filter((c) => c.defaultVisible !== false).map((c) => c.key);

  const saved = getTablePreferences(tableId).visibleColumns;
  if (!saved?.length) return defaultKeys;

  const validSaved = saved.filter((k) => keySet.has(k));
  if (validSaved.length === 0) return defaultKeys;

  // Keep user order; append newly added columns that default to visible
  const merged = [...validSaved];
  for (const key of defaultKeys) {
    if (!merged.includes(key)) merged.push(key);
  }
  return merged;
}

/** Visible columns from column definitions only — ignores saved preferences. */
export function getFactoryDefaultVisibleColumns(
  columns: Array<{ key: string; defaultVisible?: boolean }>
): string[] {
  return columns.filter((c) => c.defaultVisible !== false).map((c) => c.key);
}

export function getHideableColumns(
  columns: Array<{ key: string; hideable?: boolean; label?: string; columnPickerLabel?: string }>
) {
  return columns.filter((c) => c.hideable !== false);
}

export function columnPickerLabel(col: {
  key: string;
  label?: string;
  columnPickerLabel?: string;
}): string {
  return col.columnPickerLabel ?? (col.label?.trim() || col.key);
}
