"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getUser, setUser } from "@/lib/user";

const PARSE_URL =
  "https://n8n-main-instance-production-c69d.up.railway.app/webhook/parse-recipe";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ParsedRecipe {
  title: string;
  description: string;
  ingredients: { item: string; amount?: string; group?: string }[];
  directions: string[];
  difficulty: string;
  cookTime: string;
  servings: number;
  heatLevel: number;
}

export default function CommunitySubmitForm({
  onRecipeAdded,
}: {
  onRecipeAdded?: () => void;
}) {
  const [name, setName] = useState(() => getUser()?.name || "");
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "parsing" | "preview" | "saving" | "done" | "error"
  >("idle");
  const [parsed, setParsed] = useState<ParsedRecipe | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rawText.trim()) return;

    const user = setUser(name.trim());
    setStatus("parsing");
    setErrorMsg("");

    try {
      // Call n8n webhook to parse recipe
      const res = await fetch(PARSE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });

      if (!res.ok) throw new Error("Failed to parse recipe");

      const data = await res.json();
      const recipe: ParsedRecipe = {
        title: data.title || "Untitled Recipe",
        description: data.description || "",
        ingredients: data.ingredients || [],
        directions: data.directions || [],
        difficulty: data.difficulty || "Medium",
        cookTime: data.cookTime || data.cook_time || "30 min",
        servings: data.servings || 4,
        heatLevel: data.heatLevel || data.heat_level || 0,
      };

      setParsed(recipe);
      setStatus("preview");
    } catch {
      setErrorMsg(
        "Our AI chef had trouble reading that recipe. Try adding more detail or formatting."
      );
      setStatus("error");
    }
  };

  const confirmSubmit = async () => {
    if (!parsed) return;
    setStatus("saving");

    const user = getUser()!;
    const slug = slugify(parsed.title) + "-" + Date.now().toString(36);

    const { error } = await supabase.from("community_recipes").insert({
      author_name: user.name,
      raw_text: rawText,
      title: parsed.title,
      slug,
      description: parsed.description,
      ingredients: parsed.ingredients,
      directions: parsed.directions,
      difficulty: parsed.difficulty,
      cook_time: parsed.cookTime,
      servings: parsed.servings,
      heat_level: parsed.heatLevel,
      status: "processed",
    });

    if (error) {
      setErrorMsg("Failed to save recipe. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("done");
    setRawText("");
    setParsed(null);
    onRecipeAdded?.();
    setTimeout(() => setStatus("idle"), 4000);
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6 mb-10">
      <h3 className="font-[family-name:var(--font-display)] text-xl mb-1">
        Share Your Recipe
      </h3>
      <p className="text-sm text-text-muted mb-5">
        Paste or type your recipe — ingredients, directions, tips, whatever
        you&apos;ve got. Our AI chef will organize it.
      </p>

      <AnimatePresence mode="wait">
        {status === "preview" && parsed ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-bg border border-border rounded-lg p-5">
              <h4 className="font-[family-name:var(--font-display)] text-lg text-accent mb-1">
                {parsed.title}
              </h4>
              <p className="text-sm text-text-muted mb-3">
                {parsed.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs text-text-dim mb-4">
                <span>Difficulty: {parsed.difficulty}</span>
                <span>Cook Time: {parsed.cookTime}</span>
                <span>Servings: {parsed.servings}</span>
                <span>
                  Heat:{" "}
                  {
                    ["None", "Mild", "Medium", "Spicy", "Hot", "Inferno"][
                      parsed.heatLevel
                    ]
                  }
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-text-muted mb-2">
                    Ingredients ({parsed.ingredients.length})
                  </h5>
                  <ul className="space-y-1">
                    {parsed.ingredients.slice(0, 8).map((ing, i) => (
                      <li key={i} className="text-sm text-text-muted">
                        {ing.amount && (
                          <span className="text-accent">{ing.amount} </span>
                        )}
                        {ing.item}
                      </li>
                    ))}
                    {parsed.ingredients.length > 8 && (
                      <li className="text-xs text-text-dim">
                        +{parsed.ingredients.length - 8} more
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs uppercase tracking-wider text-text-muted mb-2">
                    Directions ({parsed.directions.length} steps)
                  </h5>
                  <ol className="space-y-1">
                    {parsed.directions.slice(0, 4).map((step, i) => (
                      <li key={i} className="text-sm text-text-muted">
                        <span className="text-accent mr-1">{i + 1}.</span>
                        {step.length > 80 ? step.slice(0, 80) + "..." : step}
                      </li>
                    ))}
                    {parsed.directions.length > 4 && (
                      <li className="text-xs text-text-dim">
                        +{parsed.directions.length - 4} more steps
                      </li>
                    )}
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSubmit}
                className="px-5 py-2.5 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                Looks Good — Post It!
              </button>
              <button
                onClick={() => {
                  setStatus("idle");
                  setParsed(null);
                }}
                className="px-5 py-2.5 bg-bg-elevated text-text-muted text-sm rounded-lg hover:text-text transition-colors border border-border"
              >
                Edit Raw Text
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-text-dim block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chef's name"
                className="w-full sm:w-64 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-xs text-text-dim block mb-1.5">
                Your Recipe
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste your recipe here — it can be messy! Example:\n\nGrandma's Mac & Cheese\n2 cups elbow macaroni\n3 cups sharp cheddar\n1 cup milk\n2 tbsp butter\nSalt and pepper\n\nBoil pasta. Make a roux with butter and flour, add milk. Stir in cheese until melted. Combine with pasta. Bake at 375 for 25 min.`}
                rows={8}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={
                  status === "parsing" || !name.trim() || !rawText.trim()
                }
                className="px-5 py-2.5 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === "parsing" ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full"
                    />
                    AI is reading your recipe...
                  </span>
                ) : (
                  "Submit Recipe"
                )}
              </button>

              <AnimatePresence>
                {status === "done" && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-green-400"
                  >
                    Recipe posted!
                  </motion.span>
                )}
                {status === "error" && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-red-400"
                  >
                    {errorMsg}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
