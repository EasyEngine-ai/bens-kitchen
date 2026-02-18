"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { staggerContainer, staggerItem } from "@/lib/animations";
import ReviewSection from "./ReviewSection";
import StarRating from "./StarRating";

interface CommunityRecipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  author_name: string;
  ingredients: { item: string; amount?: string; group?: string }[];
  directions: string[];
  difficulty: string;
  cook_time: string;
  servings: number;
  heat_level: number;
  created_at: string;
}

const PLACEHOLDER_COLORS = [
  "from-accent-dark to-accent-muted",
  "from-[#4A3728] to-[#6B4F2D]",
  "from-[#2D3A2B] to-[#4A5F47]",
  "from-[#3A2828] to-[#5F4747]",
  "from-[#2B2D3A] to-[#474A5F]",
];

const HEAT_LABELS = ["", "Mild", "Medium", "Spicy", "Hot", "Inferno"];

function getPlaceholderColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export default function CommunityRecipeGrid({
  refreshKey,
}: {
  refreshKey: number;
}) {
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CommunityRecipe | null>(null);
  const [avgRatings, setAvgRatings] = useState<Record<string, { avg: number; count: number }>>({});

  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from("community_recipes")
      .select("*")
      .eq("status", "processed")
      .order("created_at", { ascending: false });

    if (data) {
      setRecipes(data);

      // Fetch average ratings for all community recipes
      if (data.length > 0) {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("recipe_slug, rating")
          .eq("recipe_source", "community")
          .in("recipe_slug", data.map((r) => r.slug));

        if (reviews) {
          const ratings: Record<string, { sum: number; count: number }> = {};
          for (const r of reviews) {
            if (!ratings[r.recipe_slug]) ratings[r.recipe_slug] = { sum: 0, count: 0 };
            ratings[r.recipe_slug].sum += r.rating;
            ratings[r.recipe_slug].count++;
          }
          const avgs: Record<string, { avg: number; count: number }> = {};
          for (const [slug, data] of Object.entries(ratings)) {
            avgs[slug] = { avg: data.sum / data.count, count: data.count };
          }
          setAvgRatings(avgs);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes, refreshKey]);

  // Check URL for ?recipe= param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const recipeSlug = params.get("recipe");
    if (recipeSlug && recipes.length > 0) {
      const found = recipes.find((r) => r.slug === recipeSlug);
      if (found) setSelected(found);
    }
  }, [recipes]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Detail view for a single recipe
  if (selected) {
    const groupedIngredients = selected.ingredients.reduce(
      (acc, ing) => {
        const group = ing.group || "Ingredients";
        if (!acc[group]) acc[group] = [];
        acc[group].push(ing);
        return acc;
      },
      {} as Record<string, typeof selected.ingredients>
    );

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => {
            setSelected(null);
            window.history.replaceState(null, "", "/community/");
          }}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Community Recipes
        </button>

        <div className="max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] uppercase tracking-widest bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
                Community
              </span>
              <span className="text-xs text-text-dim">
                by {selected.author_name}
              </span>
              <span className="text-xs text-text-dim">
                {formatDate(selected.created_at)}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl mb-3">
              {selected.title}
            </h2>
            <p className="text-text-muted leading-relaxed">
              {selected.description}
            </p>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 py-4 border-y border-border mb-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim block">
                Difficulty
              </span>
              <span className="text-sm text-text">{selected.difficulty}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim block">
                Cook Time
              </span>
              <span className="text-sm text-text">{selected.cook_time}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim block">
                Servings
              </span>
              <span className="text-sm text-text">{selected.servings}</span>
            </div>
            {selected.heat_level > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim block">
                  Heat
                </span>
                <span className="text-sm text-text">
                  {HEAT_LABELS[selected.heat_level]}
                </span>
              </div>
            )}
          </div>

          {/* Ingredients & Directions */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <h3 className="font-[family-name:var(--font-display)] text-2xl mb-6">
                Ingredients
              </h3>
              {Object.entries(groupedIngredients).map(([group, items]) => (
                <div key={group} className="mb-4">
                  {Object.keys(groupedIngredients).length > 1 && (
                    <h4 className="text-sm uppercase tracking-[0.2em] text-accent-muted mb-2">
                      {group}
                    </h4>
                  )}
                  <ul className="space-y-2">
                    {items.map((ing, i) => (
                      <li key={i} className="text-sm text-text-muted">
                        {ing.amount && (
                          <span className="text-accent font-semibold">
                            {ing.amount}{" "}
                          </span>
                        )}
                        {ing.item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3">
              <h3 className="font-[family-name:var(--font-display)] text-2xl mb-6">
                Directions
              </h3>
              {selected.directions.length > 0 ? (
                <ol className="space-y-4">
                  {selected.directions.map((step, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs text-text-muted">
                        {i + 1}
                      </span>
                      <span className="text-sm text-text-muted leading-relaxed pt-1.5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-text-muted text-sm italic">
                  Combine the ingredients to taste and make it your own!
                </p>
              )}
            </div>
          </div>

          {/* Reviews */}
          <ReviewSection
            recipeSlug={selected.slug}
            recipeSource="community"
          />
        </div>
      </motion.div>
    );
  }

  // Grid view
  if (loading) {
    return (
      <div className="text-center py-12 text-text-dim text-sm">
        Loading community recipes...
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-dim text-sm mb-1">
          No community recipes yet.
        </p>
        <p className="text-text-dim/60 text-xs">
          Be the first to share a recipe above!
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {recipes.map((recipe) => (
        <motion.div key={recipe.id} variants={staggerItem}>
          <button
            onClick={() => {
              setSelected(recipe);
              window.history.replaceState(
                null,
                "",
                `/community/?recipe=${recipe.slug}`
              );
            }}
            className="group block w-full text-left"
          >
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden glow-hover transition-all duration-500 hover:border-border-light hover:-translate-y-1">
              {/* Placeholder image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <div
                  className={`w-full h-full bg-gradient-to-br ${getPlaceholderColor(recipe.title)} flex items-center justify-center`}
                >
                  <span className="font-[family-name:var(--font-display)] text-6xl text-text/20">
                    {recipe.title.charAt(0)}
                  </span>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] uppercase tracking-widest bg-purple-500/80 text-white px-2.5 py-1 rounded-full font-medium">
                    Community
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight text-text group-hover:text-accent transition-colors duration-300 line-clamp-2">
                  {recipe.title}
                </h3>
                <p className="text-xs text-text-dim mt-1">
                  by {recipe.author_name}
                </p>
                {recipe.description && (
                  <p className="text-xs text-text-muted mt-1.5 line-clamp-2">
                    {recipe.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-text-dim">
                    {recipe.difficulty}
                  </span>
                  <span className="text-xs text-text-dim">
                    {recipe.cook_time}
                  </span>
                  {avgRatings[recipe.slug] && (
                    <div className="flex items-center gap-1 ml-auto">
                      <StarRating rating={avgRatings[recipe.slug].avg} size="sm" />
                      <span className="text-[10px] text-text-dim">
                        ({avgRatings[recipe.slug].count})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
}
