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
    title: `Report Found Item / Package Status (${cleanId})`,
    description: `Public scan page for item/package ${cleanId}. Submit finder location coordinates or check status instantly without downloading an app.`,
    openGraph: {
      ...sharedOpenGraph,
      title: `Report Found Item / Package Status (${cleanId}) | Recover`,
      description: `Public scan page for item/package ${cleanId}. Submit finder location coordinates or check status instantly.`,
      url: `https://userecover.xyz/scan/${cleanId}`,
    },
  };
}

export default function ScanIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
