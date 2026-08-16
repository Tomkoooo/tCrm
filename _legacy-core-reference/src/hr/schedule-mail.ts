import {
  connectDB,
  Company,
  Employee,
  User,
  type IScheduleEntry,
  type ScheduleEntryKind,
} from '@crm/db';
import type { Types } from 'mongoose';
import { formatHrDateKey, formatHrTime, formatScheduleRange, getAppUrl } from '@crm/lib';
import { sendTemplatedEmail } from '../mail/mailer';
import { getActorEmail } from '../mail/recipients';

const KIND_LABELS: Record<ScheduleEntryKind, string> = {
  shift: 'Műszak',
  off: 'Szabad',
  training: 'Képzés',
  other: 'Egyéb',
  field_work: 'Helyszíni munka',
};

async function scheduleEntryVariables(
  entry: Pick<
    IScheduleEntry,
    | 'employeeId'
    | 'companyId'
    | 'start'
    | 'end'
    | 'allDay'
    | 'kind'
    | 'title'
    | 'locationLabel'
    | 'locationAddress'
  >,
  actorUserId?: Types.ObjectId,
  changeSummary?: string
): Promise<Record<string, string>> {
  await connectDB();
  const [emp, company, actor] = await Promise.all([
    Employee.findById(entry.employeeId).select({ name: 1, email: 1 }).lean().exec(),
    Company.findById(entry.companyId).select({ name: 1 }).lean().exec(),
    actorUserId
      ? User.findById(actorUserId).select({ name: 1 }).lean().exec()
      : Promise.resolve(null),
  ]);

  const title = entry.title ?? KIND_LABELS[entry.kind] ?? entry.kind;
  const locationParts = [entry.locationLabel, entry.locationAddress].filter(Boolean);

  return {
    employeeName: emp?.name ?? '',
    companyName: company?.name ?? '',
    scheduleTitle: title,
    scheduleKind: KIND_LABELS[entry.kind] ?? entry.kind,
    startAt: formatScheduleRange(entry.start, entry.end, entry.allDay ?? false),
    endAt: formatHrTime(entry.end),
    location: locationParts.join(' — ') || '—',
    changeSummary: changeSummary ?? '',
    myScheduleLink: `${getAppUrl()}/accounting/my`,
    actorName: actor?.name ?? '',
  };
}

async function notifyEmployee(
  templateKey: string,
  entry: IScheduleEntry,
  actorUserId?: Types.ObjectId,
  changeSummary?: string
): Promise<void> {
  await connectDB();
  const emp = await Employee.findById(entry.employeeId).select({ email: 1 }).lean().exec();
  const to = emp?.email?.trim();
  if (!to) return;

  const variables = await scheduleEntryVariables(entry, actorUserId, changeSummary);
  const actorEmail = await getActorEmail(actorUserId);

  await sendTemplatedEmail({
    templateKey,
    to: [to],
    variables,
    actorUserId,
    actorEmail,
  });
}

export async function notifyScheduleEntryCreated(
  entry: IScheduleEntry,
  actorUserId: Types.ObjectId
): Promise<void> {
  await notifyEmployee('hr_schedule_created', entry, actorUserId);
}

export async function notifyScheduleEntryUpdated(
  entry: IScheduleEntry,
  before: {
    start: Date;
    end: Date;
    kind: ScheduleEntryKind;
    title?: string;
    locationLabel?: string;
    locationAddress?: string;
  },
  actorUserId: Types.ObjectId
): Promise<void> {
  const parts: string[] = [];
  if (
    before.start.getTime() !== entry.start.getTime() ||
    before.end.getTime() !== entry.end.getTime()
  ) {
    parts.push(
      `Idő: ${formatScheduleRange(before.start, before.end)} → ${formatScheduleRange(entry.start, entry.end)}`
    );
  }
  if (before.kind !== entry.kind) {
    parts.push(`Típus: ${KIND_LABELS[before.kind]} → ${KIND_LABELS[entry.kind]}`);
  }
  if (before.title !== entry.title) {
    parts.push(`Cím: ${before.title ?? '—'} → ${entry.title ?? '—'}`);
  }
  if (
    before.locationAddress !== entry.locationAddress ||
    before.locationLabel !== entry.locationLabel
  ) {
    parts.push('Helyszín módosult');
  }

  await notifyEmployee(
    'hr_schedule_updated',
    entry,
    actorUserId,
    parts.join('; ') || 'Beosztás módosult'
  );
}

export async function notifyScheduleEntryDeleted(
  entry: IScheduleEntry,
  actorUserId: Types.ObjectId
): Promise<void> {
  await notifyEmployee('hr_schedule_deleted', entry, actorUserId);
}

export async function notifyHrRequestSubmitted(
  request: {
    _id: Types.ObjectId;
    type: string;
    companyId: Types.ObjectId;
    employeeId: Types.ObjectId;
    payload: {
      startDate?: Date;
      endDate?: Date;
      reason?: string;
    };
  },
  requestedByUserId: Types.ObjectId
): Promise<void> {
  await connectDB();
  const [emp, company, requester] = await Promise.all([
    Employee.findById(request.employeeId).select({ name: 1 }).lean().exec(),
    Company.findById(request.companyId).select({ name: 1 }).lean().exec(),
    User.findById(requestedByUserId).select({ name: 1 }).lean().exec(),
  ]);

  const typeLabels: Record<string, string> = {
    holiday: 'Szabadság',
    sick_leave: 'Betegszabadság',
    schedule_change: 'Beosztás módosítás',
  };

  const dateRange =
    request.payload.startDate && request.payload.endDate
      ? `${formatHrDateKey(request.payload.startDate)} – ${formatHrDateKey(request.payload.endDate)}`
      : '—';

  await sendTemplatedEmail({
    templateKey: 'hr_request_submitted',
    to: [],
    variables: {
      employeeName: emp?.name ?? '',
      companyName: company?.name ?? '',
      requestType: typeLabels[request.type] ?? request.type,
      dateRange,
      reason: request.payload.reason ?? '—',
      requestLink: `${getAppUrl()}/accounting/requests`,
      requesterName: requester?.name ?? '',
    },
    actorUserId: requestedByUserId,
  });
}
