import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Recipes — Ben's Kitchen",
  description:
    "Share your own recipes and discover creations from the Ben's Kitchen community. Submit, browse, and rate recipes from fellow home cooks.",
  openGraph: {
    title: "Community Recipes — Ben's Kitchen",
    description: "Share your own recipes and discover creations from the community.",
    images: [{ url: "/images/recipes/recipe-73.webp", width: 1024, height: 1024, alt: "Ben's Kitchen Community Recipes" }],
  },
  alternates: {
    canonical: "https://gobigbencookbook.com/community/",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
