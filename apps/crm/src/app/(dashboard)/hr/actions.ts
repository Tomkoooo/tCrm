'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requireAnyPermission, requirePermission, getCurrentUser } from '@crm/auth';
import { connectDB, User } from '@crm/db-core';
import {
  createEmployee,
  updateEmployee,
  createTimeOffRequest,
  reviewTimeOff,
  cancelTimeOffRequest,
  getEmployeeForUser,
  createCompany,
  updateCompany,
  ensureDefaultCompany,
  upsertRosterShift,
  deleteRosterShift,
  checkAssignmentConflicts,
  upsertEmployeeLeaveYear,
  submitScheduleChangeRequest,
  cancelScheduleChangeRequest,
  reviewScheduleChangeRequest,
  setActiveEmployeeForUser,
  addEmployeeToCompany,
  previewLeaveImport,
  matchLeaveImportPreview,
  commitLeaveImport,
  listMembershipsForUser,
  HR_WRITE_PERMISSION_KEYS,
  HR_APPROVE_PERMISSION_KEYS,
} from '@crm/hr';
import {
  companySchema,
  employeeSchema,
  timeOffRequestSchema,
  timeOffReviewSchema,
  rosterShiftSchema,
  scheduleChangeRequestSchema,
  scheduleChangeReviewSchema,
  leaveYearUpsertSchema,
} from '@crm/lib/validation';
import { parseHrDateTime } from '@crm/lib';

export type HrFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function revalidateHr() {
  revalidatePath('/hr');
  revalidatePath('/hr/people');
  revalidatePath('/hr/calendar');
  revalidatePath('/hr/leave');
  revalidatePath('/hr/leave-summary');
  revalidatePath('/hr/me');
  revalidatePath('/hr/companies');
  revalidatePath('/hr/hours');
}

