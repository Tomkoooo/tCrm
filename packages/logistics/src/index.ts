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

export {
  suggestVehiclesForCargo,
  computeCargoTotals,
  evaluateVehicleFit,
  type CargoLineInput,
  type CargoTotals,
  type VehicleFitResult,
} from './vehicles';

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
  scheduleLogisticsJob,
  confirmPickupGathering,
  confirmPickupPickup,
  confirmPickupDelivery,
  updatePickupInstallation,
  confirmPickupReturnDeparture,
  confirmPickupCheckIn,
  confirmJobGathering,
  confirmJobPickup,
  confirmJobDelivery,
  updateJobInstallation,
  confirmJobReturnDeparture,
  confirmJobCheckIn,
  cancelLogisticsJob,
  getLogisticsKpiSummary,
  type CreateJobParams,
  type CreatePickupParams,
  type JobLineInput,
  type CheckInLineInput,
} from './jobs';

export { warehousePickQuantity, groupCheckInDestinations } from './check-in';

export {
  normalizeJobPickups,
  resolveJobPickups,
  getPickup,
  syncJobStatusFromPickups,
} from './job-pickups';

export {
  enqueueLogisticsNotification,
  markLogisticsNotificationSent,
  type LogisticsNotificationKind,
  type LogisticsNotificationPayload,
} from './notifications';

export {
  resolvePickupNotificationEmails,
  pickupToRecipientInput,
  type PickupRecipientInput,
} from './notification-recipients';

export {
  buildLogisticsPickupDocument,
  markPickupDocumentGenerated,
  type LogisticsPickupDocumentPayload,
} from './documents';

export { generateJobReference, formatJobReference, formatPickupReference } from './job-references';

export {
  enrichPickupLinesDisplay,
  type PickupLineDisplayItem,
  type PickupBomComponent,
  type PickupLineQuantityInput,
} from './pickup-line-display';

export {
  hasGlobalLogisticsScope,
  getWarehouseIdsForUser,
  buildLogisticsJobWarehouseFilter,
  buildLogisticsJobAccessFilter,
  canAccessPickupWarehouse,
} from './warehouse-access';

export {
  syncLogisticsJobToEmployeeSchedules,
  resolvePickupScheduleWindow,
} from './logistics-schedule-sync';

export { explodeDemandLines, catalogComponentsForProduct } from './demand-explode';

export {
  createDemandJob,
  proposeJobPlan,
  previewPickupPlan,
  lockJobPlan,
  updateJobDemand,
  requestJobItems,
  resolveJobItemRequest,
  submitJobFeedback,
  updatePickupVehicle,
  crewRolesOnJob,
  crewRolesOnJobForEmployees,
  findEventReservation,
  type CreateDemandJobParams,
  type DemandLineInput,
  type CrewMemberInput,
  type PreviewPickupPlanResult,
  type DraftPickupRoundInput,
} from './job-plan';

export { CREW_ROLE_LABELS, CREW_ROLES, isCrewRole, assertValidCrew, memberHasRole } from './crew';

export {
  resolveFieldActor,
  canPerformCrewRole,
  assertCanPerformCrewRole,
  loadJobOrThrow,
  type FieldActor,
} from './field-access';

export {
  isVehicleBooked,
  createVehicleBooking,
  cancelVehicleBookingsForJob,
  listBookingsForJob,
} from './vehicle-bookings';

export type { CrewRole, JobPlanStatus, JobActivityKind } from '@crm/db-core';

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
