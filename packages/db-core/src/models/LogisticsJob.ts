import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** Event-level status (aggregated from pickups). */
export type JobStatus =
  | 'draft'
  | 'scheduled'
  | 'gathered'
  | 'picked_up'
  | 'delivered'
  | 'returning'
  | 'completed'
  | 'cancelled';

export type PickupStatus = JobStatus;

export const CREW_ROLES = ['director', 'pickup', 'driver', 'builder', 'dropoff'] as const;
export type CrewRole = (typeof CREW_ROLES)[number];

export type JobPlanStatus = 'draft' | 'proposed' | 'locked';

export type JobActivityKind =
  | 'demand_created'
  | 'demand_changed'
  | 'item_request'
  | 'item_request_resolved'
  | 'feedback'
  | 'plan_proposed'
  | 'plan_locked'
  | 'plan_regenerated'
  | 'handoff';

export type JobItemRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface IDemandKitComponent {
  productId: Types.ObjectId;
  quantity: number;
  note?: string;
}

/** Job-local BOM. Never written back to Product.components. */
export interface IDemandKit {
  name?: string;
  substitutionNote?: string;
  components: IDemandKitComponent[];
}

export interface IDemandLine {
  productId?: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
  note?: string;
  kit?: IDemandKit;
}

export interface IJobCrewMember {
  employeeId: Types.ObjectId;
  roles: CrewRole[];
}

export interface IJobActivity {
  _id: Types.ObjectId;
  kind: JobActivityKind;
  at: Date;
  actorUserId: Types.ObjectId;
  message?: string;
}

export interface IJobItemRequest {
  _id: Types.ObjectId;
  productId?: Types.ObjectId;
  quantity?: number;
  note: string;
  status: JobItemRequestStatus;
  requestedByUserId: Types.ObjectId;
  createdAt: Date;
  resolvedByUserId?: Types.ObjectId;
  resolvedAt?: Date;
}

export interface IJobLine {
  productId: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
  gatheredQuantity: number;
  installedQuantity: number;
  installedLocation?: string;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
  /** Qty already on the truck from a previous event — do not pick again from warehouse. */
  inboundHandoffQuantity?: number;
  returnWarehouseId?: Types.ObjectId;
  handoffJobId?: Types.ObjectId;
}

/** Future email / PDF integration metadata (extensible). */
export interface ILogisticsPickupNotifications {
  /** Last outbound notification timestamp. */
  lastSentAt?: Date;
  /** e.g. scheduled | gathered | pickup_reminder */
  lastKind?: string;
  /** Queued kinds for a future mail worker. */
  pendingKinds?: string[];
  /** Resolved recipients when notification was queued (warehouse staff + team + contacts). */
  pendingRecipientEmails?: string[];
}

export interface ILogisticsPickupDocuments {
  packingListGeneratedAt?: Date;
  pickupSlipGeneratedAt?: Date;
  returnSlipGeneratedAt?: Date;
  /** GridFS or external URL when PDF pipeline exists */
  packingListUrl?: string;
  returnSlipUrl?: string;
}

/** One warehouse pickup leg: team + vehicle + line subset. */
export interface ILogisticsPickup {
  _id: Types.ObjectId;
  /** Stable sub-reference for PDF/email, e.g. JOB-2026-0001-P01 */
  reference: string;
  label?: string;
  warehouseId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  /** Assigned crew as Employee ids (HR people directory). */
  employeeIds: Types.ObjectId[];
  /** Derived User ids from Employee.userId — kept for mail/documents. */
  teamMemberIds: Types.ObjectId[];
  status: PickupStatus;
  lines: IJobLine[];
  contactEmails?: string[];
  note?: string;
  pickMovementId?: Types.ObjectId;
  returnMovementId?: Types.ObjectId;
  vehicleBookingId?: Types.ObjectId;
  /** Set when the suggested vehicle was already booked or cargo does not fit. */
  vehicleWarning?: string;
  notifications?: ILogisticsPickupNotifications;
  documents?: ILogisticsPickupDocuments;
  scheduledAt?: Date;
  plannedGatherAt?: Date;
  plannedEventAt?: Date;
  plannedReturnAt?: Date;
  gatheredAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  returningAt?: Date;
  completedAt?: Date;
}

