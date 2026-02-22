import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Recipes — Ben's Kitchen",
  description:
    "Share your own recipes and discover creations from the Ben's Kitchen community. Submit, browse, and rate recipes from fellow home cooks.",
  openGraph: {
    title: "Community Recipes — Ben's Kitchen",
    description: "Share your own recipes and discover creations from the community.",
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
