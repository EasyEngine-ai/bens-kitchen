import { loadAllRecipes } from "@/lib/recipes";
import PantryMatch from "@/components/PantryMatch";
import AnimatedText, { AnimatedLine } from "@/components/AnimatedText";

export const metadata = {
  title: "What Can I Make? — Ben's Kitchen",
  description:
    "Enter ingredients you have on hand and find matching recipes from 250+ originals.",
};

export default function PantryPage() {
  const recipes = loadAllRecipes();

  const pantryRecipes = recipes.map((r) => ({
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
    ingredients: r.ingredients.map((i) => ({ item: i.item, group: i.group })),
  }));

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <AnimatedLine>
            <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">
              Pantry Match
            </p>
          </AnimatedLine>
          <AnimatedText
            text="What Can I Make?"
            as="h1"
            className="font-[family-name:var(--font-display)] text-5xl md:text-6xl mb-4"
          />
          <AnimatedLine delay={0.3}>
            <p className="text-text-muted max-w-xl">
              Add ingredients you have on hand and we&apos;ll match them against
              all 250+ recipes, ranked by how many ingredients you already have.
            </p>
          </AnimatedLine>
        </div>

        <PantryMatch recipes={pantryRecipes} />
      </div>
    </div>
  );
}
