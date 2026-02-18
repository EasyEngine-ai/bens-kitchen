import Link from "next/link";
import Hero from "@/components/Hero";
import StatsCounter from "@/components/StatsCounter";
import FeaturedRecipes from "@/components/FeaturedRecipes";
import CategoryShowcase from "@/components/CategoryShowcase";
import { loadAllRecipes, loadCategories } from "@/lib/recipes";

function pickFeatured(recipes: ReturnType<typeof loadAllRecipes>) {
  const featured = [];
  const showcaseSlugs = [
    "buffalo-ranch-chicken-sandwich",
    "smokey-dr-pepper-bbq-chicken-sandwich",
    "teriyaki-pineapple-chicken-sandwich",
    "tikka-masala-chicken-sandwich",
    "chipotle-lime-chicken-sandwich-smoky-charred",
    "honey-mustard-aged-gruyere-pear-chicken-sandwich",
  ];

  for (const slug of showcaseSlugs) {
    const r = recipes.find((rec) => rec.slug === slug);
    if (r && r.image) {
      featured.push({
        title: r.title,
        slug: r.slug,
        image: r.image,
        category: r.categoryName,
        description: r.description,
      });
    }
    if (featured.length >= 3) break;
  }

  if (featured.length < 3) {
    const personal = recipes.filter((r) => r.source === "personal" && r.image);
    for (const r of personal) {
      if (featured.length >= 3) break;
      featured.push({
        title: r.title,
        slug: r.slug,
        image: r.image!,
        category: r.categoryName,
        description: r.description,
      });
    }
  }

  return featured;
}

export default function HomePage() {
  const recipes = loadAllRecipes();
  const categories = loadCategories();
  const featured = pickFeatured(recipes);
  const personalCategories = categories.filter((c) => c.source === "personal");

  return (
    <>
      <Hero />
      <StatsCounter />
      <FeaturedRecipes recipes={featured} />
      <CategoryShowcase categories={personalCategories} />

      {/* Cookbook callout */}
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden bg-bg-surface border border-border">
            <div className="absolute inset-0 opacity-30">
              <img
                src="/images/cover/cover.webp"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/60" />
            <div className="relative z-10 p-8 md:p-16 max-w-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
                The Cookbook
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl mb-4 leading-tight">
                Crazy Chicken Sandwiches
              </h2>
              <p className="text-text-muted leading-relaxed mb-8">
                97 mind-blowing chicken sandwich recipes across 12 chapters —
                from Buffalo &amp; Hot Sauce to Mediterranean &amp; Middle
                Eastern. Each with multiple hand-crafted components.
              </p>
              <Link
                href="/categories/cookbook/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-bg font-medium text-sm uppercase tracking-[0.15em] rounded-full hover:shadow-[0_0_30px_rgba(212,165,116,0.3)] transition-all duration-300"
              >
                Explore The Cookbook
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
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
