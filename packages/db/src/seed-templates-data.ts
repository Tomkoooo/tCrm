/** Baseline mail templates — seeded with seed-missing (no overwrite by default). */

export type BaselineMailTemplate = {
  key: string;
  subject: string;
  body: string;
  description: string;
  variables: string[];
  enabled: boolean;
  recipientRoleKeys?: string[];
};

export const BASELINE_MAIL_TEMPLATES: BaselineMailTemplate[] = [
  {
    key: 'user_invitation',
    subject: 'Meghívó a tCrm rendszerbe',
    description: 'Felhasználói meghívó linkkel',
    variables: ['name', 'inviteLink', 'expiresAt', 'inviterName'],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>{{inviterName}} meghívta Önt a tCrm rendszerbe.</p>
<p><a href="{{inviteLink}}">Regisztráció és jelszó beállítása</a></p>
<p>A link érvényes: {{expiresAt}}</p>
<p>Ha nem Ön kérte a meghívót, hagyja figyelmen kívül ezt az üzenetet.</p>`,
  },
  {
    key: 'password_reset',
    subject: 'Jelszó visszaállítása — tCrm',
    description: 'Jelszó-visszaállító link admin által vagy önkiszolgáló folyamatból',
    variables: ['name', 'resetLink', 'expiresAt'],
    enabled: true,
    body: `<p>Kedves {{name}}!</p>
<p>Jelszó-visszaállítást kértünk a tCrm fiókjához.</p>
<p><a href="{{resetLink}}">Új jelszó beállítása</a></p>
<p>A link érvényes: {{expiresAt}}</p>
<p>Ha nem Ön kérte, hagyja figyelmen kívül ezt az üzenetet.</p>`,
  },
  {
    key: 'job_scheduled',
    subject: 'Logisztika: esemény ütemezve — {{pickupReference}}',
    description: 'Új vagy ütemezett szállítási feladat',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    recipientRoleKeys: ['manager'],
    body: `<p>Ütemezett feladat: <strong>{{pickupReference}}</strong></p>
<p>Esemény: {{jobReference}}</p>
<p>Raktár: {{warehouseName}}</p>`,
  },
  {
    key: 'pickup_gathered',
    subject: 'Összeszedés kész — {{pickupReference}}',
    description: 'Raktári összeszedés befejezve',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    body: `<p>Az összeszedés elkészült: <strong>{{pickupReference}}</strong></p>
<p>Raktár: {{warehouseName}}</p>`,
  },
  {
    key: 'pickup_ready_for_collection',
    subject: 'Átvehető a raktárban — {{pickupReference}}',
    description: 'Felvételre kész a raktárban',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    body: `<p>A csomag átvehető: <strong>{{pickupReference}}</strong></p>
<p>Raktár: {{warehouseName}}</p>
<p>Kérdés esetén válaszoljon erre az e-mailre.</p>`,
  },
  {
    key: 'pickup_delivered',
    subject: 'Kiszállítva — {{pickupReference}}',
    description: 'Helyszínen átadva',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    body: `<p>Kiszállítás megtörtént: <strong>{{pickupReference}}</strong></p>`,
  },
  {
    key: 'pickup_return_reminder',
    subject: 'Visszáru emlékeztető — {{pickupReference}}',
    description: 'Visszáru várható',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    body: `<p>Visszáru emlékeztető: <strong>{{pickupReference}}</strong></p>
<p>Raktár: {{warehouseName}}</p>`,
  },
  {
    key: 'pickup_checkin_complete',
    subject: 'Visszáru bevételezve — {{pickupReference}}',
    description: 'Visszáru feldolgozás kész',
    variables: ['pickupReference', 'jobReference', 'warehouseName', 'actorName'],
    enabled: true,
    body: `<p>Visszáru bevételezve: <strong>{{pickupReference}}</strong></p>`,
  },
];
