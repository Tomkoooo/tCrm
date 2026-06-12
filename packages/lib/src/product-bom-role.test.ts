import { describe, expect, it } from 'vitest';
import { classifyProductBomRoles } from './product-bom-role';

describe('classifyProductBomRoles', () => {
  const empty = new Set<string>();

  it('marks standalone products', () => {
    expect(classifyProductBomRoles({ id: 'a', componentCount: 0 }, empty)).toEqual(['standalone']);
  });

  it('marks assemblies', () => {
    expect(classifyProductBomRoles({ id: 'a', componentCount: 2 }, empty)).toEqual(['assembly']);
  });

  it('marks required components', () => {
    expect(classifyProductBomRoles({ id: 'a', componentCount: 0 }, new Set(['a']))).toEqual([
      'component_required',
    ]);
  });

  it('marks optional components when rentFlag is 2', () => {
    expect(
      classifyProductBomRoles({ id: 'a', componentCount: 0, rentFlag: 2 }, new Set(['a']))
    ).toEqual(['component_optional']);
  });

  it('can be both assembly and component (nested kit)', () => {
    expect(
      classifyProductBomRoles({ id: 'a', componentCount: 1, rentFlag: 1 }, new Set(['a']))
    ).toEqual(['assembly', 'component_required']);
  });
});
