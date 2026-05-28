import { describe, expect, it } from 'vitest';
import { generateInternalSku } from './sku';

describe('generateInternalSku', () => {
  it('pads and prefixes to total length', () => {
    expect(generateInternalSku({ prefix: '6', totalLength: 9 }, '2602000')).toBe('602602000');
  });

  it('normalizes digits and pads', () => {
    expect(generateInternalSku({ prefix: '8', totalLength: 16 }, 'AB-60303008')).toBe(
      '8000000060303008'
    );
  });
});
