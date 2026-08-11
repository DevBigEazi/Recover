import type { Metadata } from "next";
import { sharedOpenGraph } from "@/lib/metadata";

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
      url: `/items/${cleanId}`,
    },
  };
}

export default function ItemIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
