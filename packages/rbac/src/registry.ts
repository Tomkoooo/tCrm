import type { PermissionModule } from './types';

const registry = new Map<string, PermissionModule>();

/** Idempotent by moduleKey — safe to call repeatedly (e.g. hot reload) with the same descriptor. */
export function registerPermissionModule(module: PermissionModule): void {
  registry.set(module.moduleKey, module);
}

export function getRegisteredModules(): PermissionModule[] {
  return Array.from(registry.values());
}

/** Test-only: reset the in-process registry between test files. */
export function clearRegistryForTests(): void {
  registry.clear();
}
