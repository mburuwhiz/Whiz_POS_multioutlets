import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://pos.whizpoint.app'),
  title: {
    default: "Whizpoint POS - Best Modern Point of Sale System for Retail & Restaurants",
    template: "%s | Whizpoint POS"
  },
  description: "Whizpoint POS is the best modern, high-performance point of sale system for retail and restaurants. Lightning-fast checkout, offline-first, advanced reporting, and M-Pesa integration.",
  keywords: [
    "POS",
    "Point of Sale",
    "Retail POS",
    "Restaurant POS",
    "Whizpoint",
    "Point of Sale System",
    "POS Software",
    "Cash Register",
    "Retail Management",
    "Inventory Management",
    "Sales Reporting",
    "M-Pesa POS",
    "Kenya POS",
    "Nairobi POS",
    "Offline POS",
    "Cloud POS",
    "Free POS",
    "Small Business POS",
    "Shop POS",
    "Supermarket POS",
    "Groceries POS",
    "Bar POS",
    "Cafe POS",
    "Fast Food POS",
    "Retail Software",
    "Business Management",
    "Inventory Tracking",
    "Sales Analytics",
    "Best POS System",
    "Top POS Software",
    "Modern POS",
    "New POS",
    "POS 2025",
    "POS 2026"
  ],
  authors: [{ name: "Whizpoint", url: "https://pos.whizpoint.app" }],
  creator: "Whizpoint",
  publisher: "Whizpoint",
  openGraph: {
    title: "Whizpoint POS - Best Modern Point of Sale System for Retail & Restaurants",
    description: "Whizpoint POS is the best modern, high-performance point of sale system for retail and restaurants. Lightning-fast checkout, offline-first, advanced reporting, and M-Pesa integration.",
    url: "https://pos.whizpoint.app",
    siteName: "Whizpoint POS",
    images: [
      {
        url: "/assets/logo.png",
        width: 1200,
        height: 630,
        alt: "Whizpoint POS - Modern Point of Sale System",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whizpoint POS - Best Modern Point of Sale System",
    description: "Whizpoint POS is the best modern, high-performance point of sale system for retail and restaurants. Lightning-fast checkout, offline-first, advanced reporting, and M-Pesa integration.",
    creator: "@whizpointpos",
    images: ["/assets/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'W-YMs95R6k9MVkIyG7k8ZY3IX37OhYT_0LgRLUXVzaQ',
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Whizpoint POS",
  "alternateName": ["Whizpoint", "Whizpoint Point of Sale"],
  "description": "Whizpoint POS is the best modern, high-performance point of sale system for retail and restaurants. Lightning-fast checkout, offline-first, advanced reporting, and M-Pesa integration.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Windows, macOS, Linux, Android, iOS, Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "author": {
    "@type": "Organization",
    "name": "Whizpoint",
    "url": "https://pos.whizpoint.app"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "1250",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "Lightning-fast checkout",
    "Offline-first reliability",
    "Real-time inventory management",
    "Advanced sales reporting",
    "M-Pesa integration",
    "Barcode scanning",
    "Credit customer management",
    "Expense tracking",
    "User permissions",
    "Category management"
  ],
  "keywords": "POS, Point of Sale, Retail POS, Restaurant POS, Whizpoint, Point of Sale System, POS Software, Cash Register, Retail Management, Inventory Management, Sales Reporting, M-Pesa POS, Kenya POS, Nairobi POS, Offline POS, Cloud POS, Free POS, Small Business POS, Shop POS, Supermarket POS, Groceries POS, Bar POS, Cafe POS, Fast Food POS, Retail Software, Business Management, Inventory Tracking, Sales Analytics, Best POS System, Top POS Software, Modern POS, New POS, POS 2025, POS 2026"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="W-YMs95R6k9MVkIyG7k8ZY3IX37OhYT_0LgRLUXVzaQ" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-white text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
