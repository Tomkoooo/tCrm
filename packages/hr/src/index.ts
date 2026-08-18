export {
  hrPermissions,
  HR_READ_PERMISSION_KEYS,
  HR_WRITE_PERMISSION_KEYS,
  HR_APPROVE_PERMISSION_KEYS,
  HR_SELF_PERMISSION_KEYS,
  HR_NAV_PERMISSION_KEYS,
} from './permissions';

export {
  ensureDefaultCompany,
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  slugifyCompanyName,
} from './companies';

export {
  createEmployee,
  updateEmployee,
  getEmployeeById,
  listEmployees,
  getEmployeeForUser,
  listMembershipsForUser,
  userHasEmployeeProfile,
  userOwnsEmployee,
  setActiveEmployeeForUser,
  addEmployeeToCompany,
  listSiblingMemberships,
  resolveUserIdsFromEmployees,
  type CreateEmployeeParams,
  type UpdateEmployeeParams,
} from './people';

export {
  createTimeOffRequest,
  reviewTimeOff,
  cancelTimeOffRequest,
  listTimeOff,
  getApprovedTimeOffOverlapping,
  type CreateTimeOffParams,
} from './time-off';

export {
  listScheduleEntries,
  listScheduleBySourceRef,
  removeScheduleBySourceRef,
  upsertJobScheduleEntry,
  upsertRosterShift,
  deleteRosterShift,
  type UpsertJobScheduleParams,
  type UpsertRosterShiftParams,
} from './schedule';

export {
  jobEventDisplayName,
  mergeJobScheduleEvents,
  type MergeableScheduleEvent,
} from './calendar-merge';

export {
  submitScheduleChangeRequest,
  cancelScheduleChangeRequest,
  reviewScheduleChangeRequest,
  listScheduleChangeRequests,
} from './schedule-change';

export {
  checkAssignmentConflicts,
  rangesOverlap,
  isValidObjectId,
  type AssignmentConflict,
  type CheckAssignmentConflictsParams,
} from './availability';

export {
  getMonthlyHours,
  getHrDashboardSummary,
  overlapHours,
  type MonthlyHoursRow,
} from './hours';

export { upsertEmployeeLeaveYear, getLeaveYear, listLeaveYears } from './leave-years';

export {
  buildLeaveSummary,
  getRemainingLeaveDays,
  computeRemainingDays,
  collectOffDaysFromEntries,
  collectTimeOffDays,
  MONTH_NAMES,
  type LeaveSummaryRow,
  type LeaveMonthCell,
} from './leave-summary';

export {
  previewLeaveImport,
  matchLeaveImportPreview,
  commitLeaveImport,
  type LeaveImportPreview,
  type LeaveImportMatchedRow,
  type LeaveImportCommitResult,
} from './leave-import';
