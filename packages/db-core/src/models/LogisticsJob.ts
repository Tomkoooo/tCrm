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

export interface IJobLine {
  productId: Types.ObjectId;
  requestedQuantity: number;
  gatheredQuantity: number;
  installedQuantity: number;
  installedLocation?: string;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
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
  teamMemberIds: Types.ObjectId[];
  status: PickupStatus;
  lines: IJobLine[];
  contactEmails?: string[];
  note?: string;
  pickMovementId?: Types.ObjectId;
  returnMovementId?: Types.ObjectId;
  notifications?: ILogisticsPickupNotifications;
  documents?: ILogisticsPickupDocuments;
  scheduledAt?: Date;
  plannedGatherAt?: Date;
  plannedEventAt?: Date;
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
    gatheredQuantity: { type: Number, default: 0, min: 0 },
    installedQuantity: { type: Number, default: 0, min: 0 },
    installedLocation: { type: String, maxlength: 500 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    checkedQuantity: { type: Number, default: 0, min: 0 },
    lostQuantity: { type: Number, default: 0, min: 0 },
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
    notifications: { type: PickupNotificationsSchema, default: () => ({}) },
    documents: { type: PickupDocumentsSchema, default: () => ({}) },
    scheduledAt: { type: Date },
    plannedGatherAt: { type: Date },
    plannedEventAt: { type: Date },
    gatheredAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    returningAt: { type: Date },
    completedAt: { type: Date },
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
  { timestamps: true }
);

LogisticsJobSchema.index({ status: 1, createdAt: -1 });
LogisticsJobSchema.index({ eventName: 'text', siteAddress: 'text', reference: 'text' });
LogisticsJobSchema.index({ 'pickups.reference': 1 });
LogisticsJobSchema.index({ 'pickups.warehouseId': 1 });
LogisticsJobSchema.index({ 'pickups.teamMemberIds': 1 });
LogisticsJobSchema.index({ 'pickups.lines.productId': 1 });

export const LogisticsJob =
  (mongoose.models.LogisticsJob as mongoose.Model<ILogisticsJob>) ||
  mongoose.model<ILogisticsJob>('LogisticsJob', LogisticsJobSchema);
