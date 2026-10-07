import crypto from 'node:crypto';
import {
  connectDB,
  Company,
  Employee,
  ScheduleEntry,
  User,
  type IEmployee,
  type IScheduleChangeRequest,
  type ISchedulePlan,
} from '@crm/db-core';
import { createMagicLink } from '@crm/auth/magic-link';
import { getAppUrl, sendTemplatedEmail } from '@crm/mail';
import { formatHrDateKey, formatScheduleChangeSummary } from '@crm/lib';
import type { Types } from 'mongoose';
import {
  cellKey,
  getPlanForEntry,
  getSchedulePlanGrid,
  markSchedulePlanPublished,
  type SchedulePlanCellDTO,
  type SchedulePlanGrid,
} from './schedule-plans';
import {
  SCHEDULE_MAIL_TEMPLATE_KEYS,
  scheduleMailButton,
  seedScheduleMailTemplates,
} from './schedule-mail-templates';

const DAY_NAMES_HU = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `2026-09-01` → `szept. 1., kedd` */
function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const month = new Intl.DateTimeFormat('hu-HU', { month: 'short', timeZone: 'UTC' }).format(date);
  return `${month} ${d}., ${DAY_NAMES_HU[date.getUTCDay()]}`;
}

export function formatPeriodLabel(plan: ISchedulePlan): string {
  const start = formatHrDateKey(plan.startDate);
  const end = formatHrDateKey(plan.endDate);
  return start === end ? start : `${start} – ${end}`;
}

/** `13:00–21:00`, with a marker when the shift runs into the next day. */
function formatCellTime(cell: SchedulePlanCellDTO): string {
  return `${cell.startTime}–${cell.endTime}${cell.overnight ? ' (+1 nap)' : ''}`;
}

/**
 * The roster table as HTML, from one employee's point of view: their own column
 * plus the day's shared event notes. Days off are shown as `—` so the recipient can
 * see the whole period rather than guessing at gaps.
 */
export function buildEmployeeScheduleTableHtml(grid: SchedulePlanGrid, employeeId: string): string {
  const rows: string[] = [];

  for (const dayKey of grid.dayKeys) {
    const cell = grid.cells.get(cellKey(employeeId, dayKey));
    const notes = grid.dayNotes.get(dayKey) ?? [];
    const working = Boolean(cell);
    const detail = [cell?.description, notes.join(' · ')].filter(Boolean).join(' — ');
    const muted = working ? '#18181b' : '#a1a1aa';

    rows.push(
      `<tr style="background:${working ? '#ffffff' : '#fafafa'}">` +
        `<td style="padding:7px 10px;border:1px solid #e4e4e7;white-space:nowrap">${escapeHtml(formatDayLabel(dayKey))}</td>` +
        `<td style="padding:7px 10px;border:1px solid #e4e4e7;font-weight:${working ? 600 : 400};color:${muted}">${escapeHtml(cell ? cell.place : '—')}</td>` +
        `<td style="padding:7px 10px;border:1px solid #e4e4e7;white-space:nowrap;color:${muted}">${escapeHtml(cell ? formatCellTime(cell) : '—')}</td>` +
        `<td style="padding:7px 10px;border:1px solid #e4e4e7;color:#52525b">${escapeHtml(detail)}</td>` +
        `</tr>`
    );
  }

  return (
    `<table style="border-collapse:collapse;margin:18px 0;font-size:13px;width:100%;max-width:620px">` +
    `<thead><tr style="background:#f4f4f5">` +
    `<th style="padding:7px 10px;border:1px solid #e4e4e7;text-align:left">Nap</th>` +
    `<th style="padding:7px 10px;border:1px solid #e4e4e7;text-align:left">Helyszín</th>` +
    `<th style="padding:7px 10px;border:1px solid #e4e4e7;text-align:left">Időpont</th>` +
    `<th style="padding:7px 10px;border:1px solid #e4e4e7;text-align:left">Leírás / esemény</th>` +
    `</tr></thead><tbody>${rows.join('')}</tbody></table>`
  );
}

/** Stable secret for an employee's personal read-only calendar feed. */
export async function ensureEmployeeCalendarToken(
  employeeId: Types.ObjectId | string
): Promise<string> {
  await connectDB();
  const employee = await Employee.findById(employeeId).exec();
  if (!employee) throw new Error('Dolgozó nem található.');
  if (employee.calendarFeedToken) return employee.calendarFeedToken;

  employee.calendarFeedToken = crypto.randomBytes(24).toString('hex');
  await employee.save();
  return employee.calendarFeedToken;
}

export function calendarFeedPath(token: string): string {
  return `/api/calendar/${token}.ics`;
}

export type SchedulePublishRecipientResult = {
  employeeId: string;
  employeeName: string;
  email?: string;
  shiftCount: number;
  sent: boolean;
  skippedReason?: string;
};

export type SchedulePublishResult = {
  plan: ISchedulePlan;
  recipients: SchedulePublishRecipientResult[];
  sentCount: number;
  skippedCount: number;
};

