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
  displayName: string;
  _id: string; // walletAddress (lowercase)
  walletAddress?: string; // virtual
  /** Personal/contact name for individuals; primary contact person name for merchants. */
  fullName: string;
  /**
   * Business display name — merchants only. Always distinct from fullName.
   * null for individual (role === "user") accounts.
   */
  companyName: string | null;
  /** Optional business logo image (Base64 data URL or URL) for merchants */
  businessLogo?: string | null;
  /** Dedicated customer support phone line for merchants (distinct from personal phone) */
  businessPhone?: string | null;
  /** Dedicated business/invoice email for merchants (distinct from personal email) */
  businessEmail?: string | null;
  /** Unique store/company handle (e.g. @acme_logistics) — distinct from personal username */
  businessHandle?: string | null;
  /** Unique personal handle (e.g. @johndoe) — optional for merchant-only accounts */
  username?: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  /** Active UI mode chosen by user — toggles between personal and business navigation */
  activeMode: "personal" | "merchant";
  /** Flag indicating whether the user has set up their personal profile details */
  hasPersonalProfile: boolean;
  /** Flag indicating whether the user has set up their business details */
  hasMerchantProfile: boolean;
  subscriptionActive: boolean;
  role: "user" | "merchant";
  /**
   * Plan tiers:
   * - "free": Free plan (100 ops/mo, CEO only)
   * - "starter_500": Starter (500 ops/mo, 1 branch, 1 sales rep, 1 manager)
   * - "growth_1000": Growth (1,000 ops/mo, 2 branches, 4 sales reps, 2 managers)
   * - "business_2500": Business (2,500 ops/mo, 3 branches, 6 sales reps, 3 managers)
   * - "scale_5000": Scale (5,000 ops/mo, 5 branches, 10 sales reps, 5 managers)
   * - legacy aliases: "pro_lite", "pro_starter", "pro_growth", "pro_scale", "pro", "enterprise"
   */
  plan:
    | "free"
    | "starter_500"
    | "growth_1000"
    | "business_2500"
    | "scale_5000"
    | "pro_lite"
    | "pro_starter"
    | "pro_growth"
    | "pro_scale"
    | "pro"
    | "enterprise";
  billingCycle: "monthly" | "yearly";
  billingCycleStart: Date;
  shipmentsThisMonth: number;
  rolloverQuota: number;
  overageCharges: number;
  country?: string | null;
  currency?: string | null;
  apiKey?: string | null;
  testApiKey?: string | null;
  apiKeyHash?: string | null;
  testApiKeyHash?: string | null;
  apiKeyMasked?: string | null;
  testApiKeyMasked?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  webhookUrl?: string | null;
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
  deliveryMethod?: "meetup" | "delivery";
  deliveryDetails?: string | null;
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
  event: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed" | "MetadataUpdated";
  operator: string;
  operatorName?: string | null;   // display name snapshot of the actor at the time of the event
  operatorBranch?: string | null; // branch name snapshot (null = owner)
  location?: string | null;
  locationContext?: string | null;
  timestamp: Date;
  onChainTxHash?: string | null;
}