export async function createCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const parsed = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    isActive: formData.get('isActive') ?? 'true',
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    const company = await createCompany(parsed.data);
    revalidateHr();
    return { success: true, message: 'Cég létrehozva.', id: String(company._id) };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function updateCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const id = String(formData.get('id') ?? '');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }
  const parsed = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    isActive: formData.get('isActive') ?? 'true',
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    await updateCompany(id, parsed.data);
    revalidateHr();
    return { success: true, message: 'Cég mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function createEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  await ensureDefaultCompany();
  const parsed = employeeSchema.safeParse({
    name: formData.get('name'),
    companyId: formData.get('companyId'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    userId: formData.get('userId') || undefined,
    scheduleMode: formData.get('scheduleMode') || 'logistics',
    calendarColor: formData.get('calendarColor') || undefined,
    isActive: formData.get('isActive') ?? 'true',
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const emp = await createEmployee(parsed.data);
    revalidateHr();
    return { success: true, message: 'Dolgozó létrehozva.', id: String(emp._id) };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function updateEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const id = String(formData.get('id') ?? '');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  const parsed = employeeSchema.safeParse({
    name: formData.get('name'),
    companyId: formData.get('companyId'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    userId: formData.get('userId') || undefined,
    scheduleMode: formData.get('scheduleMode') || 'logistics',
    calendarColor: formData.get('calendarColor') || undefined,
    isActive: formData.get('isActive') ?? 'true',
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    await updateEmployee(id, {
      ...parsed.data,
      userId: parsed.data.userId ?? '',
    });
    revalidateHr();
    revalidatePath(`/hr/people/${id}`);
    return { success: true, message: 'Dolgozó mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function addEmployeeToCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const sourceEmployeeId = String(formData.get('sourceEmployeeId') ?? '');
  const targetCompanyId = String(formData.get('targetCompanyId') ?? '');
  const scheduleMode = String(formData.get('scheduleMode') || 'logistics') as
    | 'logistics'
    | 'roster';
  try {
    const emp = await addEmployeeToCompany({
      sourceEmployeeId,
      targetCompanyId,
      scheduleMode,
    });
    revalidateHr();
    return { success: true, message: 'Tagság létrehozva.', id: String(emp._id) };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function requestTimeOffAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const canWrite = HR_WRITE_PERMISSION_KEYS.some((k) => user.permissions.includes(k));
  const memberships = await listMembershipsForUser(user.id);

  const parsed = timeOffRequestSchema.safeParse({
    employeeId: formData.get('employeeId') || undefined,
    type: formData.get('type'),
    start: formData.get('start'),
    end: formData.get('end'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let employeeId = parsed.data.employeeId;
  if (!employeeId) {
    const me = await getEmployeeForUser(user.id);
    if (!me) return { success: false, message: 'Nincs hozzárendelt dolgozó profilja.' };
    employeeId = String(me._id);
  } else if (!canWrite) {
    if (!memberships.some((m) => String(m._id) === employeeId)) {
      return { success: false, message: 'Csak saját kérelem adható be.' };
    }
  }

  try {
    const start = parseHrDateTime(
      parsed.data.start.includes('T') ? parsed.data.start : `${parsed.data.start}T00:00:00`
    );
    const end = parseHrDateTime(
      parsed.data.end.includes('T') ? parsed.data.end : `${parsed.data.end}T23:59:59`
    );
    await createTimeOffRequest({
      employeeId,
      type: parsed.data.type,
      start,
      end,
      note: parsed.data.note,
      requestedBy: user.id,
      autoApprove: canWrite && formData.get('autoApprove') === 'true',
    });
    revalidateHr();
    return { success: true, message: 'Kérelem elküldve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Kérelem sikertelen.' };
  }
}

export async function reviewTimeOffAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requireAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);
  const parsed = timeOffReviewSchema.safeParse({
    id: formData.get('id'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    await reviewTimeOff(parsed.data.id, parsed.data.decision, user.id);
    revalidateHr();
    return {
      success: true,
      message: parsed.data.decision === 'approved' ? 'Jóváhagyva.' : 'Elutasítva.',
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Elbírálás sikertelen.',
    };
  }
}

export async function cancelTimeOffAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const id = String(formData.get('id') ?? '');
  try {
    await cancelTimeOffRequest(id, user.id);
    revalidateHr();
    return { success: true, message: 'Kérelem visszavonva.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function saveRosterShiftAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requirePermission('hr:write');
  const parsed = rosterShiftSchema.safeParse({
    id: formData.get('id') || undefined,
    employeeId: formData.get('employeeId'),
    start: formData.get('start'),
    end: formData.get('end'),
    kind: formData.get('kind') || 'shift',
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const start = parseHrDateTime(parsed.data.start);
    const end = parseHrDateTime(parsed.data.end);
    const { blockers } = await checkAssignmentConflicts({
      employeeIds: [parsed.data.employeeId],
      start,
      end,
      ignoreScheduleEntryId: parsed.data.id,
      blockOnShiftOverlap: true,
    });
    if (blockers.length) {
      return { success: false, message: blockers.map((b) => b.message).join(' ') };
    }
    const entry = await upsertRosterShift({
      id: parsed.data.id,
      employeeId: parsed.data.employeeId,
      start,
      end,
      kind: parsed.data.kind,
      title: parsed.data.title,
      notes: parsed.data.notes,
      actorUserId: user.id,
    });
    revalidateHr();
    return { success: true, message: 'Műszak mentve.', id: String(entry._id) };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function deleteRosterShiftAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requirePermission('hr:write');
  const id = String(formData.get('id') ?? '');
  try {
    await deleteRosterShift(id, user.id);
    revalidateHr();
    return { success: true, message: 'Műszak törölve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Törlés sikertelen.' };
  }
}

export async function upsertLeaveYearAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requirePermission('hr:write');
  const parsed = leaveYearUpsertSchema.safeParse({
    employeeId: formData.get('employeeId'),
    year: formData.get('year'),
    entitlementDays: formData.get('entitlementDays'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    await upsertEmployeeLeaveYear({ ...parsed.data, updatedBy: user.id });
    revalidatePath('/hr/leave-summary');
    return { success: true, message: 'Éves keret mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function requestScheduleChangeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  const parsed = scheduleChangeRequestSchema.safeParse({
    scheduleEntryId: formData.get('scheduleEntryId'),
    proposedStart: formData.get('proposedStart'),
    proposedEnd: formData.get('proposedEnd'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    await submitScheduleChangeRequest({
      scheduleEntryId: parsed.data.scheduleEntryId,
      proposedStart: parseHrDateTime(parsed.data.proposedStart),
      proposedEnd: parseHrDateTime(parsed.data.proposedEnd),
      note: parsed.data.note,
      requestedBy: user.id,
    });
    revalidateHr();
    return { success: true, message: 'Módosítási kérelem elküldve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function reviewScheduleChangeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requireAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);
  const parsed = scheduleChangeReviewSchema.safeParse({
    id: formData.get('id'),
    decision: formData.get('decision'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    await reviewScheduleChangeRequest(parsed.data.id, parsed.data.decision, user.id);
    revalidateHr();
    return { success: true, message: 'Elbírálva.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function cancelScheduleChangeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  try {
    await cancelScheduleChangeRequest(String(formData.get('id') ?? ''), user.id);
    revalidateHr();
    return { success: true, message: 'Visszavonva.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function setActiveMembershipAction(employeeId: string): Promise<HrFormState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: 'Unauthorized' };
  try {
    await setActiveEmployeeForUser(user.id, employeeId);
    revalidatePath('/hr/me');
    return { success: true, message: 'Aktív tagság frissítve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Sikertelen.' };
  }
}

export async function previewLeaveImportAction(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  preview?: Awaited<ReturnType<typeof matchLeaveImportPreview>>;
}> {
  await requirePermission('hr:write');
  const file = formData.get('file');
  if (!(file instanceof File)) return { success: false, message: 'Fájl kötelező.' };
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const raw = previewLeaveImport(buffer);
    const preview = await matchLeaveImportPreview(raw);
    return { success: true, preview };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Import hiba.' };
  }
}

export async function commitLeaveImportAction(rowsJson: string): Promise<HrFormState> {
  const user = await requirePermission('hr:write');
  try {
    const rows = JSON.parse(rowsJson) as Parameters<typeof commitLeaveImport>[0]['rows'];
    const result = await commitLeaveImport({ rows, actorUserId: user.id });
    revalidateHr();
    return {
      success: true,
      message: `Keret: ${result.entitlementsUpdated}, nap: ${result.offEntriesCreated}, kihagyva: ${result.skipped}${
        result.errors.length ? `. Hibák: ${result.errors.slice(0, 3).join('; ')}` : ''
      }`,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Commit hiba.' };
  }
}

export async function searchUsersForEmployeeLinkAction(
  query: string
): Promise<Array<{ id: string; label: string; sublabel?: string }>> {
  await requirePermission('hr:write');
  await connectDB();
  const q = query.trim();
  const filter: Record<string, unknown> = { isActive: true };
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }
  const users = await User.find(filter)
    .sort({ name: 1 })
    .limit(30)
    .select({ name: 1, email: 1 })
    .lean()
    .exec();
  return users.map((u) => ({
    id: String(u._id),
    label: u.name || u.email,
    sublabel: u.email,
  }));
}
