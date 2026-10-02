import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/providers/toast";
import { ShareEnhancer } from "@/components/providers/share-enhancer";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/logo";
import "./globals.css";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "PickleNepal — Find your people. Find your game.",
    template: "%s | PickleNepal",
  },
  description:
    "Connect with pickleball players across Nepal, discover courts, join open games, follow tournaments, and grow the community.",
  applicationName: "PickleNepal",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PickleNepal" },
  openGraph: {
    type: "website",
    siteName: "PickleNepal",
    locale: "en_NP",
    title: "PickleNepal — Find your people. Find your game.",
    description:
      "Nepal's pickleball community: find players, courts, games, events and tournaments.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "PickleNepal — Find your people. Find your game.",
    description: "Nepal's pickleball community: find players, courts, games, events and tournaments.",
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#1b5e3f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <ShareEnhancer />
          <AppShell>{children}</AppShell>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}