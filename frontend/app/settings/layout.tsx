import type { Metadata } from "next";
import { sharedOpenGraph } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Account Settings & Developer API Keys",
  description:
    "Manage your profile, merchant workspace subscription, notification preferences, and generate secret REST API keys for server-to-server integration.",
  openGraph: {
    ...sharedOpenGraph,
    title: "Account Settings & Developer API Keys | Recover",
    description:
      "Manage your profile, merchant workspace subscription, notification preferences, and secret REST API keys.",
    url: "/settings",
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
