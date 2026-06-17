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
    variables: [
      'pickupReference',
      'jobReference',
      'eventName',
      'siteAddress',
      'warehouseName',
      'plannedGatherAt',
      'plannedEventAt',
      'actorName',
    ],
    enabled: true,
    recipientRoleKeys: ['manager'],
    body: `<p>Ütemezett feladat: <strong>{{pickupReference}}</strong></p>
<p>Esemény: {{eventName}} ({{jobReference}})</p>
<p>Helyszín: {{siteAddress}}</p>
<p>Raktár: {{warehouseName}}</p>
<p>Összeszedés: {{plannedGatherAt}}</p>
<p>Helyszíni időpont: {{plannedEventAt}}</p>`,
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
  {
    key: 'hr_schedule_created',
    subject: 'Új beosztás — {{scheduleTitle}}',
    description: 'Dolgozó értesítése új beosztásról',
    variables: [
      'employeeName',
      'companyName',
      'scheduleTitle',
      'scheduleKind',
      'startAt',
      'endAt',
      'location',
      'myScheduleLink',
      'actorName',
    ],
    enabled: true,
    body: `<p>Kedves {{employeeName}}!</p>
<p>Új beosztás került a naptárába ({{companyName}}):</p>
<p><strong>{{scheduleTitle}}</strong> ({{scheduleKind}})<br/>
{{startAt}} — {{endAt}}<br/>
Helyszín: {{location}}</p>
<p><a href="{{myScheduleLink}}">Saját beosztás megtekintése</a></p>`,
  },
  {
    key: 'hr_schedule_updated',
    subject: 'Beosztás módosult — {{scheduleTitle}}',
    description: 'Dolgozó értesítése beosztás módosításról',
    variables: [
      'employeeName',
      'companyName',
      'scheduleTitle',
      'scheduleKind',
      'startAt',
      'endAt',
      'location',
      'changeSummary',
      'myScheduleLink',
      'actorName',
    ],
    enabled: true,
    body: `<p>Kedves {{employeeName}}!</p>
<p>Beosztása módosult ({{companyName}}):</p>
<p>{{changeSummary}}</p>
<p><strong>{{scheduleTitle}}</strong><br/>
{{startAt}} — {{endAt}}<br/>
Helyszín: {{location}}</p>
<p><a href="{{myScheduleLink}}">Saját beosztás megtekintése</a></p>`,
  },
  {
    key: 'hr_schedule_deleted',
    subject: 'Beosztás törölve — {{scheduleTitle}}',
    description: 'Dolgozó értesítése törölt beosztásról',
    variables: [
      'employeeName',
      'companyName',
      'scheduleTitle',
      'scheduleKind',
      'startAt',
      'endAt',
      'location',
      'myScheduleLink',
      'actorName',
    ],
    enabled: true,
    body: `<p>Kedves {{employeeName}}!</p>
<p>Az alábbi beosztás törölve lett ({{companyName}}):</p>
<p><strong>{{scheduleTitle}}</strong> — {{startAt}}</p>`,
  },
  {
    key: 'hr_request_submitted',
    subject: 'Új HR kérelem — {{employeeName}}',
    description: 'HR értesítése új dolgozói kérelemről',
    variables: [
      'employeeName',
      'companyName',
      'requestType',
      'dateRange',
      'reason',
      'requestLink',
      'requesterName',
    ],
    enabled: true,
    recipientRoleKeys: ['hr'],
    body: `<p>Új kérelem érkezett: <strong>{{requestType}}</strong></p>
<p>Dolgozó: {{employeeName}} ({{companyName}})</p>
<p>Időszak: {{dateRange}}</p>
<p>Indoklás: {{reason}}</p>
<p><a href="{{requestLink}}">Kérelmek megnyitása</a></p>`,
  },
];
