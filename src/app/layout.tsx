import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://poby.ai"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poby",
  },
  formatDetection: {
    telephone: false,
  },
  title: {
    default: "Poby.ai — Küçük İşletmeler için AI Destekli Yönetim Platformu",
    template: "%s | Poby.ai",
  },
  description:
    "Klinik, restoran, kuaför ve daha fazlası için WhatsApp entegrasyonlu yapay zeka asistan, randevu yönetimi, finansal takip ve pazarlama araçları.",
  keywords: [
    "klinik yönetim yazılımı",
    "restoran yönetim programı",
    "berber randevu sistemi",
    "whatsapp müşteri yönetimi",
    "yapay zeka asistan küçük işletme",
    "randevu takip programı",
    "işletme yönetim platformu",
    "poby",
    "poby.ai",
  ],
  authors: [{ name: "Poby.ai", url: "https://poby.ai" }],
  creator: "Poby.ai",
  publisher: "Poby.ai",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://poby.ai",
    siteName: "Poby.ai",
    title: "Poby.ai — Küçük İşletmeler için AI Destekli Yönetim Platformu",
    description:
      "WhatsApp entegrasyonlu yapay zeka asistan, randevu yönetimi ve pazarlama araçları.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Poby.ai Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poby.ai — AI Destekli İşletme Yönetimi",
    description:
      "Küçük işletmeler için WhatsApp entegrasyonlu yapay zeka asistan ve yönetim platformu.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://poby.ai",
    languages: { "tr-TR": "https://poby.ai", "en-US": "https://poby.ai/en" },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Poby.ai",
  url: "https://poby.ai",
  logo: "https://poby.ai/logo.png",
  sameAs: [
    "https://instagram.com/poby.ai",
    "https://twitter.com/pobyai",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: "Turkish",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Poby" />
      </head>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
