import type { Metadata } from "next";
import { sharedOpenGraph } from "@/app/layout";

export const metadata: Metadata = {
  title: "Developer REST API & Webhooks Reference",
  description:
    "Programmatically create dispatches, generate QR code sticker labels, verify PIN handovers, and stream real-time webhooks directly into your ERP or e-commerce store.",
  openGraph: {
    ...sharedOpenGraph,
    title: "Developer REST API & Webhooks Reference | Recover",
    description:
      "Integrate tamper-proof package tracking into your store. Create dispatches, generate QR images, verify PIN handovers, and stream webhooks.",
    url: "https://userecover.xyz/developers",
  },
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
