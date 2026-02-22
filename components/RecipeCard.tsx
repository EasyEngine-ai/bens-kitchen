"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerItem } from "@/lib/animations";

interface RecipeCardProps {
  title: string;
  slug: string;
  category: string;
  image: string | null;
  difficulty: string;
  cookTime: string;
  heatLevel: number;
  source: string;
}

const HEAT_LABELS = ["", "Mild", "Medium", "Spicy", "Hot", "Inferno"];
const HEAT_COLORS = [
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
  "bg-heat-5",
];

const PLACEHOLDER_COLORS = [
  "from-accent-dark to-accent-muted",
  "from-[#4A3728] to-[#6B4F2D]",
  "from-[#2D3A2B] to-[#4A5F47]",
  "from-[#3A2828] to-[#5F4747]",
  "from-[#2B2D3A] to-[#474A5F]",
];

function getPlaceholderColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export default function RecipeCard({
  title,
  slug,
  category,
  image,
  difficulty,
  cookTime,
  heatLevel,
  source,
}: RecipeCardProps) {
  return (
    <motion.div variants={staggerItem}>
      <Link href={`/recipes/${slug}/`} className="group block">
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden glow-hover transition-all duration-500 hover:border-border-light hover:-translate-y-1">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                width={1024}
                height={1024}
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${getPlaceholderColor(title)} flex items-center justify-center`}
              >
                <span className="font-[family-name:var(--font-display)] text-6xl text-text/20">
                  {title.charAt(0)}
                </span>
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-surface/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Source badge */}
            {source === "cookbook" && (
              <div className="absolute top-3 left-3">
                <span className="text-[10px] uppercase tracking-widest bg-accent/90 text-bg px-2.5 py-1 rounded-full font-medium">
                  Cookbook
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-[family-name:var(--font-display)] text-lg leading-tight text-text group-hover:text-accent transition-colors duration-300 line-clamp-2">
              {title}
            </h3>

            <p className="text-xs text-text-muted mt-1.5 uppercase tracking-wider">
              {category}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-text-dim">{difficulty}</span>
              <span className="text-xs text-text-dim">{cookTime}</span>
              {heatLevel > 0 && (
                <div className="flex items-center gap-1 ml-auto">
                  {Array.from({ length: heatLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${HEAT_COLORS[heatLevel]}`}
                    />
                  ))}
                  <span className="text-[10px] text-text-dim ml-1">
                    {HEAT_LABELS[heatLevel]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
