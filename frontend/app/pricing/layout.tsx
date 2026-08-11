import type { Metadata } from "next";
import { sharedOpenGraph } from "@/app/layout";

export const metadata: Metadata = {
  title: "Pricing & Subscription Plans",
  description:
    "Transparent pricing for individuals and logistics businesses. Pay-as-you-go lost item recovery unlocks starting at $1.50, and merchant parcel tracking plans starting at $6/mo (2,500 dispatches).",
  openGraph: {
    ...sharedOpenGraph,
    title: "Pricing & Subscription Plans | Recover",
    description:
      "Transparent pricing for individuals & businesses. Personal recovery unlocks from $1.50 and merchant tracking from $6/mo.",
    url: "https://userecover.xyz/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
