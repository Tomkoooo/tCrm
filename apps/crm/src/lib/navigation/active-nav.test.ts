import { describe, expect, it } from 'vitest';
import { isNavItemActive, resolveActiveNavHref } from './active-nav';

const inventoryHrefs = [
  '/inventory/dashboard',
  '/inventory',
  '/inventory/count',
  '/inventory/builds',
  '/inventory/categories',
  '/inventory/suppliers',
];

describe('resolveActiveNavHref', () => {
  it('prefers the longest matching href', () => {
    expect(resolveActiveNavHref('/inventory/builds', inventoryHrefs)).toBe('/inventory/builds');
    expect(resolveActiveNavHref('/inventory/builds/new', inventoryHrefs)).toBe('/inventory/builds');
    expect(resolveActiveNavHref('/inventory/dashboard', inventoryHrefs)).toBe(
      '/inventory/dashboard'
    );
    expect(resolveActiveNavHref('/inventory/count', inventoryHrefs)).toBe('/inventory/count');
    expect(resolveActiveNavHref('/inventory/100003301', inventoryHrefs)).toBe('/inventory');
    expect(resolveActiveNavHref('/inventory', inventoryHrefs)).toBe('/inventory');
  });

  it('returns null when nothing matches', () => {
    expect(resolveActiveNavHref('/logistics', inventoryHrefs)).toBeNull();
  });
});

describe('isNavItemActive', () => {
  it('marks only one sibling active at a time', () => {
    const pathname = '/inventory/builds';
    expect(isNavItemActive(pathname, '/inventory/builds', inventoryHrefs)).toBe(true);
    expect(isNavItemActive(pathname, '/inventory', inventoryHrefs)).toBe(false);
    expect(isNavItemActive(pathname, '/inventory/dashboard', inventoryHrefs)).toBe(false);
  });
});
