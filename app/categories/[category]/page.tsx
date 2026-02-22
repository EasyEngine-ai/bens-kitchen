import { loadAllRecipes, loadCategories } from "@/lib/recipes";
import RecipeBrowser from "@/components/RecipeBrowser";
import AnimatedText, { AnimatedLine } from "@/components/AnimatedText";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const categories = loadCategories();

  // Cookbook + all personal categories
  const params = [{ category: "cookbook" }];
  for (const cat of categories) {
    if (!cat.id.startsWith("chapter-")) {
      params.push({ category: cat.id });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (category === "cookbook") {
    return {
      title: "Crazy Chicken Sandwiches — The Cookbook — Ben's Kitchen",
      description:
        "97 mind-blowing chicken sandwich recipes across 12 chapters.",
    };
  }
  const categories = loadCategories();
  const cat = categories.find((c) => c.id === category);
  if (!cat) return { title: "Category — Ben's Kitchen" };
  return {
    title: `${cat.name} — Ben's Kitchen`,
    description: `${cat.count} original ${cat.name.toLowerCase()} recipes from Ben's Kitchen.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const allRecipes = loadAllRecipes();
  const allCategories = loadCategories();

  // Cookbook page
  if (category === "cookbook") {
    const cookbookRecipes = allRecipes.filter((r) => r.source === "cookbook");
    const browserRecipes = cookbookRecipes.map((r) => ({
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

    const chapterMap = new Map<string, { name: string; count: number }>();
    for (const r of cookbookRecipes) {
      const existing = chapterMap.get(r.category);
      if (existing) existing.count++;
      else chapterMap.set(r.category, { name: r.categoryName, count: 1 });
    }
    const chapterCategories = Array.from(chapterMap.entries()).map(
      ([id, data]) => ({ id, name: data.name, count: data.count })
    );

    return (
      <div className="min-h-screen pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden mb-12 h-64 md:h-80">
            <img
              src="/images/recipes/recipe-73.webp"
              alt="Crazy Chicken Sandwiches"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <AnimatedLine>
                <p className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
                  The Cookbook
                </p>
              </AnimatedLine>
              <AnimatedText
                text="Crazy Chicken Sandwiches"
                as="h1"
                className="font-[family-name:var(--font-display)] text-4xl md:text-5xl"
              />
              <AnimatedLine delay={0.3}>
                <p className="text-text-muted mt-2">
                  97 mind-blowing recipes across 12 chapters
                </p>
              </AnimatedLine>
            </div>
          </div>
          <RecipeBrowser
            recipes={browserRecipes}
            categories={chapterCategories}
            showCategoryChips
          />
        </div>
      </div>
    );
  }

  // Personal category pages
  const cat = allCategories.find((c) => c.id === category);
  if (!cat) notFound();

  const categoryRecipes = allRecipes.filter((r) => r.category === category);

  // For sauces: use subcategory as the filter dimension so chips work
  const hasSubcategories = categoryRecipes.some((r) => r.subcategory);
  const browserRecipes = categoryRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: hasSubcategories ? (r.subcategory || r.category) : r.category,
    categoryName: hasSubcategories ? (r.subcategoryName || r.categoryName) : r.categoryName,
    image: r.image,
    difficulty: r.difficulty,
    cookTime: r.cookTime,
    heatLevel: r.heatLevel,
    source: r.source,
    ingredients: r.ingredients.map((i) => ({ item: i.item })),
  }));

  // Build subcategory chips if applicable
  let subcategoryOptions: { id: string; name: string; count: number }[] = [];
  if (hasSubcategories) {
    const subcatMap = new Map<string, { name: string; count: number }>();
    for (const r of categoryRecipes) {
      const scId = r.subcategory || r.category;
      const scName = r.subcategoryName || r.categoryName;
      const existing = subcatMap.get(scId);
      if (existing) existing.count++;
      else subcatMap.set(scId, { name: scName, count: 1 });
    }
    subcategoryOptions = Array.from(subcatMap.entries())
      .map(([id, data]) => ({ id, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count);
  }

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          {cat.image && (
            <div className="relative rounded-2xl overflow-hidden mb-8 h-48 md:h-64">
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <AnimatedLine>
                  <p className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
                    Category
                  </p>
                </AnimatedLine>
                <AnimatedText
                  text={cat.name}
                  as="h1"
                  className="font-[family-name:var(--font-display)] text-4xl md:text-5xl"
                />
                <AnimatedLine delay={0.3}>
                  <p className="text-text-muted mt-2">
                    {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                  </p>
                </AnimatedLine>
              </div>
            </div>
          )}
          {!cat.image && (
            <>
              <AnimatedLine>
                <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
                  Category
                </p>
              </AnimatedLine>
              <AnimatedText
                text={cat.name}
                as="h1"
                className="font-[family-name:var(--font-display)] text-5xl md:text-6xl mb-4"
              />
              <AnimatedLine delay={0.3}>
                <p className="text-text-muted">
                  {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                </p>
              </AnimatedLine>
            </>
          )}
        </div>

        <RecipeBrowser
          recipes={browserRecipes}
          categories={subcategoryOptions}
          showCategoryChips={hasSubcategories}
        />
      </div>
    </div>
  );
}
