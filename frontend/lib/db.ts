import mongoose, { Schema, Model } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = globalThis.mongooseConnection;

if (!cached) {
  cached = globalThis.mongooseConnection = { conn: null, promise: null };
}

const mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (mongooseCache.conn) {
    return mongooseCache.conn;
  }

  if (!mongooseCache.promise) {
    const opts = {
      bufferCommands: false,
    };
    mongooseCache.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    mongooseCache.conn = await mongooseCache.promise;
  } catch (e) {
    mongooseCache.promise = null;
    throw e;
  }

  return mongooseCache.conn;
}

// Interfaces
export interface IUser {
  _id: string; // walletAddress (lowercase)
  walletAddress?: string; // virtual
  /** Personal/contact name for individuals; primary contact person name for merchants. */
  fullName: string;
  /**
   * Company display name — merchants only. Always distinct from fullName.
   * null for individual (role === "user") accounts.
   */
  companyName: string | null;
  username: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  subscriptionActive: boolean;
  role: "user" | "merchant";
  /**
   * Plan tiers:
   * - "free": Bootstrap free plan (100 shipments/mo)
   * - "pro_starter": Pro Starter (0-999 shipments/mo)
   * - "pro_growth": Pro Growth (1,000-4,999 shipments/mo)
   * - "pro_scale": Pro Scale (5,000+ shipments/mo)
   * - "pro": Legacy Pro alias
   * - "enterprise": Reserved future enterprise tier
   */
  plan: "free" | "pro_starter" | "pro_growth" | "pro_scale" | "pro" | "enterprise";
  billingCycle: "monthly" | "yearly";
  billingCycleStart: Date;
  shipmentsThisMonth: number;
  rolloverQuota: number;
  overageCharges: number;
  apiKey?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IItem {
  _id: string; // registrationId
  registrationId?: string; // virtual
  ownerAddress: string;
  name: string;
  brand: string | null;
  serial: string | null;
  reward: string | null;
  contactInfo: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instructions: string | null;
  itemHash: string;
  status: string;
  category: string;
  alternateContact: string | null;
  receiptData: string | null;
  secrets: string | null;
  passphrase: string | null;
  image: string | null;
  rewardType: string;
  isActiveQr: boolean;
  unlockedForCurrentLostCycle: boolean;
  showPublicContact?: boolean;
  publicContactMethod?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFinderReport {
  _id: string; // reportId (uuid)
  reportId?: string; // virtual
  registrationId: string;
  message: string;
  contactInfo: string | null;
  location: string | null;
  locationContext?: string | null;
  photo: string | null;
  unlocked: boolean;
  deliveryMethod?: "meetup" | "courier";
  courierDetails?: string | null;
  createdAt?: Date;
}

export interface INotification {
  _id: string; // id (uuid)
  id?: string; // virtual
  ownerAddress: string;
  registrationId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt?: Date;
}

export interface IPushSubscription {
  _id: string; // id (uuid)
  id?: string; // virtual
  ownerAddress: string;
  endpoint: string;
  keys: string;
  createdAt?: Date;
}

export interface IShipmentEvent {
  event: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  operator: string;
  location?: string | null;
  locationContext?: string | null;
  timestamp: Date;
  onChainTxHash?: string | null;
}

export interface IShipment {
  _id: string; // packageId
  packageId?: string; // virtual
  shipperAddress: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  innerSecret?: string | null;
  innerSecretHash: string;
  metadata?: Record<string, unknown> | null;
  events: IShipmentEvent[];
  webhookUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schemas
const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    /** Personal/contact name for individuals; primary contact person name for merchants. */
    fullName: { type: String, required: true },
    /**
     * Company display name — merchants only. null for individual accounts.
     * Always distinct from fullName so company identity is never mixed with personal identity.
     */
    companyName: { type: String, default: null },
    username: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    subscriptionActive: { type: Boolean, default: false },
    // Index on role enables efficient merchant-only queries (e.g., shipment create guard)
    role: { type: String, enum: ["user", "merchant"], default: "user", index: true },
    plan: {
      type: String,
      enum: ["free", "pro_starter", "pro_growth", "pro_scale", "pro", "enterprise"],
      default: "free",
    },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    billingCycleStart: { type: Date, default: Date.now },
    shipmentsThisMonth: { type: Number, default: 0 },
    rolloverQuota: { type: Number, default: 0 },
    overageCharges: { type: Number, default: 0 },
    apiKey: { type: String, default: null, index: true },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    stripePriceId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("walletAddress")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

const ItemSchema = new Schema<IItem>(
  {
    _id: { type: String, required: true },
    ownerAddress: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: null },
    serial: { type: String, default: null },
    reward: { type: String, default: null },
    contactInfo: { type: String, default: null },
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    instructions: { type: String, default: null },
    itemHash: { type: String, required: true },
    status: { type: String, required: true },
    category: { type: String, default: "Other" },
    alternateContact: { type: String, default: null },
    receiptData: { type: String, default: null },
    secrets: { type: String, default: null },
    passphrase: { type: String, default: null },
    image: { type: String, default: null },
    rewardType: { type: String, default: "custom" },
    isActiveQr: { type: Boolean, default: true },
    unlockedForCurrentLostCycle: { type: Boolean, default: false },
    showPublicContact: { type: Boolean, default: false },
    publicContactMethod: { type: String, default: "phone" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ItemSchema.virtual("registrationId")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

const FinderReportSchema = new Schema<IFinderReport>(
  {
    _id: { type: String, required: true },
    registrationId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    contactInfo: { type: String, default: null },
    location: { type: String, default: null },
    locationContext: { type: String, default: null },
    photo: { type: String, default: null },
    unlocked: { type: Boolean, default: false },
    deliveryMethod: { type: String, enum: ["meetup", "courier"], default: "meetup" },
    courierDetails: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

FinderReportSchema.virtual("reportId")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

const NotificationSchema = new Schema<INotification>(
  {
    _id: { type: String, required: true },
    ownerAddress: { type: String, required: true, index: true },
    registrationId: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

NotificationSchema.virtual("id")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    _id: { type: String, required: true },
    ownerAddress: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PushSubscriptionSchema.virtual("id")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

const ShipmentEventSchema = new Schema<IShipmentEvent>({
  event: { type: String, required: true },
  operator: { type: String, required: true },
  location: { type: String, default: null },
  locationContext: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  onChainTxHash: { type: String, default: null },
});

const ShipmentSchema = new Schema<IShipment>(
  {
    _id: { type: String, required: true },
    shipperAddress: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: ["Created", "InTransit", "Delivered", "Verified", "Disputed"] },
    innerSecret: { type: String, default: null },
    innerSecretHash: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
    events: [ShipmentEventSchema],
    webhookUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ShipmentSchema.virtual("packageId")
  .get(function (this: { _id: string }) {
    return this._id;
  })
  .set(function (this: { _id: string }, val: string) {
    this._id = val;
  });

ShipmentSchema.index({ shipperAddress: 1, createdAt: -1 });
ShipmentSchema.index({ status: 1 });

// Models
const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
const ItemModel = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
const FinderReportModel = mongoose.models.FinderReport || mongoose.model<IFinderReport>("FinderReport", FinderReportSchema);
const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
const PushSubscriptionModel = mongoose.models.PushSubscription || mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
const ShipmentModel = mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

// Export db object matching Prisma collection access patterns where possible
export const db = {
  user: UserModel as Model<IUser>,
  item: ItemModel as Model<IItem>,
  finderReport: FinderReportModel as Model<IFinderReport>,
  notification: NotificationModel as Model<INotification>,
  pushSubscription: PushSubscriptionModel as Model<IPushSubscription>,
  shipment: ShipmentModel as Model<IShipment>,
};
