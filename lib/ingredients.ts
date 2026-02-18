// Ingredient normalization and pantry matching utilities

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "or", "and", "to", "for", "with", "in",
  "as", "on", "at", "your", "own", "each", "per", "about",
  "small", "medium", "large", "extra", "thin", "thick",
  "freshly", "fresh", "dried", "ground", "chopped", "minced",
  "diced", "sliced", "shredded", "grated", "crushed", "melted",
  "softened", "room", "temperature", "optional", "divided",
  "packed", "loosely", "tightly", "finely", "roughly", "coarsely",
  "plus", "more", "taste", "needed", "desired",
]);

const SYNONYMS: Record<string, string> = {
  "mayo": "mayonnaise",
  "bbq sauce": "barbecue sauce",
  "bbq": "barbecue",
  "bell pepper": "bell pepper",
  "green onion": "scallion",
  "green onions": "scallion",
  "scallions": "scallion",
  "hot dog bun": "bun",
  "hot dog buns": "bun",
  "hamburger bun": "bun",
  "hamburger buns": "bun",
  "brioche bun": "bun",
  "brioche buns": "bun",
  "sour cream": "sour cream",
  "heavy cream": "heavy cream",
  "whipping cream": "heavy cream",
  "heavy whipping cream": "heavy cream",
  "parm": "parmesan",
  "parmigiano": "parmesan",
  "cilantro": "cilantro",
  "coriander leaves": "cilantro",
  "cornstarch": "cornstarch",
  "corn starch": "cornstarch",
};

/** Remove amount quantities and prep instructions from ingredient string */
export function stripAmountsAndPrep(text: string): string {
  let s = text.toLowerCase();
  // Remove leading amounts: "1 lb", "2 cups", "1/2 tsp", etc.
  s = s.replace(
    /^[\d\s\/.\-–]+\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|quarts?|pints?|gallons?|ml|liters?|sticks?|cloves?|heads?|bunche?s?|cans?|jars?|packages?|bags?|bottles?|pieces?|slices?|sprigs?|dashes?|pinche?s?|handfuls?|inches?|inch)\b\.?\s*/i,
    ""
  );
  // Remove standalone leading numbers/fractions
  s = s.replace(/^[\d\s\/.\-–]+\s*/, "");
  // Remove parenthetical prep like "(about 2 cups)"
  s = s.replace(/\([^)]*\)/g, "");
  // Remove trailing prep after comma: ", minced", ", to taste"
  s = s.replace(/,\s*(minced|diced|chopped|sliced|shredded|grated|crushed|melted|softened|julienned|to taste|for serving|for garnish|divided|optional|plus more|as needed|at room temperature|thinly sliced|finely chopped|roughly chopped|cut into.*|trimmed|peeled|seeded|deveined|bone-in|boneless|skinless|skin-on).*$/i, "");
  return s.trim();
}

/** Extract meaningful keywords from an ingredient string */
export function extractKeywords(text: string): string[] {
  const stripped = stripAmountsAndPrep(text);
  return stripped
    .split(/[\s,]+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export interface NormalizedIngredient {
  original: string;
  keywords: string[];
  canonical: string;
}

/** Normalize a single ingredient string for matching */
export function normalizeIngredient(text: string): NormalizedIngredient {
  const stripped = stripAmountsAndPrep(text);
  const keywords = extractKeywords(text);
  // Check synonym map
  const lower = stripped.toLowerCase();
  const canonical = SYNONYMS[lower] || lower;
  return { original: text, keywords, canonical };
}

export interface RecipeMatch {
  recipeIndex: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  totalUnique: number;
  matchPercent: number;
}

/** Check if a user keyword matches a recipe ingredient keyword (substring match) */
function keywordMatches(userKeyword: string, ingredientKeyword: string): boolean {
  return (
    ingredientKeyword.includes(userKeyword) ||
    userKeyword.includes(ingredientKeyword)
  );
}

/** Check if a user keyword matches a normalized ingredient */
function ingredientMatchesKeyword(
  userKeyword: string,
  normalized: NormalizedIngredient
): boolean {
  // Check canonical name
  if (normalized.canonical.includes(userKeyword) || userKeyword.includes(normalized.canonical)) {
    return true;
  }
  // Check individual keywords
  return normalized.keywords.some((k) => keywordMatches(userKeyword, k));
}

/**
 * Match user pantry ingredients against a list of recipe ingredients.
 * Returns match details including matched/missing ingredients and percentage.
 */
export function matchRecipe(
  userIngredients: string[],
  recipeIngredients: { item: string; group?: string }[],
  recipeIndex: number
): RecipeMatch {
  // Normalize user inputs
  const userKeywords = userIngredients.map((u) => u.toLowerCase().trim());

  // Deduplicate recipe ingredients by canonical name
  const seen = new Set<string>();
  const uniqueIngredients: NormalizedIngredient[] = [];
  for (const ing of recipeIngredients) {
    const normalized = normalizeIngredient(ing.item);
    if (!seen.has(normalized.canonical)) {
      seen.add(normalized.canonical);
      uniqueIngredients.push(normalized);
    }
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const norm of uniqueIngredients) {
    const isMatched = userKeywords.some((uk) =>
      ingredientMatchesKeyword(uk, norm)
    );
    if (isMatched) {
      matched.push(norm.original);
    } else {
      missing.push(norm.original);
    }
  }

  const total = uniqueIngredients.length;
  const percent = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return {
    recipeIndex,
    matchedIngredients: matched,
    missingIngredients: missing,
    totalUnique: total,
    matchPercent: percent,
  };
}
