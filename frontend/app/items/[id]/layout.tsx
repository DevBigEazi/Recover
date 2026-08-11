import type { Metadata } from "next";
import { sharedOpenGraph } from "@/app/layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cleanId = (id || "").toUpperCase();

  return {
    title: `Protected Item Details (${cleanId})`,
    description: `View protected item details, export sticker sizes, and manage trusted alternate recovery contacts for item ${cleanId}.`,
    openGraph: {
      ...sharedOpenGraph,
      title: `Protected Item Details (${cleanId}) | Recover`,
      description: `View protected item details, export sticker sizes, and manage trusted alternate recovery contacts.`,
      url: `https://userecover.xyz/items/${cleanId}`,
    },
  };
}

export default function ItemIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
