import type { Metadata } from "next";
import { sharedOpenGraph } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Personal Belongings Dashboard",
  description:
    "Manage your catalog of protected personal valuables (phones, keys, laptops, pets), export printable QR stickers, and view recovery alerts.",
  openGraph: {
    ...sharedOpenGraph,
    title: "Personal Belongings Dashboard | Recover",
    description:
      "Manage your catalog of protected personal valuables, export printable QR stickers, and view recovery alerts.",
    url: "/dashboard",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
