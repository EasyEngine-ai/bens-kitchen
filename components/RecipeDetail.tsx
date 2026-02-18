"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AnimatedLine } from "./AnimatedText";
import type { Ingredient } from "@/lib/recipes";
import ReviewSection from "./ReviewSection";

const TTS_URL =
  "https://n8n-main-instance-production-c69d.up.railway.app/webhook/tts";
const CHAT_URL =
  "https://n8n-main-instance-production-c69d.up.railway.app/webhook/chat";

interface RecipeDetailProps {
  title: string;
  slug: string;
  categoryName: string;
  description: string;
  ingredients: Ingredient[];
  directions: string[];
  image: string | null;
  source: "cookbook" | "personal" | "community";
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
  slug,
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

  // AI Summary state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Step-by-Step Guide state
  const [guideActive, setGuideActive] = useState(false);
  const [guideStatus, setGuideStatus] = useState<"idle" | "generating" | "speaking" | "paused">("idle");
  const [guideStep, setGuideStep] = useState("");
  const guideAudioRef = useRef<HTMLAudioElement | null>(null);
  const guideAbortRef = useRef(false);
  const guidePausedRef = useRef(false);
  const guideRecognitionRef = useRef<SpeechRecognition | null>(null);
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

  // Build recipe context string for AI
  const recipeContext = `Recipe: ${title}\nCategory: ${categoryName}\nDifficulty: ${difficulty}\nCook Time: ${cookTime}\nServings: ${defaultServings}\nHeat Level: ${HEAT_LABELS[Math.min(heatLevel, 5)]}\n\nDescription: ${description}\n\nIngredients:\n${ingredients.map((i) => `- ${i.amount ? i.amount + " " : ""}${i.item}${i.group ? " (" + i.group + ")" : ""}`).join("\n")}\n\nDirections:\n${directions.map((d, i) => `${i + 1}. ${d}`).join("\n")}`;

