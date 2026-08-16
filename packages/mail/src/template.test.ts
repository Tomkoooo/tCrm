import { describe, expect, it } from 'vitest';
import { renderTemplateString } from './template';

describe('renderTemplateString', () => {
  it('replaces placeholders', () => {
    expect(
      renderTemplateString('Hello {{name}}, ref {{pickupReference}}', {
        name: 'Ada',
        pickupReference: 'JOB-1-P01',
      })
    ).toBe('Hello Ada, ref JOB-1-P01');
  });

  it('leaves unknown keys empty', () => {
    expect(renderTemplateString('{{missing}}', {})).toBe('');
  });
});
