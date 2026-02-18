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
      images: recipe.image ? [recipe.image] : undefined,
    },
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

  return (
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
  );
}
