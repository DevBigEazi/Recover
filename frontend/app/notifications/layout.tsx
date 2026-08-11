import type { Metadata } from "next";
import { sharedOpenGraph } from "@/app/layout";

export const metadata: Metadata = {
  title: "In-App Alerts & Web Push Notifications",
  description:
    "View real-time item scan alerts, finder location reports, and parcel handover status updates.",
  openGraph: {
    ...sharedOpenGraph,
    title: "In-App Alerts & Web Push Notifications | Recover",
    description:
      "View real-time item scan alerts, finder location reports, and parcel handover status updates.",
    url: "https://userecover.xyz/notifications",
  },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
