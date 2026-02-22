import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import EasterEggs from "@/components/EasterEggs";
import CookingAssistant from "@/components/CookingAssistant";
import WebVitals from "@/components/WebVitals";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#D4A574",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://gobigbencookbook.com"),
  title: "Ben's Kitchen — Original Recipes & The Cookbook",
  description:
    "A personal collection of 250+ original recipes — from signature chicken sandwiches to everyday sauces, sides, and everything in between. By Benjamin Larson.",
  openGraph: {
    title: "Ben's Kitchen",
    description: "250+ original recipes crafted with obsessive attention to flavor.",
    type: "website",
    siteName: "Ben's Kitchen",
    images: [{ url: "/images/recipes/recipe-73.webp", width: 1024, height: 1024, alt: "Country Breakfast Chicken Sandwich — Ben's Kitchen" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ben's Kitchen — Original Recipes & The Cookbook",
    description: "250+ original recipes crafted with obsessive attention to flavor.",
    images: ["/images/recipes/recipe-73.webp"],
  },
  alternates: {
    canonical: "https://gobigbencookbook.com",
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Ben's Kitchen",
  url: "https://gobigbencookbook.com",
  description: "A personal collection of 250+ original recipes by Benjamin Larson.",
  author: { "@type": "Person", name: "Benjamin Larson" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link
          rel="preload"
          href="/images/recipes/recipe-73.webp"
          as="image"
          type="image/webp"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://dkcprcoysvxrghddbngx.supabase.co" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Ben's Kitchen"
          href="/feed.xml"
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-7HTSGG8DG0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-7HTSGG8DG0');`,
          }}
        />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <SmoothScroll>
          <Navigation />
          <main className="relative z-[2]">{children}</main>
          <div className="relative z-[2]">
            <Footer />
          </div>
          <EasterEggs />
          <CookingAssistant />
          <WebVitals />
        </SmoothScroll>
      </body>
    </html>
  );
}
