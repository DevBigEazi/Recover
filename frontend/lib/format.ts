/**
 * Formats a 32-byte raw EVM package ID or hex string into a consumer-friendly tracking code.
 * Uses 12 hex characters (48-bit) for ~19.8M collision-safe packages (birthday problem).
 * Example: "0xaf7914134490c34f..." -> "RCV-AF7914134490"
 */
export function formatTrackingCode(id: string): string {
  if (!id) return "";
  const clean = id.startsWith("0x") ? id.slice(2) : id.replace(/^RCV-/i, "").replace(/^PKG-/i, "");
  return `RCV-${clean.slice(0, 12).toUpperCase()}`;
}

/**
 * Formats an EVM wallet address into a clean, consumer-friendly operator label.
 * No wallet addresses or hex strings are ever shown to the user.
 * Displays the company name for the shipper, "Your Account" for the logged-in user,
 * and "Logistics Handler" as a generic fallback.
 */
export function formatOperatorName(
  address: string,
  opts?: { userAddress?: string; shipperAddress?: string; companyName?: string }
): string {
  if (!address) return "Logistics Operator";
  const { userAddress, shipperAddress, companyName } = opts || {};
  if (userAddress && address.toLowerCase() === userAddress.toLowerCase()) {
    return "Your Account";
  }
  if (shipperAddress && address.toLowerCase() === shipperAddress.toLowerCase() && companyName) {
    return companyName;
  }
  if (!address.startsWith("0x")) return address;
  return companyName || "Logistics Handler";
}

/**
 * Formats a package weight string/number into a clean display format with "kg".
 * Example: "1" -> "1 kg", "0.45" -> "0.45 kg", "1.5 kg" -> "1.5 kg"
 */
export function formatWeight(weight?: string | number | null): string {
  if (!weight) return "N/A";
  const str = String(weight).trim();
  if (!str || str.toLowerCase() === "unknown") return "N/A";
  if (str.toLowerCase().includes("kg")) return str;
  return `${str} kg`;
}