export interface IShipment {
  _id: string;
  shipperAddress: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  innerSecret?: string | null;
  innerSecretHash: string;
  metadata?: Record<string, unknown> | null;
  events: IShipmentEvent[];
  webhookUrl?: string | null;
  trackingCode?: string | null;
  onChainId?: string;
  isTest?: boolean;
  /** Actor who created this shipment — used to enforce update-own-shipment rule */
  createdBy?: {
    address: string;
    name: string;
    branchName: string | null;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IReceipt {
  _id: string; // receiptNumber e.g., "RCVR-REC-2026-0004829"
  receiptNumber?: string; // virtual
  merchantAddress: string; // lowercase wallet address
  merchantName?: string | null;
  merchantLogo?: string | null;
  merchantPhone?: string | null;
  merchantEmail?: string | null;
  items: IReceiptItem[];
  currency: string; // default "NGN"
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "Cash" | "Bank Transfer" | "Card/POS" | "Credit" | "Other";
  paymentStatus?: "paid" | "unpaid" | "partially_paid";
  amountPaid?: number;
  creditDueDate?: Date | null;
  creditSettledAt?: Date | null;
  creditNotes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  fulfillmentType: "spot" | "dispatch";
  linkedShipmentId?: string | null;
  branchId?: string | null;
  status: "Issued" | "Voided";
  voidReason?: string | null;
  voidedAt?: Date | null;
  parentReceiptNumber?: string | null;
  receiptHash: string; // 0x... keccak256 hash
  onChainTxHash?: string | null;
  onChainTimestamp?: Date | null;
  /** Actor who issued this receipt — name + branch snapshot at issue time */
  issuedBy?: {
    address: string;
    name: string;
    role?: string | null;
    branchId?: string | null;
    branchName?: string | null;
  } | null;
  /** Actor who voided this receipt — reason is mandatory for all roles */
  voidedBy?: {
    address: string;
    name: string;
    role?: string | null;
    branchId?: string | null;
    branchName?: string | null;
    at?: Date | null;
  } | null;
  /** Actor who settled a credit payment on this receipt */
  settledBy?: {
    address: string;
    name: string;
    role?: string | null;
    branchId?: string | null;
    branchName?: string | null;
    at?: Date | null;
  } | null;
  /** Append-only log of edits / re-issues applied to this receipt */
  editHistory?: Array<{
    editedAt: Date | string;
    changes: string;
    previousTotal?: number;
    editedBy: {
      address: string;
      name: string;
      role?: string | null;
      branchId?: string | null;
      branchName?: string | null;
    };
    at?: Date;
    changeNote?: string;
  }>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IProductPreset {
  _id: string;
  merchantAddress: string; // lowercase wallet address
  name: string;
  defaultPrice: number;
  salesCount: number;
  lastSoldAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/** A named physical or virtual location under a merchant account */
export interface IBranch {
  _id: string;                 // UUID
  merchantAddress: string;     // parent merchant wallet (lowercase), indexed
  name: string;                // e.g. "Lagos HQ", "Abuja Branch", "Online Store"
  managedBy: string | null;    // memberAddress of the assigned Manager; null = unassigned
  isDefault: boolean;          // true for the auto-created "Main Branch" on first team setup
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A team member (Manager or Sales Rep) operating under a merchant account.
 * Scoped to a branch. The merchant owner themselves is NOT a team member document —
 * they are identified by wallet address matching the parent IUser._id.
 */
export interface ITeamMember {
  _id: string;                 // UUID
  merchantAddress: string;     // parent merchant wallet (lowercase), indexed
  branchId: string;            // IBranch._id this member belongs to
  branchName: string;          // denormalized branch name snapshot for audit trail reads
  memberEmail: string;         // invited email address (lowercase), required
  memberAddress: string | null;// team member wallet address (lowercase), kept for reference
  memberName: string;          // display name used in all audit trail snapshots
  role: "manager" | "sales_rep";
  /** active from day 1 — PIN delivered in invite email. suspended = revoked access. */
  status: "active" | "suspended";
  /** bcrypt hash of the auto-generated or user-changed 6-digit PIN. Never stored in plaintext. */
  pinHash: string | null;
  invitedBy: string;           // wallet address of inviter (owner or manager)
  invitedAt: Date;
  acceptedAt: Date | null;
  suspendedAt: Date | null;
  suspendedBy: string | null;
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
    /** Business logo Base64 data URL or external URL (merchants only) */
    businessLogo: { type: String, default: null },
    /** Dedicated customer support phone line for merchants */
    businessPhone: { type: String, default: null },
    /** Dedicated business/invoice email for merchants */
    businessEmail: { type: String, default: null },
    /** Dedicated unique store / merchant handle (e.g. acme_logistics) */
    businessHandle: { type: String, default: null },
    /** Dedicated unique personal username (e.g. johndoe) */
    username: { type: String, default: null },
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    activeMode: { type: String, enum: ["personal", "merchant"], default: "personal" },
    hasPersonalProfile: { type: Boolean, default: false },
    hasMerchantProfile: { type: Boolean, default: false },
    subscriptionActive: { type: Boolean, default: false },
    // Index on role enables efficient merchant-only queries (e.g., shipment create guard)
    role: { type: String, enum: ["user", "merchant"], default: "user", index: true },
    country: { type: String, default: null },
    currency: { type: String, default: null },
    plan: {
      type: String,
      enum: [
        "free",
        "starter_500",
        "growth_1000",
        "business_2500",
        "scale_5000",
        "pro_lite",
        "pro_starter",
        "pro_growth",
        "pro_scale",
        "pro",
        "enterprise",
      ],
      default: "free",
    },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    billingCycleStart: { type: Date, default: Date.now },
    shipmentsThisMonth: { type: Number, default: 0 },
    rolloverQuota: { type: Number, default: 0 },
    overageCharges: { type: Number, default: 0 },
    apiKey: { type: String, default: null, index: true },
    testApiKey: { type: String, default: null, index: true },
    apiKeyHash: { type: String, default: null, index: true },
    testApiKeyHash: { type: String, default: null, index: true },
    apiKeyMasked: { type: String, default: null },
    testApiKeyMasked: { type: String, default: null },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    stripePriceId: { type: String, default: null },
    webhookUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Partial unique indexes: only non-null strings are indexed so multiple nulls/omitted handles do not collide
UserSchema.index(
  { businessHandle: 1 },
  { unique: true, partialFilterExpression: { businessHandle: { $type: "string" } } }
);
UserSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: "string" } } }
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
    deliveryMethod: { type: String, enum: ["meetup", "delivery"], default: "meetup" },
    deliveryDetails: { type: String, default: null },
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
  operatorName: { type: String, default: null },
  operatorBranch: { type: String, default: null },
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
    trackingCode: { type: String, default: null, index: true },
    isTest: { type: Boolean, default: false, index: true },
    createdBy: {
      type: new Schema(
        {
          address: { type: String, required: true },
          name: { type: String, required: true },
          branchName: { type: String, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        if (ret._id && typeof ret._id === "string") {
          const rawId = ret._id;
          ret.onChainId = rawId;
          if (!ret.trackingCode) {
            const cleanId = rawId.startsWith("0x") ? rawId.slice(2) : rawId;
            ret.trackingCode = `RCV-${cleanId.slice(0, 12).toUpperCase()}`;
          }
          delete ret._id;
        }
        delete ret.id;
        if (Array.isArray(ret.events)) {
          ret.events.forEach((ev: Record<string, unknown>) => {
            delete ev._id;
            delete ev.id;
          });
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

ShipmentSchema.virtual("onChainId")
  .get(function (this: { _id: string }) {
    return this._id;
  });

ShipmentSchema.index({ shipperAddress: 1, createdAt: -1 });
ShipmentSchema.index({ trackingCode: 1 });
ShipmentSchema.index({ status: 1 });

const ReceiptItemSchema = new Schema<IReceiptItem>(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ReceiptSchema = new Schema<IReceipt>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    merchantName: { type: String, default: null },
    merchantLogo: { type: String, default: null },
    merchantPhone: { type: String, default: null },
    merchantEmail: { type: String, default: null },
    items: { type: [ReceiptItemSchema], required: true },
    currency: { type: String, default: "NGN" },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Card/POS", "Credit", "Other"],
      default: "Cash",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "partially_paid"],
      default: "paid",
      index: true,
    },
    amountPaid: { type: Number, default: 0 },
    creditDueDate: { type: Date, default: null },
    creditSettledAt: { type: Date, default: null },
    creditNotes: { type: String, default: null },
    customerName: { type: String, default: null },
    customerPhone: { type: String, default: null },
    customerEmail: { type: String, default: null },
    fulfillmentType: { type: String, enum: ["spot", "dispatch"], default: "spot" },
    linkedShipmentId: { type: String, default: null, index: true },
    branchId: { type: String, default: null, index: true },
    status: { type: String, enum: ["Issued", "Voided"], default: "Issued", index: true },
    voidReason: { type: String, default: null },
    voidedAt: { type: Date, default: null },
    parentReceiptNumber: { type: String, default: null },
    receiptHash: { type: String, required: true, index: true },
    onChainTxHash: { type: String, default: null },
    onChainTimestamp: { type: Date, default: null },
    // ── Audit actor snapshots ──────────────────────────────────────────────
    issuedBy: {
      type: new Schema(
        {
          address: { type: String, required: true },
          name: { type: String, required: true },
          role: { type: String, default: null },
          branchId: { type: String, default: null },
          branchName: { type: String, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    voidedBy: {
      type: new Schema(
        {
          address: { type: String, required: true },
          name: { type: String, required: true },
          role: { type: String, default: null },
          branchId: { type: String, default: null },
          branchName: { type: String, default: null },
          at: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    settledBy: {
      type: new Schema(
        {
          address: { type: String, required: true },
          name: { type: String, required: true },
          role: { type: String, default: null },
          branchId: { type: String, default: null },
          branchName: { type: String, default: null },
          at: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    editHistory: {
      type: [
        new Schema(
          {
            editedBy: {
              type: new Schema(
                {
                  address: { type: String, required: true },
                  name: { type: String, required: true },
                  branchName: { type: String, required: true },
                },
                { _id: false }
              ),
              required: true,
            },
            at: { type: Date, required: true },
            changeNote: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.receiptNumber = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

ReceiptSchema.virtual("receiptNumber").get(function (this: { _id: string }) {
  return this._id;
});

ReceiptSchema.index({ merchantAddress: 1, createdAt: -1 });
ReceiptSchema.index({ merchantAddress: 1, status: 1 });
ReceiptSchema.index({ merchantAddress: 1, paymentMethod: 1, paymentStatus: 1 });
ReceiptSchema.index({ createdAt: -1 });

const ProductPresetSchema = new Schema<IProductPreset>(
  {
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    salesCount: { type: Number, default: 1 },
    lastSoldAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

ProductPresetSchema.index({ merchantAddress: 1, name: 1 }, { unique: true });
ProductPresetSchema.index({ merchantAddress: 1, salesCount: -1 });

const BranchSchema = new Schema<IBranch>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    managedBy: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ merchantAddress: 1 });
BranchSchema.index({ merchantAddress: 1, managedBy: 1 });

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    branchId: { type: String, required: true, index: true },
    branchName: { type: String, required: true },
    memberEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    memberAddress: { type: String, default: null, lowercase: true, trim: true, index: true },
    memberName: { type: String, required: true },
    role: { type: String, enum: ["manager", "sales_rep"], required: true },
    /** Active from day 1 — PIN is delivered in the invite email. */
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    /** bcrypt hash of the 6-digit PIN. Never stored in plaintext. */
    pinHash: { type: String, default: null },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Unique: one email can only be a member of a merchant once
TeamMemberSchema.index({ merchantAddress: 1, memberEmail: 1 }, { unique: true });
// Fast reverse-lookup: "which merchant does this wallet or email belong to?"
TeamMemberSchema.index({ memberEmail: 1 });
TeamMemberSchema.index({ memberAddress: 1 });
TeamMemberSchema.index({ merchantAddress: 1, branchId: 1 });

// Clear cached models in development to force re-compilation with updated schemas
if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  delete mongoose.models.User;
}
if (process.env.NODE_ENV !== "production" && mongoose.models.TeamMember) {
  delete mongoose.models.TeamMember;
}

// Models
const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
const ItemModel = mongoose.models.Item || mongoose.model<IItem>("Item", ItemSchema);
const FinderReportModel = mongoose.models.FinderReport || mongoose.model<IFinderReport>("FinderReport", FinderReportSchema);
const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
const PushSubscriptionModel = mongoose.models.PushSubscription || mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
const ShipmentModel = mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);
const TestShipmentModel = mongoose.models.TestShipment || mongoose.model<IShipment>("TestShipment", ShipmentSchema);
const ReceiptModel = mongoose.models.Receipt || mongoose.model<IReceipt>("Receipt", ReceiptSchema);
const ProductPresetModel = mongoose.models.ProductPreset || mongoose.model<IProductPreset>("ProductPreset", ProductPresetSchema);
const BranchModel = mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
const TeamMemberModel = mongoose.models.TeamMember || mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);

// Export db object matching Prisma collection access patterns where possible
export const db = {
  user: UserModel as Model<IUser>,
  item: ItemModel as Model<IItem>,
  finderReport: FinderReportModel as Model<IFinderReport>,
  notification: NotificationModel as Model<INotification>,
  pushSubscription: PushSubscriptionModel as Model<IPushSubscription>,
  shipment: ShipmentModel as Model<IShipment>,
  testShipment: TestShipmentModel as Model<IShipment>,
  receipt: ReceiptModel as Model<IReceipt>,
  productPreset: ProductPresetModel as Model<IProductPreset>,
  branch: BranchModel as Model<IBranch>,
  teamMember: TeamMemberModel as Model<ITeamMember>,
};

/**
 * Checks if a user is from Nigeria based on stored country, currency, or phone prefix.
 */
export function isNigerianUser(user?: {
  country?: string | null;
  currency?: string | null;
  phone?: string | null;
} | null): boolean {
  if (!user) return false;
  if (user.country?.toUpperCase() === "NG" || user.currency?.toUpperCase() === "NGN") {
    return true;
  }
  if (user.phone) {
    const cleanPhone = user.phone.replace(/[\s\-()]/g, "");
    if (cleanPhone.startsWith("+234") || cleanPhone.startsWith("234")) {
      return true;
    }
  }
  return false;
}

