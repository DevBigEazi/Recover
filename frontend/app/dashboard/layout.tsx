import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Belongings Dashboard",
  description:
    "Manage your catalog of protected personal valuables (phones, keys, laptops, pets), export printable QR stickers, and view recovery alerts.",
  openGraph: {
    title: "Personal Belongings Dashboard | Recover",
    description:
      "Manage your catalog of protected personal valuables, export printable QR stickers, and view recovery alerts.",
    url: "https://userecover.xyz/dashboard",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
