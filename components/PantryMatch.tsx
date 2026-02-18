"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { matchRecipe } from "@/lib/ingredients";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface PantryRecipe {
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
  ingredients: { item: string; group?: string }[];
}

const SUGGESTIONS = [
  "chicken",
  "garlic",
  "butter",
  "onion",
  "cheese",
  "bacon",
  "lettuce",
  "tomato",
  "mayo",
  "hot sauce",
  "pickles",
  "jalapeño",
];

// Words to strip when parsing spoken ingredient lists
const FILLER_WORDS = new Set([
  "i", "we", "got", "have", "had", "get", "some", "a", "an", "the",
  "lot", "lots", "of", "also", "oh", "um", "uh", "like", "maybe",
  "think", "there", "is", "are", "was", "and", "then", "plus",
  "with", "in", "my", "our", "at", "home", "fridge", "pantry",
  "kitchen", "cabinet", "freezer", "just", "really", "pretty",
  "sure", "know", "lets", "let's", "see", "well", "okay", "ok",
  "yeah", "yes", "no", "probably", "definitely", "little", "bit",
  "bunch", "couple", "few", "left", "over", "leftover", "too",
  "bought", "picked", "up", "still",
]);

/** Parse a spoken ramble into individual ingredient terms */
function parseSpokenIngredients(transcript: string): string[] {
  // Split on commas, "and", "also", "plus", "then", periods
  const segments = transcript
    .toLowerCase()
    .split(/[,.]|\band\b|\balso\b|\bplus\b|\bthen\b|\boh\b/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const ingredients: string[] = [];
  for (const segment of segments) {
    // Remove filler words, keep the substance
    const words = segment.split(/\s+/).filter((w) => {
      const clean = w.replace(/[^a-záéíóúñ]/gi, "");
      return clean.length > 0 && !FILLER_WORDS.has(clean);
    });
    if (words.length > 0 && words.length <= 5) {
      const ingredient = words
        .map((w) => w.replace(/[^a-záéíóúñ\s-]/gi, ""))
        .join(" ")
        .trim();
      if (ingredient.length > 1) {
        ingredients.push(ingredient);
      }
    } else if (words.length > 5) {
      // If too many words, try to extract known-looking food terms
      const ingredient = words
        .slice(0, 4)
        .map((w) => w.replace(/[^a-záéíóúñ\s-]/gi, ""))
        .join(" ")
        .trim();
      if (ingredient.length > 1) {
        ingredients.push(ingredient);
      }
    }
  }
  return ingredients;
}

export default function PantryMatch({
  recipes,
}: {
  recipes: PantryRecipe[];
}) {
  const [pantry, setPantry] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setSpeechSupported(!!SR);
  }, []);

  const addIngredient = useCallback(
    (item: string) => {
      const trimmed = item.trim().toLowerCase();
      if (trimmed && !pantry.includes(trimmed)) {
        setPantry((prev) => [...prev, trimmed]);
      }
      setInput("");
    },
    [pantry]
  );

  const addMultipleIngredients = useCallback(
    (items: string[]) => {
      setPantry((prev) => {
        const next = [...prev];
        for (const item of items) {
          const trimmed = item.trim().toLowerCase();
          if (trimmed && !next.includes(trimmed)) {
            next.push(trimmed);
          }
        }
        return next;
      });
    },
    []
  );

  const removeIngredient = useCallback((item: string) => {
    setPantry((prev) => prev.filter((i) => i !== item));
  }, []);

  const clearAll = useCallback(() => {
    setPantry([]);
    setExpandedCard(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && input.trim()) {
        e.preventDefault();
        addIngredient(input);
      }
      if (e.key === "Backspace" && !input && pantry.length > 0) {
        setPantry((prev) => prev.slice(0, -1));
      }
    },
    [input, addIngredient, pantry.length]
  );

  const startListening = useCallback(() => {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setLiveTranscript(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setListening(false);
      setLiveTranscript("");
    };

    recognition.onend = () => {
      // Parse the final transcript into ingredients
      if (finalTranscript.trim()) {
        const parsed = parseSpokenIngredients(finalTranscript);
        if (parsed.length > 0) {
          addMultipleIngredients(parsed);
        }
      }
      setListening(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [addMultipleIngredients]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const results = useMemo(() => {
    if (pantry.length === 0) return [];
    return recipes
      .map((r, i) => ({
        recipe: r,
        match: matchRecipe(pantry, r.ingredients, i),
      }))
      .filter((r) => r.match.matchPercent > 0)
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [pantry, recipes]);

  const availableSuggestions = SUGGESTIONS.filter(
    (s) => !pantry.includes(s.toLowerCase())
  );

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <div
          className={`flex items-center gap-2 bg-bg-surface border rounded-lg px-4 py-3 transition-colors ${
            listening
              ? "border-red-400/70 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              : "border-border focus-within:border-accent/50"
          }`}
        >
          <svg
            className="w-5 h-5 text-text-dim flex-shrink-0"
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
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              listening
                ? "Listening... tell me what you have!"
                : "Type an ingredient and press Enter..."
            }
            className="flex-1 bg-transparent text-text placeholder:text-text-dim outline-none text-sm"
            disabled={listening}
          />
          {pantry.length > 0 && !listening && (
            <span className="text-xs text-text-dim">
              {results.length} match{results.length !== 1 ? "es" : ""}
            </span>
          )}

          {/* Microphone button */}
          {speechSupported && (
            <button
              onClick={listening ? stopListening : startListening}
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-bg-elevated text-text-muted hover:text-accent hover:bg-accent/10"
              }`}
              aria-label={listening ? "Stop listening" : "Speak ingredients"}
              title={listening ? "Tap to stop" : "Speak your ingredients"}
            >
              {listening ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
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
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Live transcript while recording */}
        <AnimatePresence>
          {listening && liveTranscript && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 px-4 py-2 bg-bg-elevated border border-border rounded-lg"
            >
              <p className="text-xs text-text-dim mb-1">Hearing:</p>
              <p className="text-sm text-text-muted italic">
                &ldquo;{liveTranscript}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chips row */}
      {pantry.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {pantry.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 bg-accent/15 text-accent border border-accent/25 rounded-full px-3 py-1 text-sm"
            >
              {item}
              <button
                onClick={() => removeIngredient(item)}
                className="hover:text-text transition-colors"
                aria-label={`Remove ${item}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="text-xs text-text-dim hover:text-accent transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Empty state with suggestions */}
      {pantry.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🍳</div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl mb-3">
            What&apos;s in your kitchen?
          </h2>
          <p className="text-text-muted mb-4 max-w-md mx-auto">
            Add ingredients you have on hand and we&apos;ll find recipes you can
            make. The more you add, the better the matches.
          </p>
          {speechSupported && (
            <p className="text-text-dim text-sm mb-8 max-w-md mx-auto">
              Or tap the microphone and just ramble about what&apos;s in your
              fridge — we&apos;ll figure it out.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {availableSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => addIngredient(s)}
                className="px-4 py-2 bg-bg-surface border border-border rounded-full text-sm text-text-muted hover:border-accent/50 hover:text-accent transition-all duration-200"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion chips when pantry has items */}
      {pantry.length > 0 && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-xs text-text-dim mr-1">Try adding:</span>
          {availableSuggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              onClick={() => addIngredient(s)}
              className="px-3 py-1 bg-bg-surface border border-border rounded-full text-xs text-text-dim hover:border-accent/30 hover:text-accent transition-all duration-200"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {pantry.length > 0 && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted">
            No recipes match those ingredients. Try adding more common
            ingredients like chicken, garlic, or butter.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          key={pantry.join(",")}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {results.map(({ recipe, match }) => (
            <motion.div key={recipe.id} variants={staggerItem}>
              <div className="bg-bg-surface border border-border rounded-lg overflow-hidden glow-hover transition-all duration-500 hover:border-border-light hover:-translate-y-1">
                {/* Image with match badge */}
                <Link href={`/recipes/${recipe.slug}/`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent-dark to-accent-muted flex items-center justify-center">
                        <span className="font-[family-name:var(--font-display)] text-6xl text-text/20">
                          {recipe.title.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Match badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          match.matchPercent >= 80
                            ? "bg-yellow-500/90 text-black"
                            : match.matchPercent >= 50
                              ? "bg-accent/80 text-bg"
                              : "bg-bg/70 text-text-muted backdrop-blur-sm border border-border"
                        }`}
                      >
                        {match.matchPercent}% match
                      </span>
                    </div>

                    {/* Source badge */}
                    {recipe.source === "cookbook" && (
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] uppercase tracking-widest bg-accent/90 text-bg px-2.5 py-1 rounded-full font-medium">
                          Cookbook
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  <Link href={`/recipes/${recipe.slug}/`}>
                    <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight text-text hover:text-accent transition-colors duration-300 line-clamp-2">
                      {recipe.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-text-muted mt-1.5 uppercase tracking-wider">
                    {recipe.categoryName}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-text-dim">
                      {match.matchedIngredients.length}/{match.totalUnique}{" "}
                      ingredients
                    </span>
                    <span className="text-xs text-text-dim">
                      {recipe.cookTime}
                    </span>
                    <button
                      onClick={() =>
                        setExpandedCard(
                          expandedCard === recipe.id ? null : recipe.id
                        )
                      }
                      className="ml-auto text-xs text-accent hover:text-accent-light transition-colors"
                    >
                      {expandedCard === recipe.id ? "Hide" : "Details"}
                    </button>
                  </div>

                  {/* Expandable ingredient match details */}
                  <AnimatePresence>
                    {expandedCard === recipe.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-border space-y-1.5">
                          {match.matchedIngredients.map((ing) => (
                            <div
                              key={ing}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                              <span className="text-text-muted">{ing}</span>
                            </div>
                          ))}
                          {match.missingIngredients.map((ing) => (
                            <div
                              key={ing}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-text-dim/30 flex-shrink-0" />
                              <span className="text-text-dim">{ing}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
