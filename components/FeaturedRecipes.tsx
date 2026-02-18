"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import AnimatedText, { AnimatedLine } from "./AnimatedText";

interface FeaturedRecipe {
  title: string;
  slug: string;
  image: string;
  category: string;
  description: string;
}

function pickRandom(pool: FeaturedRecipe[], count: number): FeaturedRecipe[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function FeaturedRecipes({
  recipes: pool,
}: {
  recipes: FeaturedRecipe[];
}) {
  const [recipes] = useState(() => pickRandom(pool, 3));
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-16">
          <div>
            <AnimatedLine>
              <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
                Featured
              </p>
            </AnimatedLine>
            <AnimatedText
              text="Editor's Picks"
              as="h2"
              className="font-[family-name:var(--font-display)] text-4xl md:text-5xl"
            />
          </div>
          <AnimatedLine delay={0.3}>
            <Link
              href="/recipes/"
              className="text-sm text-text-muted hover:text-accent transition-colors duration-300 uppercase tracking-[0.15em]"
            >
              View all recipes &rarr;
            </Link>
          </AnimatedLine>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recipes.map((recipe, i) => (
            <FeaturedCard key={recipe.slug} recipe={recipe} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({
  recipe,
  index,
}: {
  recipe: FeaturedRecipe;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href={`/recipes/${recipe.slug}/`} className="group block">
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-bg-surface">
          <motion.div className="absolute inset-0" style={{ y }}>
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-[120%] object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          </motion.div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
              {recipe.category}
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-text group-hover:text-accent transition-colors duration-300">
              {recipe.title}
            </h3>
            <p className="text-sm text-text-muted mt-2 line-clamp-2">
              {recipe.description}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