export interface ILogisticsJob extends Document {
  _id: Types.ObjectId;
  reference: string;
  eventName: string;
  siteAddress: string;
  status: JobStatus;
  pickups: ILogisticsPickup[];
  note?: string;
  plannedEventAt?: Date;
  plannedGatherAt?: Date;
  plannedReturnAt?: Date;
  planStatus: JobPlanStatus;
  demandLines: IDemandLine[];
  /** Frozen copy of demand at first lock — used for original vs changed. */
  originalDemandLines: IDemandLine[];
  crew: IJobCrewMember[];
  activities: IJobActivity[];
  itemRequests: IJobItemRequest[];
  feedback?: string;
  createdBy: Types.ObjectId;
  scheduledAt?: Date;
  gatheredAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  returningAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  /** @deprecated Legacy single-pickup fields — migrated into `pickups` on read */
  sourceWarehouseId?: Types.ObjectId;
  assignedVehicleId?: Types.ObjectId;
  assignedDriverId?: Types.ObjectId;
  lines?: IJobLine[];
  pickMovementId?: Types.ObjectId;
  returnMovementId?: Types.ObjectId;
}

const JobLineSchema = new Schema<IJobLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedQuantity: { type: Number, required: true, min: 0.000001 },
    isOptional: { type: Boolean, default: false },
    gatheredQuantity: { type: Number, default: 0, min: 0 },
    installedQuantity: { type: Number, default: 0, min: 0 },
    installedLocation: { type: String, maxlength: 500 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    checkedQuantity: { type: Number, default: 0, min: 0 },
    lostQuantity: { type: Number, default: 0, min: 0 },
    inboundHandoffQuantity: { type: Number, default: 0, min: 0 },
    returnWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    handoffJobId: { type: Schema.Types.ObjectId, ref: 'LogisticsJob' },
  },
  { _id: false }
);

const PickupNotificationsSchema = new Schema<ILogisticsPickupNotifications>(
  {
    lastSentAt: { type: Date },
    lastKind: { type: String, maxlength: 64 },
    pendingKinds: [{ type: String, maxlength: 64 }],
    pendingRecipientEmails: [{ type: String, maxlength: 320 }],
  },
  { _id: false }
);

const PickupDocumentsSchema = new Schema<ILogisticsPickupDocuments>(
  {
    packingListGeneratedAt: { type: Date },
    pickupSlipGeneratedAt: { type: Date },
    returnSlipGeneratedAt: { type: Date },
    packingListUrl: { type: String, maxlength: 2000 },
    returnSlipUrl: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const LogisticsPickupSchema = new Schema<ILogisticsPickup>(
  {
    reference: { type: String, required: true, maxlength: 32 },
    label: { type: String, maxlength: 200 },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    employeeIds: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    teamMemberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      required: true,
      enum: [
        'draft',
        'scheduled',
        'gathered',
        'picked_up',
        'delivered',
        'returning',
        'completed',
        'cancelled',
      ],
      default: 'draft',
    },
    lines: { type: [JobLineSchema], default: [] },
    contactEmails: [{ type: String, maxlength: 320 }],
    note: { type: String, maxlength: 2000 },
    pickMovementId: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
    returnMovementId: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
    vehicleBookingId: { type: Schema.Types.ObjectId, ref: 'VehicleBooking' },
    vehicleWarning: { type: String, maxlength: 500 },
    notifications: { type: PickupNotificationsSchema, default: () => ({}) },
    documents: { type: PickupDocumentsSchema, default: () => ({}) },
    scheduledAt: { type: Date },
    plannedGatherAt: { type: Date },
    plannedEventAt: { type: Date },
    plannedReturnAt: { type: Date },
    gatheredAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    returningAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: true, strict: false }
);

const DemandKitComponentSchema = new Schema<IDemandKitComponent>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    note: { type: String, maxlength: 500 },
  },
  { _id: false }
);

