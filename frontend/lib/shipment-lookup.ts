const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildShipmentIdFilter(rawId: string, includeSecret = false) {
  const id = rawId.trim();
  const cleanId = id
    .replace(/^RCV-/i, "")
    .replace(/^RCVR-/i, "")
    .replace(/^PKG-/i, "")
    .replace(/^0x/i, "");

  const filter: Record<string, unknown>[] = [
    { trackingCode: id.toUpperCase() },
    { trackingCode: { $regex: new RegExp(`^RCV-${escapeRegex(cleanId)}$`, "i") } },
    { _id: id.toLowerCase() },
    { _id: { $regex: new RegExp(`^0x${escapeRegex(cleanId)}$`, "i") } },
  ];

  if (includeSecret) {
    filter.push({ innerSecret: { $regex: new RegExp(`^RCVR-${escapeRegex(cleanId)}$`, "i") } });
  }

  return filter;
}
