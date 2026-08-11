import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register New Valuables & Packages",
  description:
    "Register personal items or commercial shipments to generate scannable QR codes, trusted emergency contacts, and scratch-off PIN protection.",
  openGraph: {
    title: "Register New Valuables & Packages | Recover",
    description:
      "Register personal items or commercial shipments to generate scannable QR codes and scratch-off PIN protection.",
    url: "https://userecover.xyz/register",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
