export {
  hrPermissions,
  HR_READ_PERMISSION_KEYS,
  HR_WRITE_PERMISSION_KEYS,
  HR_APPROVE_PERMISSION_KEYS,
  HR_SELF_PERMISSION_KEYS,
  HR_NAV_PERMISSION_KEYS,
  HR_SCHEDULE_READ_PERMISSION_KEYS,
  HR_SCHEDULE_WRITE_PERMISSION_KEYS,
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
  listPlanChangeRequests,
} from './schedule-change';

export {
  createSchedulePlan,
  updateSchedulePlan,
  deleteSchedulePlan,
  getSchedulePlanById,
  getSchedulePlanGrid,
  getPlanForEntry,
  listSchedulePlans,
  listPlanEntries,
  markSchedulePlanPublished,
  upsertPlanCell,
  clearPlanCell,
  resolveCellWindow,
  addHoursToTime,
  planShiftHours,
  planStartTime,
  eachPlanDayKey,
  cellKey,
  isValidDayKey,
  isValidShiftTime,
  DEFAULT_SHIFT_HOURS,
  DEFAULT_START_TIME,
  SCHEDULE_PLAN_MODULE,
  SCHEDULE_PLAN_REF_TYPE,
  type SchedulePlanGrid,
  type SchedulePlanCellDTO,
  type CreateSchedulePlanParams,
  type UpdateSchedulePlanParams,
  type UpsertPlanCellParams,
} from './schedule-plans';

export {
  publishSchedulePlan,
  notifyScheduleChangeRequested,
  notifyScheduleChangeReviewed,
  buildEmployeeScheduleTableHtml,
  describeUnreachableEmployees,
  ensureEmployeeCalendarToken,
  calendarFeedPath,
  formatPeriodLabel,
  type SchedulePublishResult,
  type SchedulePublishRecipientResult,
  type PublishSchedulePlanParams,
} from './schedule-notify';

export {
  SCHEDULE_MAIL_TEMPLATES,
  SCHEDULE_MAIL_TEMPLATE_KEYS,
  seedScheduleMailTemplates,
  scheduleMailButton,
} from './schedule-mail-templates';

export {
  buildEmployeeCalendarFeed,
  buildPlanCalendarForEmployee,
  findEmployeeByCalendarToken,
  scheduleEntryToIcsEvent,
} from './schedule-ics';

export {
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
  type IcsEvent,
  type BuildIcsOptions,
} from './ics';

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
