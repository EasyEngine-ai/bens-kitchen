import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import EasterEggs from "@/components/EasterEggs";
import FallingIngredients from "@/components/FallingIngredients";
import CookingAssistant from "@/components/CookingAssistant";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://gobigbencookbook.com"),
  title: "Ben's Kitchen — Original Recipes & The Cookbook",
  description:
    "A personal collection of 210+ original recipes — from signature chicken sandwiches to everyday sauces, sides, and everything in between. By Benjamin Larson.",
  openGraph: {
    title: "Ben's Kitchen",
    description: "210+ original recipes crafted with obsessive attention to flavor.",
    type: "website",
    images: [{ url: "/images/recipes/recipe-73.webp", width: 1024, height: 1024, alt: "Country Breakfast Chicken Sandwich — Ben's Kitchen" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="antialiased">
        <SmoothScroll>
          <div className="grain-overlay" />
          <FallingIngredients />
          <Navigation />
          <main className="relative z-[2]">{children}</main>
          <div className="relative z-[2]">
            <Footer />
          </div>
          <EasterEggs />
          <CookingAssistant />
        </SmoothScroll>
      </body>
    </html>
  );
}
