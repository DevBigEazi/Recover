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
    title: `Verify Package Custody & Scan Status (${cleanId})`,
    description: `Scan verification page for package ${cleanId}. View live custody status, carrier info, location timeline, and verify scratch-off PIN handover.`,
    openGraph: {
      ...sharedOpenGraph,
      title: `Verify Package Custody & Scan Status (${cleanId}) | Recover`,
      description: `Scan verification page for package ${cleanId}. View live custody status and verify PIN handover.`,
      url: `https://userecover.xyz/verify/${cleanId}`,
    },
  };
}

export default function VerifyIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
