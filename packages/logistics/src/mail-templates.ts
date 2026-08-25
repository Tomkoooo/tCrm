import { seedMailTemplates, type BaselineMailTemplate } from '@crm/mail';

export const LOGISTICS_MAIL_TEMPLATES: BaselineMailTemplate[] = [
  {
    key: 'job_pickup_assigned',
    subject: 'Átvétel rád vár — {{eventName}}',
    description: 'Kijelölve átvételért felelősként egy szállításhoz',
    variables: [
      'eventName',
      'siteAddress',
      'pickupAt',
      'eventAt',
      'returnAt',
      'partsListHtml',
      'jobUrl',
    ],
    enabled: true,
    body: `<p>Téged jelöltek ki <strong>átvételért felelősnek</strong> ehhez az eseményhez: <strong>{{eventName}}</strong></p>
<p>Helyszín: {{siteAddress}}</p>
<p>Összeszedés időpontja: {{pickupAt}}</p>
<p>Helyszíni időpont: {{eventAt}}</p>
<p><strong>Tételek:</strong></p>
{{partsListHtml}}
<p>Ha bármi hiányzik vagy problémás, a listát az alkalmazásban módosíthatod átvételkor.</p>
<p><a href="{{jobUrl}}">Megnyitás az alkalmazásban</a></p>`,
  },
  {
    key: 'job_dropoff_assigned',
    subject: 'Leadás rád vár — {{eventName}}',
    description: 'Kijelölve leadásért/visszaellenőrzésért felelősként egy szállításhoz',
    variables: [
      'eventName',
      'siteAddress',
      'pickupAt',
      'eventAt',
      'returnAt',
      'partsListHtml',
      'jobUrl',
    ],
    enabled: true,
    body: `<p>Téged jelöltek ki <strong>leadásért felelősnek</strong> ehhez az eseményhez: <strong>{{eventName}}</strong></p>
<p>Helyszín: {{siteAddress}}</p>
<p>Visszaérkezés időpontja: {{returnAt}}</p>
<p><strong>Eredeti tételek:</strong></p>
{{partsListHtml}}
<p>A visszaellenőrzést az alkalmazásban rögzítheted.</p>
<p><a href="{{jobUrl}}">Megnyitás az alkalmazásban</a></p>`,
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
