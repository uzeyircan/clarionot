import type { Metadata } from "next";
import ThemeController from "@/components/ThemeController";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClarioNot",
    template: "%s • ClarioNot",
  },
  description: "Kaydettiğini unutanlar için ikinci beyin.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
