import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { buildCompanyFilter, buildCompanyIdFilter, hasGlobalHrScope } from './company-scope';

describe('hasGlobalHrScope', () => {
  it('returns true for admin:access', () => {
    expect(hasGlobalHrScope(['admin:access'])).toBe(true);
  });

  it('returns true for hr:scope_all', () => {
    expect(hasGlobalHrScope(['hr:read', 'hr:scope_all'])).toBe(true);
  });

  it('returns false for scoped HR only', () => {
    expect(hasGlobalHrScope(['hr:read', 'hr:write'])).toBe(false);
  });
});

describe('buildCompanyFilter', () => {
  const companyId = new Types.ObjectId();

  it('returns empty filter for global scope', () => {
    expect(buildCompanyFilter(null)).toEqual({});
  });

  it('returns impossible match when no companies allowed', () => {
    expect(buildCompanyFilter([])).toEqual({ _id: { $exists: false } });
  });

  it('filters by companyId $in', () => {
    expect(buildCompanyFilter([companyId])).toEqual({
      companyId: { $in: [companyId] },
    });
  });
});

describe('buildCompanyIdFilter', () => {
  const companyId = new Types.ObjectId();

  it('returns empty filter for global scope', () => {
    expect(buildCompanyIdFilter(null)).toEqual({});
  });

  it('returns impossible match when no companies allowed', () => {
    expect(buildCompanyIdFilter([])).toEqual({ _id: { $exists: false } });
  });

  it('filters by _id $in', () => {
    expect(buildCompanyIdFilter([companyId])).toEqual({
      _id: { $in: [companyId] },
    });
  });
});
