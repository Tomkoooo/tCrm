import type { Types } from 'mongoose';
import { connectDB } from '@crm/db-core';
import {
  ScheduleEntry,
  type IScheduleEntry,
  type ScheduleEntryKind,
  type ScheduleEntrySourceRef,
  type IScheduleLocationVisit,
} from './models/ScheduleEntry';

export type CreateScheduleEntryInput = {
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  start: Date;
  end: Date;
  allDay?: boolean;
  kind?: ScheduleEntryKind;
  title?: string;
  notes?: string;
  locationLabel?: string;
  locationAddress?: string;
  locations?: IScheduleLocationVisit[];
  sourceRef?: ScheduleEntrySourceRef;
  createdBy: Types.ObjectId;
};

/** Any module can create a shift for an employee by tagging it with its own sourceRef. */
export async function createScheduleEntry(
  input: CreateScheduleEntryInput
): Promise<IScheduleEntry> {
  await connectDB();
  return ScheduleEntry.create({
    employeeId: input.employeeId,
    companyId: input.companyId,
    start: input.start,
    end: input.end,
    allDay: input.allDay ?? false,
    kind: input.kind ?? 'shift',
    title: input.title,
    notes: input.notes,
    locationLabel: input.locationLabel,
    locationAddress: input.locationAddress,
    locations: input.locations,
    sourceRef: input.sourceRef,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  });
}

export async function attachScheduleTag(
  entryId: Types.ObjectId,
  sourceRef: ScheduleEntrySourceRef,
  updatedBy: Types.ObjectId
): Promise<IScheduleEntry | null> {
  await connectDB();
  return ScheduleEntry.findByIdAndUpdate(
    entryId,
    { $set: { sourceRef, updatedBy } },
    { new: true }
  ).exec();
}

export async function listScheduleForEmployee(
  employeeId: Types.ObjectId,
  range?: { start: Date; end: Date }
): Promise<IScheduleEntry[]> {
  await connectDB();
  const filter: Record<string, unknown> = { employeeId };
  if (range) {
    filter.start = { $lt: range.end };
    filter.end = { $gt: range.start };
  }
  return ScheduleEntry.find(filter).sort({ start: 1 }).exec();
}

export async function listScheduleBySourceRef(
  module: string,
  refType: string,
  refId: Types.ObjectId
): Promise<IScheduleEntry[]> {
  await connectDB();
  return ScheduleEntry.find({
    'sourceRef.module': module,
    'sourceRef.refType': refType,
    'sourceRef.refId': refId,
  }).exec();
}
