import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  // %s → sayfa başlığı; sayfalar kendi title'ını verince "Müşteriler · CRM"
  title: {
    default: "CRM — Müşteri ve Randevu Yönetimi",
    template: "%s · CRM",
  },
  description: "İşletmeniz için müşteri, randevu, paket ve tahsilat yönetimi.",
  applicationName: "Ravel",
  // Ana ekrana eklenince uygulama gibi tam ekran açılır (iPhone).
  appleWebApp: {
    capable: true,
    title: "Ravel",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  // Panel içeriği arama motorlarında görünmemeli
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/*
 * Yazı tipi: sistem yığını (globals.css → --font-sans). next/font/google
 * kaldırıldı; Apple cihazlarda SF Pro, Windows'ta Segoe UI kullanılır.
 * suppressHydrationWarning: next-themes <html> sınıfını ilk boyamadan önce yazar.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
