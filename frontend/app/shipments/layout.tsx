import type { Metadata } from "next";
import { sharedOpenGraph } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Logistics Package Tracking Workspace",
  description:
    "Register commercial dispatches, manage courier handovers, print dual-layer QR shipping labels, and audit chain-of-custody delivery timelines.",
  openGraph: {
    ...sharedOpenGraph,
    title: "Logistics Package Tracking Workspace | Recover",
    description:
      "Register commercial dispatches, manage courier handovers, print dual-layer QR shipping labels, and audit delivery timelines.",
    url: "/shipments",
  },
};

export default function ShipmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
