import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  // %s → sayfa başlığı; sayfalar kendi title'ını verince "Müşteriler · CRM"
  title: {
    default: "CRM — Müşteri ve Randevu Yönetimi",
    template: "%s · CRM",
  },
  description: "İşletmeniz için müşteri, randevu, paket ve tahsilat yönetimi.",
  applicationName: "CRM",
  // Panel içeriği arama motorlarında görünmemeli
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#6d3ef2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
