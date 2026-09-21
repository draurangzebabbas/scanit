import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1d77ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Scanit - Instant Barcode Scanner & Google Inventory Manager",
  description:
    "Scanit is an offline-first barcode scanner and product inventory manager. Instantly scan UPC/EAN barcodes, record product attributes, and sync photo assets directly to your Google Drive and Google Sheets.",
  keywords: [
    "Scanit",
    "Barcode Scanner",
    "UPC Scanner",
    "EAN Scanner",
    "Google Sheets Inventory",
    "Google Drive Product Sync",
    "Inventory Tracker",
    "Product Hunting App",
    "Offline Barcode Scanner",
  ],
  authors: [{ name: "Scanit Team" }],
  creator: "Scanit",
  publisher: "Scanit",
  metadataBase: new URL("https://scanit.draurangzebabbas.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/images/favicon-32x32.png",
    apple: [
      { url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Scanit - Instant Barcode Scanner & Google Inventory Manager",
    description:
      "Scan barcodes instantly, manage custom product attributes, and save photos directly to your own Google Drive & Google Sheets.",
    url: "https://scanit.draurangzebabbas.com",
    siteName: "Scanit",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/Scanitlogo.webp",
        width: 512,
        height: 512,
        alt: "Scanit - Barcode Scanner & Google Inventory Manager Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scanit - Instant Barcode Scanner & Google Inventory Manager",
    description:
      "Scan barcodes, capture product photos, and sync directly to Google Sheets & Drive with zero backend setup.",
    creator: "@scanit",
    images: ["/Scanitlogo.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Scanit",
    url: "https://scanit.draurangzebabbas.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    description:
      "Instant barcode scanning and inventory management tool integrating directly with Google Sheets and Google Drive.",
    image: "https://scanit.draurangzebabbas.com/Scanitlogo.webp",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-mono bg-slate-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
