import Link from "next/link";
import { loadAllRecipes, loadCategories } from "@/lib/recipes";

export default function Footer() {
  const recipes = loadAllRecipes();
  const categories = loadCategories();
  const imageCount = recipes.filter((r) => r.image).length;
  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-text mb-4">
              Ben&apos;s Kitchen
            </h3>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              A personal collection of recipes — from signature chicken
              sandwiches to everyday sauces, sides, and everything in between.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-text-muted mb-4">
              Navigate
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/"
                className="text-sm text-text-dim hover:text-accent transition-colors"
              >
                Home
              </Link>
              <Link
                href="/recipes/"
                className="text-sm text-text-dim hover:text-accent transition-colors"
              >
                All Recipes
              </Link>
              <Link
                href="/community/"
                className="text-sm text-text-dim hover:text-accent transition-colors"
              >
                Community
              </Link>
              <Link
                href="/categories/cookbook/"
                className="text-sm text-text-dim hover:text-accent transition-colors"
              >
                The Cookbook
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] text-text-muted mb-4">
              By The Numbers
            </h4>
            <div className="flex flex-col gap-2.5 text-sm text-text-dim">
              <span>{recipes.length}+ Original Recipes</span>
              <span>{categories.length} Categories</span>
              <span>{imageCount} Food Photos</span>
              <span>Made with love in New Mexico</span>
            </div>
          </div>
        </div>

        <div className="divider mt-12 mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-dim">
            &copy; {new Date().getFullYear()} Benjamin Larson. All rights
            reserved.
          </p>
          <p className="text-xs text-text-dim">
            Crafted with obsessive attention to flavor
          </p>
        </div>
      </div>
    </footer>
  );
}
