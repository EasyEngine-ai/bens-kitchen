import fs from "fs";
import path from "path";

// basePath empty for custom domain root deployment
const basePath = "";

export interface Ingredient {
  item: string;
  amount?: string;
  group?: string;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryName: string;
  description: string;
  ingredients: Ingredient[];
  directions: string[];
  image: string | null;
  source: "cookbook" | "personal";
  chapter?: string;
  chapterNumber?: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cookTime: string;
  servings: number;
  heatLevel: number; // 0-5
  youtubeUrl?: string;
  componentCount?: number;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  image: string | null;
  source: "cookbook" | "personal";
}

const CHAPTER_CATEGORIES: Record<string, string> = {
  "BUFFALO & HOT SAUCE": "Buffalo & Hot",
  "BBQ & SOUTHERN": "BBQ & Southern",
  "ASIAN FUSION": "Asian Fusion",
  "INDIAN & SOUTH ASIAN": "Indian & South Asian",
  "ITALIAN & MEDITERRANEAN": "Italian & Mediterranean",
  "LATIN & SOUTHWEST": "Latin & Southwest",
  "CLASSIC & COMFORT": "Classic & Comfort",
  "GOURMET & ARTISAN": "Gourmet & Artisan",
  "WILD CARD": "Wild Card",
  "GLOBAL STREET FOOD": "Global Street Food",
  "SOUTHERN ROOTS & HOMESTYLE": "Southern Roots",
  "MEDITERRANEAN & MIDDLE EASTERN": "Mediterranean",
};

function inferHeatLevel(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  if (
    text.includes("ghost pepper") ||
    text.includes("carolina reaper") ||
    text.includes("inferno")
  )
    return 5;
  if (
    text.includes("habanero") ||
    text.includes("extra hot") ||
    text.includes("fire")
  )
    return 4;
  if (
    text.includes("buffalo") ||
    text.includes("hot sauce") ||
    text.includes("chipotle") ||
    text.includes("spicy")
  )
    return 3;
  if (
    text.includes("jalapeño") ||
    text.includes("jalapeno") ||
    text.includes("pepper") ||
    text.includes("cayenne")
  )
    return 2;
  if (text.includes("mild") || text.includes("sweet heat")) return 1;
  return 0;
}

function inferDifficulty(recipe: {
  ingredientGroups?: { ingredients: unknown[] }[];
  directionGroups?: { steps: unknown[] }[];
  ingredients?: string[];
  directions?: string[];
}): "Easy" | "Medium" | "Hard" {
  const ingredientCount =
    recipe.ingredientGroups?.reduce(
      (sum, g) => sum + g.ingredients.length,
      0
    ) ?? recipe.ingredients?.length ?? 0;
  const stepCount =
    recipe.directionGroups?.reduce((sum, g) => sum + g.steps.length, 0) ??
    recipe.directions?.length ??
    0;
  if (ingredientCount > 20 || stepCount > 8) return "Hard";
  if (ingredientCount > 10 || stepCount > 4) return "Medium";
  return "Easy";
}

