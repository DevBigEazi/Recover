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
  fullName: string;
  username: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  subscriptionActive: boolean;
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

// Schemas
const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    subscriptionActive: { type: Boolean, default: false },
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

// Models
const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
const ItemModel = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
const FinderReportModel = mongoose.models.FinderReport || mongoose.model<IFinderReport>("FinderReport", FinderReportSchema);
const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
const PushSubscriptionModel = mongoose.models.PushSubscription || mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

// Export db object matching Prisma collection access patterns where possible
export const db = {
  user: UserModel as Model<IUser>,
  item: ItemModel as Model<IItem>,
  finderReport: FinderReportModel as Model<IFinderReport>,
  notification: NotificationModel as Model<INotification>,
  pushSubscription: PushSubscriptionModel as Model<IPushSubscription>,
};
