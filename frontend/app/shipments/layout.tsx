import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logistics Package Tracking Workspace",
  description:
    "Register commercial dispatches, manage courier handovers, print dual-layer QR shipping labels, and audit chain-of-custody delivery timelines.",
  openGraph: {
    title: "Logistics Package Tracking Workspace | Recover",
    description:
      "Register commercial dispatches, manage courier handovers, print dual-layer QR shipping labels, and audit delivery timelines.",
    url: "https://userecover.xyz/shipments",
  },
};

export default function ShipmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