const DemandKitSchema = new Schema<IDemandKit>(
  {
    name: { type: String, maxlength: 300 },
    substitutionNote: { type: String, maxlength: 2000 },
    components: { type: [DemandKitComponentSchema], default: [] },
  },
  { _id: false }
);

const DemandLineSchema = new Schema<IDemandLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    requestedQuantity: { type: Number, required: true, min: 0.000001 },
    isOptional: { type: Boolean, default: false },
    note: { type: String, maxlength: 500 },
    kit: { type: DemandKitSchema },
  },
  { _id: false }
);

const JobCrewMemberSchema = new Schema<IJobCrewMember>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    roles: {
      type: [String],
      enum: ['director', 'pickup', 'driver', 'builder', 'dropoff'],
      default: [],
    },
  },
  { _id: false }
);

const JobActivitySchema = new Schema<IJobActivity>(
  {
    kind: { type: String, required: true, maxlength: 64 },
    at: { type: Date, required: true, default: Date.now },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, maxlength: 4000 },
  },
  { _id: true }
);

const JobItemRequestSchema = new Schema<IJobItemRequest>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, min: 0 },
    note: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    resolvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { _id: true }
);

const LogisticsJobSchema = new Schema<ILogisticsJob>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    eventName: { type: String, required: true, trim: true, maxlength: 300 },
    siteAddress: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      required: true,
      enum: [
        'draft',
        'scheduled',
        'gathered',
        'picked_up',
        'delivered',
        'returning',
        'completed',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },
    pickups: { type: [LogisticsPickupSchema], default: [] },
    note: { type: String, maxlength: 2000 },
    plannedEventAt: { type: Date },
    plannedGatherAt: { type: Date },
    plannedReturnAt: { type: Date },
    planStatus: {
      type: String,
      required: true,
      enum: ['draft', 'proposed', 'locked'],
      default: 'draft',
      index: true,
    },
    demandLines: { type: [DemandLineSchema], default: [] },
    originalDemandLines: { type: [DemandLineSchema], default: [] },
    crew: { type: [JobCrewMemberSchema], default: [] },
    activities: { type: [JobActivitySchema], default: [] },
    itemRequests: { type: [JobItemRequestSchema], default: [] },
    feedback: { type: String, maxlength: 8000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date },
    gatheredAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    returningAt: { type: Date },
    completedAt: { type: Date },
    // Legacy (optional)
    sourceWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    assignedVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    assignedDriverId: { type: Schema.Types.ObjectId, ref: 'User' },
    lines: { type: [JobLineSchema] },
    pickMovementId: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
    returnMovementId: { type: Schema.Types.ObjectId, ref: 'StockMovement' },
  },
  { timestamps: true, strict: false }
);

LogisticsJobSchema.index({ status: 1, createdAt: -1 });
LogisticsJobSchema.index({ eventName: 'text', siteAddress: 'text', reference: 'text' });
LogisticsJobSchema.index({ 'pickups.reference': 1 });
LogisticsJobSchema.index({ 'pickups.warehouseId': 1 });
LogisticsJobSchema.index({ 'pickups.teamMemberIds': 1 });
LogisticsJobSchema.index({ 'pickups.employeeIds': 1 });
LogisticsJobSchema.index({ 'pickups.lines.productId': 1 });
LogisticsJobSchema.index({ 'crew.employeeId': 1 });
LogisticsJobSchema.index({ planStatus: 1, createdAt: -1 });

export const LogisticsJob =
  (mongoose.models.LogisticsJob as mongoose.Model<ILogisticsJob>) ||
  mongoose.model<ILogisticsJob>('LogisticsJob', LogisticsJobSchema);
