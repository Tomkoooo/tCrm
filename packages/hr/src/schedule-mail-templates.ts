import { seedMailTemplates, type BaselineMailTemplate } from '@crm/mail';

/**
 * Baseline templates for the beosztás (roster) flow. Keys are the shared contract;
 * the bodies here are the first-run defaults and stay editable at
 * `/admin/mail-templates`. The legacy `hr_schedule_created/updated/deleted` keys
 * from the pre-rebuild build are deliberately left alone.
 */

const WRAPPER_OPEN = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#18181b;line-height:1.6">`;
const WRAPPER_CLOSE = `<p style="margin-top:28px;font-size:12px;color:#71717a">Ezt a levelet a Sakkmed CRM küldte automatikusan.</p></div>`;

const BUTTON = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">${label}</a>`;

export const SCHEDULE_MAIL_TEMPLATE_KEYS = {
  published: 'hr_schedule_plan_published',
  changeRequested: 'hr_schedule_plan_change_requested',
  changeReviewed: 'hr_schedule_plan_change_reviewed',
} as const;

export const SCHEDULE_MAIL_TEMPLATES: BaselineMailTemplate[] = [
  {
    key: SCHEDULE_MAIL_TEMPLATE_KEYS.published,
    subject: '{{subjectPrefix}}Beosztás — {{planTitle}} ({{periodLabel}})',
    description:
      'Kiküldött beosztás a dolgozónak: táblázat, egykattintásos belépés, naptár import és módosítási kérelem link.',
    variables: [
      'employeeName',
      'planTitle',
      'periodLabel',
      'companyName',
      'scheduleTable',
      'shiftCount',
      'loginLink',
      'scheduleLink',
      'calendarFeedUrl',
      'calendarWebcalUrl',
      'icsDownloadUrl',
      'planNotes',
      'subjectPrefix',
      'publisherName',
      'loginButton',
    ],
    enabled: true,
    body: `${WRAPPER_OPEN}
<p>Kedves {{employeeName}}!</p>
<p>Elkészült a beosztásod: <strong>{{planTitle}}</strong> ({{periodLabel}}) — {{companyName}}. Összesen {{shiftCount}} műszak.</p>
{{scheduleTable}}
{{planNotes}}
<p style="margin-top:24px">{{loginButton}}</p>
<p style="font-size:13px;color:#52525b">A fenti gombbal jelszó nélkül belépsz és egyből a beosztásodon landolsz. A link személyes — kérjük, ne továbbítsd.</p>
<h3 style="margin-top:28px;margin-bottom:6px;font-size:15px">Naptárba mentés</h3>
<ul style="padding-left:20px;margin-top:0">
  <li><a href="{{calendarWebcalUrl}}">Feliratkozás (Google / iCloud / Outlook)</a> — a naptárad automatikusan követi a módosításokat.</li>
  <li><a href="{{icsDownloadUrl}}">Egyszeri .ics letöltés</a> — csak ennek a beosztásnak a műszakjai.</li>
</ul>
<h3 style="margin-top:28px;margin-bottom:6px;font-size:15px">Nem jó egy időpont?</h3>
<p style="margin-top:0">Nyisd meg a <a href="{{scheduleLink}}">beosztásodat</a>, és a műszak mellett a <strong>„Módosítást kérek"</strong> gombbal jelezd. {{publisherName}} megkapja a kérésed, és e-mailben válaszol rá.</p>
${WRAPPER_CLOSE}`,
  },
  {
    key: SCHEDULE_MAIL_TEMPLATE_KEYS.changeRequested,
    subject: 'Beosztás módosítási kérelem — {{employeeName}}',
    description:
      'A beosztást kiküldő szerkesztőnek: dolgozói módosítási kérelem a saját műszakjára.',
    variables: [
      'employeeName',
      'planTitle',
      'companyName',
      'changeSummary',
      'requestNote',
      'reviewLink',
      'reviewButton',
    ],
    enabled: true,
    body: `${WRAPPER_OPEN}
<p><strong>{{employeeName}}</strong> módosítást kért a beosztásában.</p>
<table style="border-collapse:collapse;margin:16px 0;font-size:14px">
  <tr><td style="padding:4px 12px 4px 0;color:#71717a">Beosztás</td><td style="padding:4px 0"><strong>{{planTitle}}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#71717a">Cég</td><td style="padding:4px 0">{{companyName}}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#71717a">Kért változás</td><td style="padding:4px 0">{{changeSummary}}</td></tr>
</table>
{{requestNote}}
<p style="margin-top:24px">{{reviewButton}}</p>
${WRAPPER_CLOSE}`,
  },
  {
    key: SCHEDULE_MAIL_TEMPLATE_KEYS.changeReviewed,
    subject: 'Beosztás kérelem {{decisionLabel}} — {{planTitle}}',
    description: 'A dolgozónak: elfogadott vagy elutasított módosítási kérelem, visszajelzéssel.',
    variables: [
      'employeeName',
      'planTitle',
      'decisionLabel',
      'changeSummary',
      'reviewNote',
      'reviewerName',
      'scheduleLink',
      'loginLink',
      'loginButton',
    ],
    enabled: true,
    body: `${WRAPPER_OPEN}
<p>Kedves {{employeeName}}!</p>
<p>A <strong>{{planTitle}}</strong> beosztásra beadott módosítási kérelmed <strong>{{decisionLabel}}</strong>.</p>
<table style="border-collapse:collapse;margin:16px 0;font-size:14px">
  <tr><td style="padding:4px 12px 4px 0;color:#71717a">Kért változás</td><td style="padding:4px 0">{{changeSummary}}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#71717a">Elbírálta</td><td style="padding:4px 0">{{reviewerName}}</td></tr>
</table>
{{reviewNote}}
<p style="margin-top:24px">{{loginButton}}</p>
${WRAPPER_CLOSE}`,
  },
];

/** Renders the shared CTA buttons — kept out of the template body so links stay escapable. */
export function scheduleMailButton(href: string, label: string): string {
  return BUTTON(href, label);
}

export async function seedScheduleMailTemplates(options?: { overwrite?: boolean }): Promise<void> {
  await seedMailTemplates(SCHEDULE_MAIL_TEMPLATES, options);
}
