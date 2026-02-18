import { loadAllRecipes, loadCategories } from "@/lib/recipes";
import RecipeBrowser from "@/components/RecipeBrowser";
import CategoryGrid from "@/components/CategoryGrid";
import AnimatedText, { AnimatedLine } from "@/components/AnimatedText";

export const metadata = {
  title: "All Recipes — Ben's Kitchen",
  description:
    "Browse 210+ original recipes — chicken sandwiches, sauces, sides, mains, and more.",
};

export default function RecipesPage() {
  const recipes = loadAllRecipes();
  const categories = loadCategories();

  const browserRecipes = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: r.category,
    categoryName: r.categoryName,
    image: r.image,
    difficulty: r.difficulty,
    cookTime: r.cookTime,
    heatLevel: r.heatLevel,
    source: r.source,
    ingredients: r.ingredients.map((i) => ({ item: i.item })),
  }));

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.count,
  }));

  // Merge all cookbook chapter categories into one "Chicken Sandwiches" entry
  let cookbookCount = 0;
  const personalCategories: typeof categories = [];
  for (const c of categories) {
    if (c.id.startsWith("chapter-")) {
      cookbookCount += c.count;
    } else {
      personalCategories.push(c);
    }
  }

  const categoryGridItems = [
    {
      id: "cookbook",
      name: "Chicken Sandwiches",
      count: cookbookCount,
      image: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/cover/cover.webp`,
      linkTo: "/categories/cookbook/",
    },
    ...personalCategories.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.count,
      image: c.image,
    })),
  ];

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <AnimatedLine>
            <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
              Browse
            </p>
          </AnimatedLine>
          <AnimatedText
            text="All Recipes"
            as="h1"
            className="font-[family-name:var(--font-display)] text-5xl md:text-6xl mb-4"
          />
          <AnimatedLine delay={0.3}>
            <p className="text-text-muted max-w-xl">
              Explore the full collection — from 97 signature chicken sandwiches
              to 113 personal recipes spanning sauces, sides, mains, and more.
            </p>
          </AnimatedLine>
        </div>

        {/* Categories section */}
        <section className="mb-20">
          <AnimatedLine>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-6">
              Browse by Category
            </h2>
          </AnimatedLine>
          <CategoryGrid categories={categoryGridItems} />
        </section>

        {/* Divider */}
        <div className="divider mb-16" />

        {/* Full A-Z list */}
        <section>
          <AnimatedLine>
            <h2 className="font-[family-name:var(--font-display)] text-2xl mb-8">
              All Recipes A–Z
            </h2>
          </AnimatedLine>
          <RecipeBrowser recipes={browserRecipes} categories={categoryOptions} />
        </section>
      </div>
    </div>
  );
}
