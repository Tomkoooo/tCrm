import { describe, expect, it, afterEach } from 'vitest';
import { registerPermissionModule, getRegisteredModules, clearRegistryForTests } from './registry';

afterEach(() => {
  clearRegistryForTests();
});

describe('registry', () => {
  it('registers and lists modules', () => {
    registerPermissionModule({ moduleKey: 'warehouse', permissions: [] });
    registerPermissionModule({ moduleKey: 'hr', permissions: [] });

    const keys = getRegisteredModules().map((m) => m.moduleKey);
    expect(keys).toEqual(expect.arrayContaining(['warehouse', 'hr']));
    expect(keys).toHaveLength(2);
  });

  it('re-registering the same moduleKey replaces the previous descriptor', () => {
    registerPermissionModule({ moduleKey: 'warehouse', permissions: [] });
    registerPermissionModule({
      moduleKey: 'warehouse',
      permissions: [{ key: 'warehouse:read', label: 'Read', group: 'warehouse' }],
    });

    const modules = getRegisteredModules();
    expect(modules).toHaveLength(1);
    expect(modules[0]?.permissions).toHaveLength(1);
  });
});
