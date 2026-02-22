import { loadAllRecipes } from "@/lib/recipes";
import RecipeDetail from "@/components/RecipeDetail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const recipes = loadAllRecipes();
  return recipes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipes = loadAllRecipes();
  const recipe = recipes.find((r) => r.slug === slug);
  if (!recipe) return { title: "Recipe Not Found" };
  return {
    title: `${recipe.title} — Ben's Kitchen`,
    description: recipe.description,
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      images: recipe.image
        ? [{ url: recipe.image, width: 1024, height: 1024, alt: recipe.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: recipe.title,
      description: recipe.description,
      images: recipe.image ? [recipe.image] : undefined,
    },
  };
}

function parseCookTime(cookTime: string): string {
  const match = cookTime.match(/(\d+)\s*min/);
  if (!match) return "PT30M";
  return `PT${match[1]}M`;
}

function buildRecipeJsonLd(recipe: {
  title: string;
  slug: string;
  description: string;
  ingredients: { item: string; amount?: string }[];
  directions: string[];
  image: string | null;
  cookTime: string;
  servings: number;
  categoryName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.image
      ? [`https://gobigbencookbook.com${recipe.image}`]
      : undefined,
    author: { "@type": "Person", name: "Benjamin Larson" },
    url: `https://gobigbencookbook.com/recipes/${recipe.slug}/`,
    cookTime: parseCookTime(recipe.cookTime),
    totalTime: parseCookTime(recipe.cookTime),
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.categoryName,
    recipeIngredient: recipe.ingredients.map((ing) =>
      ing.amount ? `${ing.amount} ${ing.item}` : ing.item
    ),
    recipeInstructions: recipe.directions.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipes = loadAllRecipes();
  const recipe = recipes.find((r) => r.slug === slug);

  if (!recipe) notFound();

  // Get related recipes (same category, max 4)
  const related = recipes
    .filter((r) => r.category === recipe.category && r.slug !== recipe.slug)
    .slice(0, 4)
    .map((r) => ({
      title: r.title,
      slug: r.slug,
      image: r.image,
      categoryName: r.categoryName,
    }));

  const jsonLd = buildRecipeJsonLd(recipe);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecipeDetail
        title={recipe.title}
        slug={recipe.slug}
        categoryName={recipe.categoryName}
        description={recipe.description}
        ingredients={recipe.ingredients}
        directions={recipe.directions}
        image={recipe.image}
        source={recipe.source}
        difficulty={recipe.difficulty}
        cookTime={recipe.cookTime}
        servings={recipe.servings}
        heatLevel={recipe.heatLevel}
        youtubeUrl={recipe.youtubeUrl}
        componentCount={recipe.componentCount}
        relatedRecipes={related}
      />
    </>
  );
}
