export interface ShipmentEvent {
  event: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  operator: string;
  location?: string | null;
  locationContext?: string | null;
  timestamp: string;
  onChainTxHash?: string | null;
}

export interface Shipment {
  _id: string;
  trackingCode?: string;
  shipperAddress: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  innerSecretHash: string;
  innerSecret?: string | null;
  metadata?: Record<string, unknown> | null;
  events: ShipmentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface HandoverResult {
  riderLink: string;
  recipientLink: string;
  courierPin: string;
  riderPhone: string | null;
  riderName: string | null;
}
