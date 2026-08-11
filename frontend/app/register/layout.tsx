import type { Metadata } from "next";
import { sharedOpenGraph } from "@/app/layout";

export const metadata: Metadata = {
  title: "Register New Valuables & Packages",
  description:
    "Register personal items or commercial shipments to generate scannable QR codes, trusted emergency contacts, and scratch-off PIN protection.",
  openGraph: {
    ...sharedOpenGraph,
    title: "Register New Valuables & Packages | Recover",
    description:
      "Register personal items or commercial shipments to generate scannable QR codes and scratch-off PIN protection.",
    url: "https://userecover.xyz/register",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
