"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface CategoryGridItem {
  id: string;
  name: string;
  count: number;
  image: string | null;
  linkTo?: string;
}

interface CategoryGridProps {
  categories: CategoryGridItem[];
}

const PLACEHOLDER_GRADIENTS = [
  "from-accent-dark/40 to-accent-muted/20",
  "from-[#4A3728]/40 to-[#6B4F2D]/20",
  "from-[#2D3A2B]/40 to-[#4A5F47]/20",
  "from-[#3A2828]/40 to-[#5F4747]/20",
  "from-[#2B2D3A]/40 to-[#474A5F]/20",
  "from-[#3A352B]/40 to-[#5F5747]/20",
];

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <motion.div key={cat.id} variants={staggerItem}>
            <Link
              href={cat.linkTo || `/categories/${cat.id}/`}
              className="block group"
            >
              <div className="relative overflow-hidden rounded-lg bg-bg-surface border border-border hover:border-border-light transition-all duration-500 glow-hover">
                <div className="relative h-32 overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-all duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/60 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg text-text group-hover:text-accent transition-colors duration-300">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-text-dim mt-0.5">
                      {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-text-dim group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
