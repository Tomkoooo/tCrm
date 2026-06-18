export type MobileOs = 'ios' | 'android';

export function detectMobileOs(userAgent: string, maxTouchPoints = 0): MobileOs | null {
  const ua = userAgent.toLowerCase();
  const isIpad = ua.includes('ipad') || (ua.includes('macintosh') && maxTouchPoints > 1);

  if (/iphone|ipod/.test(ua) || isIpad) {
    return 'ios';
  }

  if (ua.includes('android')) {
    return 'android';
  }

  return null;
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  displayModeMinimalUi: boolean,
  navigatorStandalone: boolean
): boolean {
  return displayModeStandalone || displayModeMinimalUi || navigatorStandalone;
}
