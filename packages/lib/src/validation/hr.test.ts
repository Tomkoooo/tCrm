import { describe, expect, it } from 'vitest';
import {
  companySchema,
  employeeSchema,
  employeeProfileFromForm,
  parseLinkEmployeeFromForm,
  scheduleEntrySchema,
  userEmployeeProfileSchema,
} from './hr';

describe('companySchema', () => {
  it('accepts valid company', () => {
    const result = companySchema.safeParse({
      name: 'Acme Kft.',
      slug: 'acme-kft',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug', () => {
    const result = companySchema.safeParse({
      name: 'Acme',
      slug: 'Acme_Bad',
    });
    expect(result.success).toBe(false);
  });
});

describe('employeeSchema', () => {
  it('accepts valid employee', () => {
    const result = employeeSchema.safeParse({
      companyId: '507f1f77bcf86cd799439011',
      name: 'Teszt Dolgozó',
      email: 'worker@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = employeeSchema.safeParse({
      companyId: '507f1f77bcf86cd799439011',
      name: 'Teszt',
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('userEmployeeProfileSchema', () => {
  it('accepts optional employee fields', () => {
    const result = userEmployeeProfileSchema.safeParse({
      linkEmployee: true,
      companyId: '507f1f77bcf86cd799439011',
    });
    expect(result.success).toBe(true);
  });
});

describe('parseLinkEmployeeFromForm', () => {
  it('detects linkEmployee checkbox', () => {
    const fd = new FormData();
    fd.set('linkEmployee', 'on');
    expect(parseLinkEmployeeFromForm(fd)).toBe(true);
  });

  it('detects registerAsEmployee checkbox', () => {
    const fd = new FormData();
    fd.set('registerAsEmployee', 'true');
    expect(parseLinkEmployeeFromForm(fd)).toBe(true);
  });

  it('returns false when unchecked', () => {
    const fd = new FormData();
    expect(parseLinkEmployeeFromForm(fd)).toBe(false);
  });
});

describe('employeeProfileFromForm', () => {
  it('returns profile when linked and company set', () => {
    const fd = new FormData();
    fd.set('companyId', '507f1f77bcf86cd799439011');
    fd.set('department', 'IT');
    const profile = employeeProfileFromForm(fd, true);
    expect(profile?.companyId).toBe('507f1f77bcf86cd799439011');
    expect(profile?.department).toBe('IT');
  });

  it('returns null when not linked', () => {
    const fd = new FormData();
    fd.set('companyId', '507f1f77bcf86cd799439011');
    expect(employeeProfileFromForm(fd, false)).toBeNull();
  });

  it('returns null when company missing', () => {
    const fd = new FormData();
    expect(employeeProfileFromForm(fd, true)).toBeNull();
  });
});

describe('scheduleEntrySchema', () => {
  it('accepts valid shift window', () => {
    const result = scheduleEntrySchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      start: '2026-06-01T08:00:00',
      end: '2026-06-01T16:00:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects end before start', () => {
    const result = scheduleEntrySchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      start: '2026-06-01T16:00:00',
      end: '2026-06-01T08:00:00',
    });
    expect(result.success).toBe(false);
  });
});
