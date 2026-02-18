"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { AnimatedLine } from "./AnimatedText";
import type { Ingredient } from "@/lib/recipes";

interface RecipeDetailProps {
  title: string;
  categoryName: string;
  description: string;
  ingredients: Ingredient[];
  directions: string[];
  image: string | null;
  source: string;
  difficulty: string;
  cookTime: string;
  servings: number;
  heatLevel: number;
  youtubeUrl?: string;
  componentCount?: number;
  relatedRecipes: {
    title: string;
    slug: string;
    image: string | null;
    categoryName: string;
  }[];
}

const HEAT_LABELS = ["None", "Mild", "Medium", "Spicy", "Hot", "Inferno"];
const HEAT_EMOJI = ["", "\u{1F336}", "\u{1F336}\u{1F336}", "\u{1F525}", "\u{1F525}\u{1F525}", "\u{1F4A5}"];

export default function RecipeDetail({
  title,
  categoryName,
  description,
  ingredients,
  directions,
  image,
  source,
  difficulty,
  cookTime,
  servings: defaultServings,
  heatLevel,
  youtubeUrl,
  componentCount,
  relatedRecipes,
}: RecipeDetailProps) {
  const [servings, setServings] = useState(defaultServings);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  const ratio = servings / defaultServings;

  const toggleIngredient = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Scale an amount string by ratio
  const scaleAmount = (amount?: string) => {
    if (!amount || ratio === 1) return amount;
    const match = amount.match(/^([\d.\/]+)/);
    if (!match) return amount;
    let num: number;
    if (match[1].includes("/")) {
      const [n, d] = match[1].split("/").map(Number);
      if (!d || isNaN(n) || isNaN(d)) return amount;
      num = n / d;
    } else {
      num = parseFloat(match[1]);
    }
    const scaled = num * ratio;
    const display =
      scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1).replace(/\.0$/, "");
    return amount.replace(match[1], display);
  };

  // Group ingredients by group name
  const groupedIngredients = ingredients.reduce(
    (acc, ing, i) => {
      const group = ing.group || "Ingredients";
      if (!acc[group]) acc[group] = [];
      acc[group].push({ ...ing, originalIndex: i });
      return acc;
    },
    {} as Record<string, (Ingredient & { originalIndex: number })[]>
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div ref={heroRef} className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {image ? (
          <>
            <motion.div
              className="absolute inset-0"
              style={{ y: imageY, scale: imageScale }}
            >
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bg-surface to-bg-elevated" />
        )}

        {/* Breadcrumb */}
        <div className="absolute top-24 left-0 right-0 z-10 px-6">
          <div className="max-w-4xl mx-auto">
            <nav className="flex items-center gap-2 text-xs text-text-dim">
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link
                href="/recipes/"
                className="hover:text-accent transition-colors"
              >
                Recipes
              </Link>
              <span>/</span>
              <span className="text-text-muted">{title}</span>
            </nav>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-10">
          <div className="max-w-4xl mx-auto">
            <AnimatedLine>
              <div className="flex items-center gap-3 mb-3">
                {source === "cookbook" && (
                  <span className="text-[10px] uppercase tracking-widest bg-accent/90 text-bg px-2.5 py-1 rounded-full">
                    Cookbook
                  </span>
                )}
                <span className="text-xs uppercase tracking-[0.2em] text-accent">
                  {categoryName}
                </span>
              </div>
            </AnimatedLine>
            <AnimatedLine delay={0.1}>
              <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl lg:text-6xl leading-tight">
                {title}
              </h1>
            </AnimatedLine>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 relative z-10">
        {/* Meta bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-6 py-6 border-b border-border mb-10"
        >
          <MetaItem label="Difficulty" value={difficulty} />
          <MetaItem label="Cook Time" value={cookTime} />
          <MetaItem
            label="Heat"
            value={`${HEAT_LABELS[Math.min(heatLevel, 5)] || "None"} ${HEAT_EMOJI[Math.min(heatLevel, 5)] || ""}`}
          />
          {componentCount ? (
            <MetaItem
              label="Components"
              value={`${componentCount} components`}
            />
          ) : null}

          {/* Serving adjuster */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs uppercase tracking-[0.15em] text-text-muted">
              Servings
            </span>
            <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-full px-1">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-accent transition-colors rounded-full hover:bg-bg-elevated"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-medium counter-value">
                {servings}
              </span>
              <button
                onClick={() => setServings(servings + 1)}
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-accent transition-colors rounded-full hover:bg-bg-elevated"
              >
                +
              </button>
            </div>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-text-muted leading-relaxed mb-12 text-lg"
        >
          {description}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Ingredients */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-6">
              Ingredients
            </h2>

            {ratio !== 1 && (
              <p className="text-xs text-accent mb-4 uppercase tracking-wider">
                Adjusted for {servings} servings
              </p>
            )}

            {Object.entries(groupedIngredients).map(([group, items]) => (
              <div key={group} className="mb-6">
                {Object.keys(groupedIngredients).length > 1 && (
                  <h3 className="text-sm uppercase tracking-[0.2em] text-accent-muted mb-3 font-medium">
                    {group}
                  </h3>
                )}
                <ul className="space-y-3">
                  {items.map((ing) => (
                    <li key={ing.originalIndex}>
                      <button
                        onClick={() => toggleIngredient(ing.originalIndex)}
                        className={`flex items-start gap-3 w-full text-left group transition-all duration-200 ${
                          checked.has(ing.originalIndex)
                            ? "opacity-40"
                            : "opacity-100"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                            checked.has(ing.originalIndex)
                              ? "bg-accent border-accent"
                              : "border-border-light group-hover:border-accent/50"
                          }`}
                        >
                          {checked.has(ing.originalIndex) && (
                            <svg
                              className="w-3 h-3 text-bg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`text-base leading-relaxed ${
                            checked.has(ing.originalIndex)
                              ? "line-through text-text-dim"
                              : ""
                          }`}
                        >
                          {ing.amount && (
                            <span className="text-accent font-semibold">
                              {scaleAmount(ing.amount)}{" "}
                            </span>
                          )}
                          {ing.item}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>

          {/* Directions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-3"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-6">
              Directions
            </h2>

            {directions.length > 0 ? (
              <ol className="space-y-6">
                {directions.map((step, i) => (
                  <li key={i}>
                    <button
                      onClick={() => toggleStep(i)}
                      className={`flex items-start gap-4 w-full text-left group transition-all duration-300 ${
                        completedSteps.has(i) ? "opacity-40" : ""
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                          completedSteps.has(i)
                            ? "bg-accent text-bg"
                            : "bg-bg-elevated text-text-muted border border-border group-hover:border-accent/50"
                        }`}
                      >
                        {completedSteps.has(i) ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={`text-sm leading-relaxed pt-1.5 ${
                          completedSteps.has(i)
                            ? "line-through text-text-dim"
                            : "text-text-muted"
                        }`}
                      >
                        {step}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="bg-bg-surface border border-border rounded-lg p-6">
                <p className="text-text-muted text-sm italic">
                  This recipe is an ingredient-forward creation — combine the
                  ingredients to taste and make it your own!
                </p>
              </div>
            )}

            {/* YouTube link */}
            {youtubeUrl && (
              <div className="mt-8 p-4 bg-bg-surface border border-border rounded-lg">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-accent hover:text-accent-light transition-colors"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Watch the recipe video
                </a>
              </div>
            )}
          </motion.div>
        </div>

        {/* Related recipes */}
        {relatedRecipes.length > 0 && (
          <div className="mt-24 pt-12 border-t border-border">
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-8">
              More Like This
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedRecipes.map((r) => (
                <Link
                  key={r.slug}
                  href={`/recipes/${r.slug}/`}
                  className="group block"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-bg-surface mb-2">
                    {r.image ? (
                      <img
                        src={r.image}
                        alt={r.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-bg-elevated to-bg-surface flex items-center justify-center">
                        <span className="font-[family-name:var(--font-display)] text-3xl text-text/10">
                          {r.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm text-text group-hover:text-accent transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="text-xs text-text-dim mt-0.5">
                    {r.categoryName}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim block">
        {label}
      </span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}