  // AI Summary
  const fetchSummary = useCallback(async () => {
    if (summaryText) {
      setSummaryOpen(!summaryOpen);
      return;
    }
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Give me a super fun, playful, and exciting summary of this recipe! Get me PUMPED to make it! Highlight the key ingredients that really matter, give me the quick rundown on how to make it, and make it feel like an adventure. Keep it to 3-4 short paragraphs max. Be enthusiastic and use personality! Here's the recipe:\n\n${recipeContext}`,
        }),
      });
      const data = await res.json();
      setSummaryText(data.reply || data.output || "Oops! Couldn't generate a summary right now.");
    } catch {
      setSummaryText("Hmm, looks like the AI chef stepped out for a smoke break. Try again in a sec!");
    }
    setSummaryLoading(false);
  }, [summaryText, summaryOpen, recipeContext]);

  // Step-by-Step Cooking Guide
  const playTTSSegment = useCallback(async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(TTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        guideAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          guideAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          guideAudioRef.current = null;
          reject(new Error("Audio playback failed"));
        };
        audio.play();
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const waitForResume = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        if (guideAbortRef.current) return resolve();
        if (!guidePausedRef.current) return resolve();
        setTimeout(check, 300);
      };
      check();
    });
  }, []);

  const startVoiceCommands = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (!last.isFinal) return;
      const text = last[0].transcript.toLowerCase().trim();
      if (text.includes("pause") || text.includes("stop") || text.includes("shut up")) {
        guidePausedRef.current = true;
        setGuideStatus("paused");
        if (guideAudioRef.current) {
          guideAudioRef.current.pause();
        }
      } else if (text.includes("restart") || text.includes("resume") || text.includes("continue") || text.includes("go") || text.includes("start")) {
        guidePausedRef.current = false;
        setGuideStatus("speaking");
        if (guideAudioRef.current) {
          guideAudioRef.current.play();
        }
      }
    };
    rec.onend = () => {
      if (!guideAbortRef.current) {
        try { rec.start(); } catch {}
      }
    };
    try { rec.start(); } catch {}
    guideRecognitionRef.current = rec;
  }, []);

  const startGuide = useCallback(async () => {
    guideAbortRef.current = false;
    guidePausedRef.current = false;
    setGuideActive(true);
    setGuideStatus("generating");
    setGuideStep("Getting your cooking guide ready...");

    try {
      // Generate the full guide script
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `You're a super fun, playful cooking buddy. The user is currently looking at the recipe "${title}" and just pressed the Step-by-Step Cooking Guide button. You ALREADY KNOW what recipe they're making — DO NOT ask them what they want to cook. Just dive right in!

Generate a complete cooking guide script for "${title}" that will be read aloud via text-to-speech.

IMPORTANT RULES:
- Start with a brief excited intro like "Alright! We're making ${title}! This is gonna be SO good!"
- Then say: "Quick heads up - if I'm going too fast, just say PAUSE and I'll zip it! Say RESTART when you're ready and we'll keep rolling!"
- Then list the ingredients they need to gather
- Then walk through each step clearly and at a relaxed pace
- Between steps, add a brief transition like "Alright, moving on!" or "You're crushing it!"
- End with an encouraging finish
- Keep it conversational, fun, lighthearted, not rushed
- Use simple language, no special characters or markdown
- Separate each section with ||| on its own line so I can split them

Here's the full recipe:\n\n${recipeContext}`,
        }),
      });
      const data = await res.json();
      const script = data.reply || data.output || "";

      if (guideAbortRef.current) return;

      // Split into segments
      const segments = script.split("|||").map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      // Start voice commands listener
      startVoiceCommands();

      setGuideStatus("speaking");

      // Play each segment
      for (let i = 0; i < segments.length; i++) {
        if (guideAbortRef.current) break;

        // Wait if paused
        if (guidePausedRef.current) {
          await waitForResume();
          if (guideAbortRef.current) break;
        }

        setGuideStep(segments[i].slice(0, 120) + (segments[i].length > 120 ? "..." : ""));

        try {
          await playTTSSegment(segments[i]);
        } catch {
          // Continue to next segment even if one fails
        }

        // Brief pause between segments
        if (i < segments.length - 1 && !guideAbortRef.current) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    } catch {
      setGuideStep("Oops! Something went wrong. Try again!");
    }

    // Done
    if (!guideAbortRef.current) {
      setGuideStatus("idle");
      setGuideStep("All done! You're a kitchen rockstar!");
      setTimeout(() => {
        if (!guideAbortRef.current) setGuideActive(false);
      }, 5000);
    }
    // Cleanup voice recognition
    if (guideRecognitionRef.current) {
      try { guideRecognitionRef.current.stop(); } catch {}
      guideRecognitionRef.current = null;
    }
  }, [recipeContext, playTTSSegment, waitForResume, startVoiceCommands]);

  const stopGuide = useCallback(() => {
    guideAbortRef.current = true;
    guidePausedRef.current = false;
    if (guideAudioRef.current) {
      guideAudioRef.current.pause();
      guideAudioRef.current = null;
    }
    if (guideRecognitionRef.current) {
      try { guideRecognitionRef.current.stop(); } catch {}
      guideRecognitionRef.current = null;
    }
    setGuideActive(false);
    setGuideStatus("idle");
    setGuideStep("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      guideAbortRef.current = true;
      if (guideAudioRef.current) {
        guideAudioRef.current.pause();
        guideAudioRef.current = null;
      }
      if (guideRecognitionRef.current) {
        try { guideRecognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

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
          className="text-text-muted leading-relaxed mb-8 text-lg"
        >
          {description}
        </motion.p>

        {/* AI Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-12"
        >
          <div className="flex flex-wrap gap-3">
            {/* AI Summary Button */}
            <button
              onClick={fetchSummary}
              disabled={summaryLoading}
              className="group flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all duration-300"
            >
              <span className="text-lg">
                {summaryLoading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    {"\u2728"}
                  </motion.span>
                ) : (
                  "\u2728"
                )}
              </span>
              <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                AI Summary
              </span>
            </button>

            {/* Step-by-Step Cooking Guide Button */}
            {!guideActive ? (
              <button
                onClick={startGuide}
                className="group flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300"
              >
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <span className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">
                  Step-by-Step Cooking Guide
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl">
                  {guideStatus === "generating" && (
                    <motion.div className="flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-emerald-400"
                      />
                      <span className="text-sm text-emerald-300">Preparing guide...</span>
                    </motion.div>
                  )}
                  {guideStatus === "speaking" && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 h-4">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ["4px", "16px", "4px"] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                            className="w-1 rounded-full bg-emerald-400"
                          />
                        ))}
                      </div>
                      <span className="text-sm text-emerald-300 max-w-[200px] truncate">{guideStep}</span>
                    </div>
                  )}
                  {guideStatus === "paused" && (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-sm">Paused</span>
                      <span className="text-xs text-text-dim">Say &quot;restart&quot; to continue</span>
                    </div>
                  )}
                  {guideStatus === "idle" && guideActive && (
                    <span className="text-sm text-emerald-300">{guideStep}</span>
                  )}
                </div>
                <button
                  onClick={stopGuide}
                  className="px-3 py-3 bg-red-500/20 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all"
                  title="Stop guide"
                >
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* AI Summary Panel */}
          <AnimatePresence>
            {summaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-6 bg-gradient-to-br from-purple-950/30 to-indigo-950/30 border border-purple-500/20 rounded-xl">
                  {summaryLoading ? (
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
                      />
                      <span className="text-sm text-purple-300">Your AI chef is cooking up a summary...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-purple-300 uppercase tracking-wider">AI Summary</h3>
                        <button
                          onClick={() => setSummaryOpen(false)}
                          className="text-text-dim hover:text-text transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-text-muted leading-relaxed whitespace-pre-line">{summaryText}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

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

        {/* Reviews */}
        <ReviewSection recipeSlug={slug} recipeSource={source} />

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
