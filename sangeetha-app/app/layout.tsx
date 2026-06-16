import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppUpdateWatcher } from "@/components/app-update-watcher";
import { getAppVersion } from "@/lib/app-version";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Sangeetha",
  description: "Simple order and payment tracker",
  applicationName: "Sangeetha",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sangeetha",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2a8fe7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentVersion = getAppVersion();

  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <AppUpdateWatcher currentVersion={currentVersion} />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
