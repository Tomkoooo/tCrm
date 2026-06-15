import { describe, expect, it } from 'vitest';
import {
  hasAnyPermission,
  LOGISTICS_READ_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_READ_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS,
} from './permissions';

describe('hasAnyPermission', () => {
  it('returns true when user has any listed key', () => {
    expect(hasAnyPermission(['logistics:write'], LOGISTICS_READ_PERMISSION_KEYS)).toBe(true);
    expect(
      hasAnyPermission(['logistics:vehicles:read'], LOGISTICS_VEHICLES_READ_PERMISSION_KEYS)
    ).toBe(true);
    expect(
      hasAnyPermission(['logistics:vehicles:report'], LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS)
    ).toBe(true);
  });

  it('returns false when user lacks all listed keys', () => {
    expect(hasAnyPermission(['inventory:read'], LOGISTICS_READ_PERMISSION_KEYS)).toBe(false);
    expect(
      hasAnyPermission(['logistics:vehicles:report'], LOGISTICS_VEHICLES_READ_PERMISSION_KEYS)
    ).toBe(false);
  });

  it('treats logistics:write as fleet read via LOGISTICS_VEHICLES_READ_PERMISSION_KEYS', () => {
    expect(hasAnyPermission(['logistics:write'], LOGISTICS_VEHICLES_READ_PERMISSION_KEYS)).toBe(
      true
    );
  });
});
