import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Recover — Physical Item Protection",
  description:
    "Learn how Recover combines scannable physical QR stickers with privacy-preserving location alerts and tamper-proof verification to reunite owners with lost items and secure package dispatches.",
  openGraph: {
    title: "About Recover — Physical Item Protection | Recover",
    description:
      "Learn how Recover combines scannable physical QR stickers with location alerts and tamper-proof verification.",
    url: "https://userecover.xyz/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
