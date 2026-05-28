import { describe, expect, it } from 'vitest';
import { formatMovementReference } from './references';

describe('formatMovementReference', () => {
  it('formats GRN references with zero-padded sequence', () => {
    expect(formatMovementReference('grn', 2026, 1)).toBe('GRN-2026-00001');
    expect(formatMovementReference('grn', 2026, 42)).toBe('GRN-2026-00042');
  });

  it('formats pick and transfer prefixes', () => {
    expect(formatMovementReference('pick', 2026, 7)).toBe('PICK-2026-00007');
    expect(formatMovementReference('transfer', 2026, 100)).toBe('TRF-2026-00100');
  });
});
