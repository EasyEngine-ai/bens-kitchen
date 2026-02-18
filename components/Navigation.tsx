"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-bg/90 backdrop-blur-xl border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-text group-hover:text-accent transition-colors duration-300">
              Ben&apos;s Kitchen
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/recipes/">Recipes</NavLink>
            <NavLink href="/pantry/">What Can I Make?</NavLink>
            <NavLink href="/community/">Community</NavLink>
            <NavLink href="/categories/cookbook/">Chicken Sandwich Cookbook</NavLink>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <span
              className={`absolute w-6 h-[1.5px] bg-text transition-all duration-300 ${
                menuOpen ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute w-6 h-[1.5px] bg-text transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute w-6 h-[1.5px] bg-text transition-all duration-300 ${
                menuOpen ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-xl pt-24 px-8"
          >
            <div className="flex flex-col gap-6">
              <MobileNavLink
                href="/"
                onClick={() => setMenuOpen(false)}
                index={0}
              >
                Home
              </MobileNavLink>
              <MobileNavLink
                href="/recipes/"
                onClick={() => setMenuOpen(false)}
                index={1}
              >
                Recipes
              </MobileNavLink>
              <MobileNavLink
                href="/pantry/"
                onClick={() => setMenuOpen(false)}
                index={2}
              >
                What Can I Make?
              </MobileNavLink>
              <MobileNavLink
                href="/community/"
                onClick={() => setMenuOpen(false)}
                index={3}
              >
                Community
              </MobileNavLink>
              <MobileNavLink
                href="/categories/cookbook/"
                onClick={() => setMenuOpen(false)}
                index={4}
              >
                Chicken Sandwich Cookbook
              </MobileNavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative text-sm uppercase tracking-[0.2em] text-text-muted hover:text-accent transition-colors duration-300 group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
  index,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link
        href={href}
        onClick={onClick}
        className="font-[family-name:var(--font-display)] text-4xl text-text hover:text-accent transition-colors duration-300"
      >
        {children}
      </Link>
    </motion.div>
  );
}