export type PublishSchedulePlanParams = {
  planId: Types.ObjectId | string;
  actorUserId: Types.ObjectId | string;
  /** Limit the send to these employees (default: everyone on the plan). */
  employeeIds?: string[];
  /** Skip employees with no shifts in the period. */
  skipEmptyColumns?: boolean;
};

/**
 * Publishes a plan and mails each employee their own column, with a magic sign-in
 * link, calendar subscription links and a change-request pointer.
 *
 * Mail failures never roll the publish back — the plan is the source of truth and a
 * failed recipient is reported so it can be re-sent.
 */
export async function publishSchedulePlan(
  params: PublishSchedulePlanParams
): Promise<SchedulePublishResult> {
  await connectDB();
  await seedScheduleMailTemplates();

  const grid = await getSchedulePlanGrid(params.planId);
  if (!grid) throw new Error('Beosztás nem található.');

  const appUrl = getAppUrl();
  const [company, publisher] = await Promise.all([
    Company.findById(grid.plan.companyId).select({ name: 1 }).lean().exec(),
    User.findById(params.actorUserId).select({ name: 1, email: 1 }).lean().exec(),
  ]);

  const requested = params.employeeIds?.length ? new Set(params.employeeIds) : undefined;
  const periodLabel = formatPeriodLabel(grid.plan);
  const isResend = grid.plan.publishCount > 0;
  const planId = String(grid.plan._id);

  const recipients: SchedulePublishRecipientResult[] = [];

  for (const employee of grid.employees) {
    const employeeId = String(employee._id);
    if (requested && !requested.has(employeeId)) continue;

    const shiftCount = grid.dayKeys.filter((d) => grid.cells.has(cellKey(employeeId, d))).length;
    const base = { employeeId, employeeName: employee.name, email: employee.email, shiftCount };

    if (params.skipEmptyColumns && shiftCount === 0) {
      recipients.push({ ...base, sent: false, skippedReason: 'Nincs műszak az időszakban' });
      continue;
    }
    if (!employee.email?.trim()) {
      recipients.push({ ...base, sent: false, skippedReason: 'Nincs e-mail cím a dolgozónál' });
      continue;
    }
    if (!employee.userId) {
      // Without a CRM login there is nobody to sign in as, so no magic link.
      recipients.push({
        ...base,
        sent: false,
        skippedReason: 'Nincs összekapcsolt CRM fiók (magic link nem készíthető)',
      });
      continue;
    }

    try {
      const schedulePath = `/hr/me/schedule/${planId}`;
      const { token } = await createMagicLink({
        userId: employee.userId,
        purpose: 'schedule',
        redirectTo: schedulePath,
        createdBy: params.actorUserId,
      });

      const feedToken = await ensureEmployeeCalendarToken(employee._id);
      const loginLink = `${appUrl}/auth/magic?token=${token}`;
      const scheduleLink = `${appUrl}${schedulePath}`;
      const calendarFeedUrl = `${appUrl}${calendarFeedPath(feedToken)}`;
      const icsDownloadUrl = `${appUrl}/api/calendar/plan/${planId}/${feedToken}.ics`;

      const result = await sendTemplatedEmail({
        templateKey: SCHEDULE_MAIL_TEMPLATE_KEYS.published,
        to: employee.email,
        actorUserId: params.actorUserId,
        variables: {
          employeeName: employee.name,
          planTitle: grid.plan.title,
          periodLabel,
          companyName: company?.name ?? '',
          scheduleTable: buildEmployeeScheduleTableHtml(grid, employeeId),
          shiftCount: String(shiftCount),
          planNotes: grid.plan.notes
            ? `<p style="padding:10px 14px;background:#f4f4f5;border-radius:6px">${escapeHtml(grid.plan.notes)}</p>`
            : '',
          subjectPrefix: isResend ? 'Módosult ' : '',
          publisherName: publisher?.name ?? 'A beosztás készítője',
          loginLink,
          loginButton: scheduleMailButton(loginLink, 'Beosztás megnyitása'),
          scheduleLink,
          calendarFeedUrl,
          calendarWebcalUrl: calendarFeedUrl.replace(/^https?:/, 'webcal:'),
          icsDownloadUrl,
        },
      });

      recipients.push({
        ...base,
        sent: result.sent,
        skippedReason: result.sent ? undefined : (result.reason ?? 'E-mail küldés sikertelen'),
      });
    } catch (err) {
      recipients.push({
        ...base,
        sent: false,
        skippedReason: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
    }
  }

  const plan = await markSchedulePlanPublished(grid.plan._id, params.actorUserId);

  return {
    plan,
    recipients,
    sentCount: recipients.filter((r) => r.sent).length,
    skippedCount: recipients.filter((r) => !r.sent).length,
  };
}

function noteBlock(label: string, note?: string): string {
  if (!note?.trim()) return '';
  return `<p style="padding:10px 14px;background:#f4f4f5;border-radius:6px"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(note.trim())}</p>`;
}

/** Tells the plan's publisher (falling back to its creator) that a change was requested. */
export async function notifyScheduleChangeRequested(
  request: IScheduleChangeRequest
): Promise<{ sent: boolean; reason?: string; to?: string }> {
  await connectDB();
  await seedScheduleMailTemplates();

  const [entry, employee] = await Promise.all([
    ScheduleEntry.findById(request.scheduleEntryId).exec(),
    Employee.findById(request.employeeId).select({ name: 1 }).lean().exec(),
  ]);

  const plan = entry ? await getPlanForEntry(entry) : null;

  const ownerUserId = plan?.publishedBy ?? plan?.createdBy;
  if (!ownerUserId) return { sent: false, reason: 'Nincs beosztás-felelős a kérelemhez' };

  const [owner, company] = await Promise.all([
    User.findById(ownerUserId).select({ email: 1, name: 1 }).lean().exec(),
    Company.findById(request.companyId).select({ name: 1 }).lean().exec(),
  ]);
  if (!owner?.email) return { sent: false, reason: 'A beosztás-felelősnek nincs e-mail címe' };

  const reviewLink = `${getAppUrl()}/hr/schedules/${String(plan!._id)}?tab=requests`;

  const result = await sendTemplatedEmail({
    templateKey: SCHEDULE_MAIL_TEMPLATE_KEYS.changeRequested,
    to: owner.email,
    actorUserId: request.requestedBy,
    variables: {
      employeeName: employee?.name ?? 'Dolgozó',
      planTitle: plan!.title,
      companyName: company?.name ?? '',
      changeSummary: formatScheduleChangeSummary(
        request.originalStart,
        request.originalEnd,
        request.proposedStart,
        request.proposedEnd
      ),
      requestNote: noteBlock('A dolgozó megjegyzése', request.note),
      reviewLink,
      reviewButton: scheduleMailButton(reviewLink, 'Kérelem elbírálása'),
    },
  });

  return { sent: result.sent, reason: result.reason, to: owner.email };
}

/** Tells the employee the decision, with the reviewer's feedback. */
export async function notifyScheduleChangeReviewed(
  request: IScheduleChangeRequest
): Promise<{ sent: boolean; reason?: string; to?: string }> {
  await connectDB();
  await seedScheduleMailTemplates();

  const employee = await Employee.findById(request.employeeId)
    .select({ name: 1, email: 1, userId: 1 })
    .lean()
    .exec();
  if (!employee?.email) return { sent: false, reason: 'A dolgozónak nincs e-mail címe' };

  const [entry, reviewer] = await Promise.all([
    ScheduleEntry.findById(request.scheduleEntryId).exec(),
    request.reviewedBy
      ? User.findById(request.reviewedBy).select({ name: 1, email: 1 }).lean().exec()
      : null,
  ]);

  const plan = entry ? await getPlanForEntry(entry) : null;

  const appUrl = getAppUrl();
  const schedulePath = plan ? `/hr/me/schedule/${String(plan._id)}` : '/hr/me';
  let loginLink = `${appUrl}${schedulePath}`;

  if (employee.userId) {
    const { token } = await createMagicLink({
      userId: employee.userId,
      purpose: 'schedule',
      redirectTo: schedulePath,
      createdBy: request.reviewedBy,
    });
    loginLink = `${appUrl}/auth/magic?token=${token}`;
  }

  const decisionLabel = request.status === 'approved' ? 'elfogadva' : 'elutasítva';

  const result = await sendTemplatedEmail({
    templateKey: SCHEDULE_MAIL_TEMPLATE_KEYS.changeReviewed,
    to: employee.email,
    actorUserId: request.reviewedBy,
    variables: {
      employeeName: employee.name,
      planTitle: plan?.title ?? 'Beosztás',
      decisionLabel,
      changeSummary: formatScheduleChangeSummary(
        request.originalStart,
        request.originalEnd,
        request.proposedStart,
        request.proposedEnd
      ),
      reviewNote: noteBlock('Visszajelzés', request.reviewNote),
      reviewerName: reviewer?.name ?? 'HR',
      scheduleLink: `${appUrl}${schedulePath}`,
      loginLink,
      loginButton: scheduleMailButton(loginLink, 'Beosztás megnyitása'),
    },
  });

  return { sent: result.sent, reason: result.reason, to: employee.email };
}

/** Employees on a plan that cannot receive mail, with the reason — shown before publishing. */
export function describeUnreachableEmployees(
  employees: IEmployee[]
): Array<{ employeeId: string; name: string; reason: string }> {
  const out: Array<{ employeeId: string; name: string; reason: string }> = [];
  for (const employee of employees) {
    if (!employee.email?.trim()) {
      out.push({ employeeId: String(employee._id), name: employee.name, reason: 'nincs e-mail' });
    } else if (!employee.userId) {
      out.push({ employeeId: String(employee._id), name: employee.name, reason: 'nincs CRM fiók' });
    }
  }
  return out;
}
