export {
  createReservation,
  releaseReservation,
  getActiveReservations,
  cleanupExpiredReservations,
  type CreateReservationParams,
} from './reservations';

export {
  createMovement,
  confirmMovement,
  cancelMovement,
  generateMovementReference,
  formatMovementReference,
  type CreateMovementParams,
} from './movements';

export {
  previewDemandAvailability,
  previewPickupWarehouseIssues,
  loadCatalogBom,
  type DemandAvailabilityRow,
  type DemandAvailabilityComponent,
  type PickupWarehouseIssue,
} from './demand-availability';

export { listActiveVehicles } from './vehicles';

export {
  getVehicleComplianceWarnings,
  canUserReportVehicleIncident,
  syncVehicleMedia,
  syncVehicleIncidentPhotos,
  listVehicleIncidents,
  createVehicleIncident,
  markVehicleIncidentFixed,
  countOpenVehicleIncidents,
  type VehicleComplianceWarning,
  type VehicleIncidentListItem,
} from './vehicle-management';

export {
  createLogisticsJob,
  updateJobDemand,
  assignJobEmployees,
  scheduleLogisticsJob,
  confirmPickupCheckIn,
  confirmReturnCheckIn,
  cancelLogisticsJob,
  submitJobFeedback,
  jobRolesForEmployees,
  getLogisticsKpiSummary,
  type CreateJobParams,
  type DemandLineInput,
  type AssignJobEmployeesParams,
  type PickupCheckInLineInput,
  type ReturnCheckInLineInput,
  type JobEmployeeRole,
} from './jobs';

export { sendJobAssignmentEmail } from './notifications';

export {
  enrichJobLinesDisplay,
  type JobLineDisplayItem,
  type JobLineBomComponent,
  type JobLineQuantityInput,
} from './job-line-display';

export {
  hasGlobalLogisticsScope,
  getWarehouseIdsForUser,
  buildLogisticsJobWarehouseFilter,
  buildLogisticsJobAccessFilter,
  canAccessJobWarehouse,
} from './warehouse-access';

export { syncLogisticsJobToEmployeeSchedules } from './logistics-schedule-sync';

export { explodeDemandLines, catalogComponentsForProduct } from './demand-explode';

export { generateJobReference, formatJobReference } from './job-references';

export type { JobStatus, JobActivityKind } from '@crm/db-core';

export {
  logisticsPermissions,
  LOGISTICS_READ_PERMISSION_KEYS,
  LOGISTICS_WRITE_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_READ_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS,
} from './permissions';

export {
  seedLogisticsMailTemplates,
  ensureLogisticsMailTemplatesSeeded,
  LOGISTICS_MAIL_TEMPLATES,
} from './mail-templates';
