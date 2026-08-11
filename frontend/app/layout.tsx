import type { Metadata, Viewport } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/provider";
import PWARegister from "@/components/PWARegister/PWARegister";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const viewport: Viewport = {
  themeColor: "#1E2A4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

function getMetadataBaseUrl(): URL {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim() || "https://userecover.xyz";
  const formatted = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    return new URL(formatted);
  } catch {
    return new URL("https://userecover.xyz");
  }
}

export const sharedOpenGraph = {
  siteName: "Recover",
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "Recover Protocol — Physical Item Protection & Package Tracking",
    },
  ],
  locale: "en_US",
  type: "website",
};

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: {
    default: "Recover — Physical Item Protection & Package Tracking",
    template: "%s | Recover",
  },
  description:
    "Protect personal valuables with scannable QR stickers & power commercial parcel dispatches with instant location alerts, scratch-off PIN handovers, and developer REST API integration.",
  keywords: [
    "scannable QR stickers",
    "physical lost and found",
    "package tracking",
    "location alerts",
    "PIN handover verification",
    "developer REST API",
    "tamper-proof dispatches",
    "Electroneum",
  ],
  authors: [{ name: "Recover Protocol" }],
  creator: "Recover",
  publisher: "Recover Protocol",
  openGraph: {
    ...sharedOpenGraph,
    title: "Recover — Physical Item Protection & Package Tracking",
    description:
      "Protect personal belongings with scannable QR stickers & track commercial dispatches with instant location alerts, PIN handovers, and REST API integration.",
    url: "https://userecover.xyz",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recover — Physical Item Protection & Package Tracking",
    description:
      "Protect personal belongings with scannable QR stickers & track commercial dispatches with instant location alerts and PIN handovers.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
    apple: [{ url: "/apple-icon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recover",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <PWARegister />
        </Providers>
      </body>
    </html>
  );
}
