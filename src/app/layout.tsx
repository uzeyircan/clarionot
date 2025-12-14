import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Clario",
  description: "Save what matters. Find it fast.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
          if (!isLocalhost) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        });
      }
    `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
