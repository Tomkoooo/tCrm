export type TourStep = {
  /** CSS selector for a `data-tour` attribute — never a class/id that can drift with styling changes. */
  selector: string;
  title: string;
  description: string;
};

/**
 * Guided walkthrough of the app shell. Each selector must match a `data-tour`
 * attribute placed on the real element (see app-sidebar.tsx) — driver.js steps
 * for elements that aren't in the DOM (e.g. an admin-only nav item for a
 * non-admin user) are filtered out at start time, never shown broken.
 */
export const shellTourSteps: TourStep[] = [
  {
    selector: '[data-tour="dashboard"]',
    title: 'Vezérlőpult',
    description: 'A főoldal — innen éred el a hozzád rendelt gyors műveleteket.',
  },
  {
    selector: '[data-tour="help"]',
    title: 'Súgó',
    description:
      'Lépésről lépésre útmutatók minden funkcióhoz. Ha elakadsz, mindig ide gyere vissza.',
  },
  {
    selector: '[data-tour="my-tasks"]',
    title: 'Saját feladataim',
    description:
      'A rád bízott szállítások, naptár és szabadság. Akkor jelenik meg, ha van dolgozó profilod — jogosultság nélkül is. Több cég esetén fent válthatsz.',
  },
  {
    selector: '[data-tour="account"]',
    title: 'Fiók',
    description: 'Profilod, jelszavad és a jogosultságaid összesítője.',
  },
  {
    selector: '[data-tour="inventory"]',
    title: 'Készletkezelés',
    description:
      'Termékek, gyors felvétel, készlet a listán, összeszerelések, kategóriák és beszállítók — csak azoknak látszik, akiknek van készlet jogosultságuk.',
  },
  {
    selector: '[data-tour="logistics"]',
    title: 'Logisztika',
    description:
      'Készletmozgások, foglalások, szállítások és járműflotta — jogosultság függvényében jelenik meg.',
  },
  {
    selector: '[data-tour="hr"]',
    title: 'HR',
    description:
      'Dolgozók, szabadság, és a szállításokból következő naptár / órák — jogosultság függvényében.',
  },
  {
    selector: '[data-tour="admin"]',
    title: 'Adminisztráció',
    description:
      'Felhasználók, szerepkörök, e-mail sablonok, médiatár és arculat kezelése — csak adminisztrátoroknak látható.',
  },
];
