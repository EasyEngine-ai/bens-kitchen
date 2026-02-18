"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RecipeCard from "./RecipeCard";
import { staggerContainer } from "@/lib/animations";

interface BrowserRecipe {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryName: string;
  image: string | null;
  difficulty: string;
  cookTime: string;
  heatLevel: number;
  source: string;
  ingredients: { item: string }[];
}

interface CategoryOption {
  id: string;
  name: string;
  count: number;
}

const DIFFICULTY_OPTIONS = ["All", "Easy", "Medium", "Hard"];
const HEAT_OPTIONS = [
  { label: "All Heat", value: -1 },
  { label: "No Heat", value: 0 },
  { label: "Mild", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Spicy", value: 3 },
  { label: "Hot+", value: 4 },
];

const SORT_OPTIONS = [
  { label: "A-Z", value: "alpha" },
  { label: "Heat Level", value: "heat" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Cookbook First", value: "source" },
];

export default function RecipeBrowser({
  recipes,
  categories,
  initialCategory,
  showCategoryChips,
}: {
  recipes: BrowserRecipe[];
  categories: CategoryOption[];
  initialCategory?: string;
  showCategoryChips?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory || "all"
  );
  const [difficulty, setDifficulty] = useState("All");
  const [heatLevel, setHeatLevel] = useState(-1);
  const [sortBy, setSortBy] = useState("alpha");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = recipes;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.ingredients.some((ing) => ing.item.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((r) => r.category === selectedCategory);
    }

    if (difficulty !== "All") {
      result = result.filter((r) => r.difficulty === difficulty);
    }

    if (heatLevel >= 0) {
      result = result.filter((r) =>
        heatLevel === 4 ? r.heatLevel >= 4 : r.heatLevel === heatLevel
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "heat":
          return b.heatLevel - a.heatLevel;
        case "difficulty": {
          const order = { Easy: 0, Medium: 1, Hard: 2 };
          return (
            (order[a.difficulty as keyof typeof order] ?? 0) -
            (order[b.difficulty as keyof typeof order] ?? 0)
          );
        }
        case "source":
          return a.source === "cookbook" ? -1 : 1;
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return result;
  }, [recipes, search, selectedCategory, difficulty, heatLevel, sortBy]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCategory("all");
    setDifficulty("All");
    setHeatLevel(-1);
    setSortBy("alpha");
  }, []);

  const hasActiveFilters =
    search ||
    selectedCategory !== "all" ||
    difficulty !== "All" ||
    heatLevel >= 0;

  return (
    <div>
      {/* Chapter filter chips (always visible) */}
      {showCategoryChips && categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
            Browse by Chapter
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === "all"
                  ? "bg-accent text-bg shadow-[0_0_15px_rgba(212,165,116,0.2)]"
                  : "bg-bg-surface text-text-muted border border-border hover:border-accent/50 hover:text-text"
              }`}
            >
              All Chapters
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-accent text-bg shadow-[0_0_15px_rgba(212,165,116,0.2)]"
                    : "bg-bg-surface text-text-muted border border-border hover:border-accent/50 hover:text-text"
                }`}
              >
                {cat.name}
                <span className="ml-1.5 opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes, ingredients..."
            className="w-full bg-bg-surface border border-border rounded-xl px-5 py-4 pl-12 text-text placeholder:text-text-dim focus:outline-none focus:border-accent/50 focus:shadow-[0_0_20px_rgba(212,165,116,0.1)] transition-all duration-300"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </motion.div>
      </div>

      {/* Filter toggle + active count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-sm uppercase tracking-[0.15em] transition-colors duration-300 ${
              showFilters ? "text-accent" : "text-text-muted hover:text-text"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Filters
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <p className="text-sm text-text-muted">
          <span className="text-accent counter-value">{filtered.length}</span>{" "}
          {filtered.length === 1 ? "recipe" : "recipes"}
        </p>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-bg-surface border border-border rounded-xl p-6 space-y-6">
              {/* Category */}
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-text-muted block mb-3">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    active={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </FilterChip>
                  {categories.map((cat) => (
                    <FilterChip
                      key={cat.id}
                      active={selectedCategory === cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name} ({cat.count})
                    </FilterChip>
                  ))}
                </div>
              </div>

              {/* Difficulty + Heat + Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-text-muted block mb-3">
                    Difficulty
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <FilterChip
                        key={d}
                        active={difficulty === d}
                        onClick={() => setDifficulty(d)}
                      >
                        {d}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-text-muted block mb-3">
                    Heat Level
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HEAT_OPTIONS.map((h) => (
                      <FilterChip
                        key={h.value}
                        active={heatLevel === h.value}
                        onClick={() => setHeatLevel(h.value)}
                      >
                        {h.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-text-muted block mb-3">
                    Sort By
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((s) => (
                      <FilterChip
                        key={s.value}
                        active={sortBy === s.value}
                        onClick={() => setSortBy(s.value)}
                      >
                        {s.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {filtered.length > 0 ? (
        <motion.div
          key={`${selectedCategory}-${difficulty}-${heatLevel}-${sortBy}-${search}`}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              title={recipe.title}
              slug={recipe.slug}
              category={recipe.categoryName}
              image={recipe.image}
              difficulty={recipe.difficulty}
              cookTime={recipe.cookTime}
              heatLevel={recipe.heatLevel}
              source={recipe.source}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <p className="font-[family-name:var(--font-display)] text-2xl text-text-muted mb-2">
            No recipes found
          </p>
          <p className="text-text-dim text-sm">
            Try adjusting your search or filters
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 text-sm text-accent hover:text-accent-light transition-colors uppercase tracking-wider"
          >
            Clear all filters
          </button>
        </motion.div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
        active
          ? "bg-accent text-bg"
          : "bg-bg-elevated text-text-muted border border-border hover:border-border-light hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
