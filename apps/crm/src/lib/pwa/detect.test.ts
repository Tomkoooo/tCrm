import { describe, expect, it } from 'vitest';
import { detectMobileOs, isStandaloneDisplay } from './detect';

describe('detectMobileOs', () => {
  it('detects iPhone', () => {
    expect(
      detectMobileOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    ).toBe('ios');
  });

  it('detects iPad via touch-capable Macintosh UA', () => {
    expect(
      detectMobileOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)
    ).toBe('ios');
  });

  it('detects Android', () => {
    expect(
      detectMobileOs(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile'
      )
    ).toBe('android');
  });

  it('returns null for desktop browsers', () => {
    expect(
      detectMobileOs(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0'
      )
    ).toBeNull();
  });
});

describe('isStandaloneDisplay', () => {
  it('returns true when display-mode is standalone', () => {
    expect(isStandaloneDisplay(true, false, false)).toBe(true);
  });

  it('returns true for legacy iOS navigator.standalone', () => {
    expect(isStandaloneDisplay(false, false, true)).toBe(true);
  });

  it('returns false for mobile browser tabs', () => {
    expect(isStandaloneDisplay(false, false, false)).toBe(false);
  });
});
