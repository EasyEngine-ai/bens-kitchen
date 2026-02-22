"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { AnimatedLine } from "./AnimatedText";

interface StatItemProps {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}

function StatItem({ value, suffix = "", label, delay = 0 }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const duration = 2000;
      const startTime = Date.now();
      const step = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(eased * value));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isInView, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <div className="font-[family-name:var(--font-display)] text-accent counter-value text-4xl md:text-5xl">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-text-muted mt-2">
        {label}
      </div>
    </motion.div>
  );
}

const CATEGORIES = [
  { label: "Chicken Sandwiches", count: 100 },
  { label: "Sauces", count: 64 },
  { label: "Salads & Sides", count: 30 },
  { label: "Crockpot", count: 22 },
  { label: "Pasta", count: 12 },
  { label: "Main Dishes", count: 12 },
  { label: "Soups & Stews", count: 5 },
  { label: "Dips & Spreads", count: 5 },
  { label: "Breakfast", count: 3 },
];

export default function StatsCounter() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <AnimatedLine>
            <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
              By The Numbers
            </p>
          </AnimatedLine>
        </div>

        {/* Top stats: Recipes + Components */}
        <div className="grid grid-cols-2 gap-8 mb-14 max-w-md mx-auto">
          <StatItem
            value={250}
            suffix="+"
            label="Original Recipes"
            delay={0}
          />
          <StatItem
            value={581}
            label="Handmade Components"
            delay={0.1}
          />
        </div>

        <div className="divider mb-12" />

        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-8 gap-y-5 max-w-3xl mx-auto">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="flex items-baseline gap-2"
            >
              <span className="font-[family-name:var(--font-display)] text-accent text-2xl counter-value">
                {cat.count}
              </span>
              <span className="text-text-muted text-xs leading-tight">
                {cat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
