"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import AnimatedText, { AnimatedLine } from "./AnimatedText";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.4, 0.8]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden"
    >
      {/* Parallax background image */}
      <motion.div className="absolute inset-0" style={{ y: imageY, scale: imageScale }}>
        <img
          src="/images/cover/cover.webp"
          alt="Ben's Kitchen"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-bg"
        style={{ opacity: overlayOpacity }}
      />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />

      {/* Content */}
      <motion.div
        style={{ y: textY }}
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
      >
        <AnimatedLine delay={0.2}>
          <p className="text-xs uppercase tracking-[0.4em] text-accent mb-6">
            A Personal Recipe Collection
          </p>
        </AnimatedLine>

        <AnimatedText
          text="Ben's Kitchen"
          as="h1"
          className="font-[family-name:var(--font-display)] text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.9]"
          delay={0.3}
        />

        <AnimatedLine delay={0.8}>
          <p className="mt-8 text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            210+ original recipes — from{" "}
            <span className="text-accent">signature chicken sandwiches</span> to
            everyday sauces, sides, and everything in between.
          </p>
        </AnimatedLine>

        <AnimatedLine delay={1}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <Link
              href="/recipes/"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-accent text-bg font-medium text-sm uppercase tracking-[0.15em] rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,165,116,0.3)]"
            >
              <span className="relative z-10">Explore Recipes</span>
              <svg
                className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
              <div className="absolute inset-0 bg-accent-light scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
            </Link>

            <Link
              href="/categories/cookbook/"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border-light text-text-muted text-sm uppercase tracking-[0.15em] rounded-full hover:border-accent hover:text-accent transition-all duration-300"
            >
              The Cookbook
            </Link>
          </div>
        </AnimatedLine>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-text-dim">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-8 bg-gradient-to-b from-text-dim to-transparent"
        />
      </motion.div>
    </section>
  );
}
