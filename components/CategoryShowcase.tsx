"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AnimatedText, { AnimatedLine } from "./AnimatedText";
import { staggerContainer, staggerItem } from "@/lib/animations";
import BlurImage from "./BlurImage";
import { getSrcSet } from "@/lib/imageUtils";

interface CategoryData {
  id: string;
  name: string;
  count: number;
  image: string | null;
}

const ACCENT_GRADIENTS = [
  "from-[#D4A574]/20 to-transparent",
  "from-[#8B6F47]/20 to-transparent",
  "from-[#6B8F71]/20 to-transparent",
  "from-[#8B5E3C]/20 to-transparent",
  "from-[#7B6F8E]/20 to-transparent",
];

export default function CategoryShowcase({
  categories,
}: {
  categories: CategoryData[];
}) {
  return (
    <section className="py-24 md:py-32 bg-bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <AnimatedLine>
            <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
              Browse By
            </p>
          </AnimatedLine>
          <AnimatedText
            text="Categories"
            as="h2"
            className="font-[family-name:var(--font-display)] text-4xl md:text-5xl"
          />
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {categories.map((cat, i) => (
            <motion.div key={cat.id} variants={staggerItem}>
              <Link
                href={
                  cat.id.startsWith("chapter-")
                    ? `/categories/cookbook/`
                    : `/categories/${cat.id}/`
                }
                className="group block relative overflow-hidden rounded-lg bg-bg-elevated border border-border hover:border-border-light transition-all duration-500 glow-hover"
              >
                {cat.image ? (
                  <div className="aspect-[3/2] overflow-hidden">
                    <BlurImage
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-80"
                      loading="lazy"
                      decoding="async"
                      width={1024}
                      height={1024}
                      srcSet={getSrcSet(cat.image)}
                      sizes="(max-width:640px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated via-bg-elevated/60 to-transparent" />
                  </div>
                ) : (
                  <div
                    className={`aspect-[3/2] bg-gradient-to-br ${ACCENT_GRADIENTS[i % ACCENT_GRADIENTS.length]}`}
                  />
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-[family-name:var(--font-display)] text-base text-text group-hover:text-accent transition-colors duration-300">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-text-dim mt-0.5">
                    {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
