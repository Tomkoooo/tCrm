import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type JobStatus = 'draft' | 'scheduled' | 'picked_up' | 'completed' | 'cancelled';

export type JobActivityKind =
  | 'created'
  | 'scheduled'
  | 'demand_changed'
  | 'pickup_checked_in'
  | 'return_checked_in'
  | 'feedback'
  | 'cancelled';

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
  /** Source warehouse chosen for this line (and its exploded kit components). */
  warehouseId?: Types.ObjectId;
}

/** Physical, exploded line — derived from demandLines on schedule. */
export interface IJobLine {
  productId: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
  /** Source warehouse for this line's pick — chosen per line, not per job. */
  warehouseId?: Types.ObjectId;
  gatheredQuantity: number;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
  /** Destination warehouse at return check-in; defaults to warehouseId. */
  returnWarehouseId?: Types.ObjectId;
}

export interface IJobFeedback {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface IJobActivity {
  _id: Types.ObjectId;
  kind: JobActivityKind;
  at: Date;
  actorUserId: Types.ObjectId;
  message?: string;
}

export interface ILogisticsJob extends Document {
  _id: Types.ObjectId;
  reference: string;
  eventName: string;
  siteAddress: string;
  note?: string;
  eventAt?: Date;
  pickupAt?: Date;
  returnAt?: Date;
  status: JobStatus;

  demandLines: IDemandLine[];
  lines: IJobLine[];

  pickupEmployeeId?: Types.ObjectId;
  dropoffEmployeeId?: Types.ObjectId;
  crewEmployeeIds: Types.ObjectId[];
  vehicleId?: Types.ObjectId;

  pickMovementIds: Types.ObjectId[];
  returnMovementIds: Types.ObjectId[];
  pickupCheckedInAt?: Date;
  pickupCheckedInBy?: Types.ObjectId;
  returnCheckedInAt?: Date;
  returnCheckedInBy?: Types.ObjectId;

  feedback: IJobFeedback[];
  activities: IJobActivity[];

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  },
  { _id: false }
);

const JobLineSchema = new Schema<IJobLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedQuantity: { type: Number, required: true, min: 0.000001 },
    isOptional: { type: Boolean, default: false },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    gatheredQuantity: { type: Number, default: 0, min: 0 },
    returnedQuantity: { type: Number, default: 0, min: 0 },
    checkedQuantity: { type: Number, default: 0, min: 0 },
    lostQuantity: { type: Number, default: 0, min: 0 },
    returnWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  },
  { _id: false }
);

const JobFeedbackSchema = new Schema<IJobFeedback>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    message: { type: String, required: true, maxlength: 4000 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true }
);

const JobActivitySchema = new Schema<IJobActivity>(
  {
    kind: { type: String, required: true, maxlength: 32 },
    at: { type: Date, required: true, default: Date.now },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, maxlength: 4000 },
  },
  { _id: true }
);

const LogisticsJobSchema = new Schema<ILogisticsJob>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    eventName: { type: String, required: true, trim: true, maxlength: 300 },
    siteAddress: { type: String, required: true, trim: true, maxlength: 500 },
    note: { type: String, maxlength: 2000 },
    eventAt: { type: Date },
    pickupAt: { type: Date },
    returnAt: { type: Date },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'scheduled', 'picked_up', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    demandLines: { type: [DemandLineSchema], default: [] },
    lines: { type: [JobLineSchema], default: [] },

    pickupEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    dropoffEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    crewEmployeeIds: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },

    pickMovementIds: [{ type: Schema.Types.ObjectId, ref: 'StockMovement' }],
    returnMovementIds: [{ type: Schema.Types.ObjectId, ref: 'StockMovement' }],
    pickupCheckedInAt: { type: Date },
    pickupCheckedInBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnCheckedInAt: { type: Date },
    returnCheckedInBy: { type: Schema.Types.ObjectId, ref: 'User' },

    feedback: { type: [JobFeedbackSchema], default: [] },
    activities: { type: [JobActivitySchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LogisticsJobSchema.index({ status: 1, createdAt: -1 });
LogisticsJobSchema.index({ eventName: 'text', siteAddress: 'text', reference: 'text' });
LogisticsJobSchema.index({ 'lines.warehouseId': 1 });
LogisticsJobSchema.index({ pickupEmployeeId: 1 });
LogisticsJobSchema.index({ dropoffEmployeeId: 1 });
LogisticsJobSchema.index({ crewEmployeeIds: 1 });

export const LogisticsJob =
  (mongoose.models.LogisticsJob as mongoose.Model<ILogisticsJob>) ||
  mongoose.model<ILogisticsJob>('LogisticsJob', LogisticsJobSchema);
