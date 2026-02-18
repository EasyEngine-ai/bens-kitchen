"use client";

import { useState } from "react";
import CommunitySubmitForm from "@/components/CommunitySubmitForm";
import CommunityRecipeGrid from "@/components/CommunityRecipeGrid";

export default function CommunityPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
            Community
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-6xl mb-4">
            Community Recipes
          </h1>
          <p className="text-text-muted max-w-xl">
            Share your favorite recipes with the community. Paste in your
            recipe text and our AI will organize it for you.
          </p>
        </div>

        <CommunitySubmitForm
          onRecipeAdded={() => setRefreshKey((k) => k + 1)}
        />
        <CommunityRecipeGrid refreshKey={refreshKey} />
      </div>
    </div>
  );
}
