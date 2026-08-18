import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { getApprovedTimeOffOverlapping } from './time-off';
import { listScheduleEntries } from './schedule';

export type AssignmentConflict =
  | { kind: 'leave'; employeeId: string; message: string }
  | { kind: 'double_job'; employeeId: string; message: string; otherTitle?: string }
  | { kind: 'shift_overlap'; employeeId: string; message: string; otherTitle?: string };

export type CheckAssignmentConflictsParams = {
  employeeIds: Array<Types.ObjectId | string>;
  start: Date;
  end: Date;
  ignorePickupId?: Types.ObjectId | string;
  /** When editing a roster shift, ignore that entry id. */
  ignoreScheduleEntryId?: Types.ObjectId | string;
  /** If true, overlapping shifts are blockers (roster CRUD). */
  blockOnShiftOverlap?: boolean;
};

function oidStr(id: Types.ObjectId | string): string {
  return typeof id === 'string' ? id : id.toString();
}

/**
 * Block on approved leave; warn on overlapping jobs;
 * optionally block on overlapping roster shifts.
 */
export async function checkAssignmentConflicts(
  params: CheckAssignmentConflictsParams
): Promise<{ blockers: AssignmentConflict[]; warnings: AssignmentConflict[] }> {
  const blockers: AssignmentConflict[] = [];
  const warnings: AssignmentConflict[] = [];

  for (const employeeId of params.employeeIds) {
    const leave = await getApprovedTimeOffOverlapping(employeeId, params.start, params.end);
    if (leave.length > 0) {
      blockers.push({
        kind: 'leave',
        employeeId: oidStr(employeeId),
        message: 'A dolgozó jóváhagyott szabadságon / betegszabadságon van ebben az időszakban.',
      });
    }

    const jobs = await listScheduleEntries({
      start: params.start,
      end: params.end,
      employeeId,
      kind: 'job',
    });

    const overlappingJobs = jobs.filter((entry) => {
      if (params.ignorePickupId && entry.sourceRef) {
        return entry.sourceRef.refId.toString() !== oidStr(params.ignorePickupId);
      }
      if (params.ignoreScheduleEntryId) {
        return entry._id.toString() !== oidStr(params.ignoreScheduleEntryId);
      }
      return true;
    });

    if (overlappingJobs.length > 0) {
      warnings.push({
        kind: 'double_job',
        employeeId: oidStr(employeeId),
        message: 'A dolgozó már hozzá van rendelve egy másik feladathoz ebben az időszakban.',
        otherTitle: overlappingJobs[0]?.title,
      });
    }

    const shifts = await listScheduleEntries({
      start: params.start,
      end: params.end,
      employeeId,
      kind: 'shift',
    });
    const overlappingShifts = shifts.filter((entry) => {
      if (!params.ignoreScheduleEntryId) return true;
      return entry._id.toString() !== oidStr(params.ignoreScheduleEntryId);
    });

    if (overlappingShifts.length > 0) {
      const conflict: AssignmentConflict = {
        kind: 'shift_overlap',
        employeeId: oidStr(employeeId),
        message: 'Átfedő roster műszak van ebben az időszakban.',
        otherTitle: overlappingShifts[0]?.title,
      };
      if (params.blockOnShiftOverlap) blockers.push(conflict);
      else warnings.push(conflict);
    }
  }

  return { blockers, warnings };
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}
