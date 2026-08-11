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

export function getMetadataBaseUrl(): URL {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_APP_URL environment variable is required.");
  }
  const formatted = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    return new URL(formatted);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_APP_URL configured: "${raw}"`);
  }
}