function inferCookTime(difficulty: string, source: string): string {
  if (source === "personal") {
    if (difficulty === "Easy") return "15 min";
    if (difficulty === "Medium") return "30 min";
    return "45 min";
  }
  if (difficulty === "Easy") return "30 min";
  if (difficulty === "Medium") return "45 min";
  return "1 hr+";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function loadAllRecipes(): Recipe[] {
  // Check local data dir first (Vercel), then parent (local dev)
  const localData = path.join(process.cwd(), "data");
  const parentData = path.join(process.cwd(), "..", "data");
  const dataDir = fs.existsSync(localData) ? localData : parentData;

  // Load cookbook
  const cookbookRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, "cookbook.json"), "utf-8")
  );
  const cookbookRecipes: Recipe[] = [];

  for (const part of cookbookRaw.parts) {
    if (!part.chapters) continue; // skip component reference part
    for (const chapter of part.chapters) {
      for (const r of chapter.recipes) {
        const ingredients: Ingredient[] = [];
        for (const group of r.ingredientGroups || []) {
          for (const ing of group.ingredients) {
            ingredients.push({
              item: ing.item,
              amount: ing.amount,
              group: group.name,
            });
          }
        }

        const directions: string[] = [];
        for (const group of r.directionGroups || []) {
          for (const step of group.steps) {
            directions.push(typeof step === "string" ? step : step.text || step);
          }
        }

        const chapterName =
          CHAPTER_CATEGORIES[chapter.title] || chapter.title;
        const difficulty = inferDifficulty(r);
        const description =
          r.description || `A signature chicken sandwich from the ${chapterName} collection.`;

        cookbookRecipes.push({
          id: r.id,
          title: r.title,
          slug: r.slug || slugify(r.title),
          category: `chapter-${chapter.number}`,
          categoryName: chapterName,
          description,
          ingredients,
          directions,
          image: `${basePath}/images/recipes/${r.id}.webp`,
          source: "cookbook",
          chapter: chapter.title,
          chapterNumber: chapter.number,
          difficulty,
          cookTime: inferCookTime(difficulty, "cookbook"),
          servings: 2,
          heatLevel: inferHeatLevel(r.title, description),
          componentCount: r.aboutSections?.length || 0,
        });
      }
    }
  }

  // Load personal recipes
  const personalRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, "personal_recipes.json"), "utf-8")
  );
  const personalRecipes: Recipe[] = [];

  const categoryNameMap: Record<string, string> = {};
  for (const cat of personalRaw.categories) {
    categoryNameMap[cat.id] = cat.name;
  }

  for (const r of personalRaw.recipes) {
    const ingredients: Ingredient[] = (r.ingredients || []).map(
      (item: string) => ({ item })
    );
    const directions: string[] = r.directions || [];
    const difficulty = inferDifficulty(r);

    const imgPath = `${basePath}/images/personal/recipes/${r.slug}.webp`;
    const imgExists = fs.existsSync(
      path.join(process.cwd(), "..", `images/personal/recipes/${r.slug}.webp`)
    );

    personalRecipes.push({
      id: `personal-${r.slug}`,
      title: r.title,
      slug: r.slug,
      category: r.category,
      categoryName: categoryNameMap[r.category] || r.category,
      description: r.description || `A Ben's Kitchen original ${categoryNameMap[r.category]?.toLowerCase() || ""} recipe.`,
      ingredients,
      directions,
      image: imgExists ? imgPath : null,
      source: "personal",
      difficulty,
      cookTime: r.cook_time || inferCookTime(difficulty, "personal"),
      servings: r.servings || 4,
      heatLevel: inferHeatLevel(r.title, r.description || ""),
      youtubeUrl: r.youtube_url || undefined,
    });
  }

  return [...cookbookRecipes, ...personalRecipes];
}

export function loadCategories(): Category[] {
  const recipes = loadAllRecipes();
  const catMap = new Map<string, { name: string; count: number; source: string }>();

  for (const r of recipes) {
    const key = r.category;
    const existing = catMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      catMap.set(key, { name: r.categoryName, count: 1, source: r.source });
    }
  }

  const categories: Category[] = [];
  for (const [id, data] of catMap) {
    let image: string | null = null;
    if (id.startsWith("chapter-")) {
      image = `${basePath}/images/chapters/${id}.webp`;
    } else {
      const catImgPath = path.join(
        process.cwd(),
        "..",
        `images/personal/categories/${id}.webp`
      );
      if (fs.existsSync(catImgPath)) {
        image = `${basePath}/images/personal/categories/${id}.webp`;
      }
    }

    categories.push({
      id,
      name: data.name,
      count: data.count,
      image,
      source: data.source as "cookbook" | "personal",
    });
  }

  return categories;
}

