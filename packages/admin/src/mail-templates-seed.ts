import { seedMailTemplates, type BaselineMailTemplate } from '@crm/mail';

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
];

export async function seedEngineMailTemplates(): Promise<void> {
  await seedMailTemplates(BASELINE_MAIL_TEMPLATES);
}
