import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getDefaultVisibleColumns, getTablePreferences, setTablePreferences } from './preferences';

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', ls);
  return ls;
}

describe('table preferences', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('returns all default visible columns when no prefs', () => {
    const cols = [
      { key: 'a', defaultVisible: true },
      { key: 'b', defaultVisible: false },
      { key: 'c' },
    ];
    expect(getDefaultVisibleColumns('t1', cols)).toEqual(['a', 'c']);
  });

  it('persists visible columns', () => {
    setTablePreferences('t1', { visibleColumns: ['b'] });
    expect(getTablePreferences('t1').visibleColumns).toEqual(['b']);
    const cols = [{ key: 'a' }, { key: 'b' }];
    expect(getDefaultVisibleColumns('t1', cols)).toEqual(['b']);
  });
});
