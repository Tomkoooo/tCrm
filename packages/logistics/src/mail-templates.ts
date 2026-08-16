import { seedMailTemplates, type BaselineMailTemplate } from '@crm/mail';

export const LOGISTICS_MAIL_TEMPLATES: BaselineMailTemplate[] = [
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
];

let seededOnce = false;

export async function seedLogisticsMailTemplates(): Promise<void> {
  await seedMailTemplates(LOGISTICS_MAIL_TEMPLATES);
}

export async function ensureLogisticsMailTemplatesSeeded(): Promise<void> {
  if (seededOnce) return;
  await seedLogisticsMailTemplates();
  seededOnce = true;
}
