#!/usr/bin/env node
/**
 * Generates recipe knowledge bases for the AI cooking assistant.
 * Outputs:
 *   - public/recipe-knowledge.json  (full details for client-side lookups)
 *   - public/recipe-catalog.json    (tiny catalog: names + categories for system prompt)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localData = path.join(__dirname, "..", "data");
const parentData = path.join(__dirname, "..", "..", "data");
const dataDir = fs.existsSync(localData) ? localData : parentData;
const publicDir = path.join(__dirname, "..", "public");

const cookbook = JSON.parse(
  fs.readFileSync(path.join(dataDir, "cookbook.json"), "utf-8")
);

const CHAPTER_CATEGORIES = {
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

const recipes = [];

for (const part of cookbook.parts) {
  if (!part.chapters) continue;
  for (const chapter of part.chapters) {
    const chapterName = CHAPTER_CATEGORIES[chapter.title] || chapter.title;
    for (const r of chapter.recipes) {
      const ingredients = [];
      for (const g of r.ingredientGroups || []) {
        for (const ing of g.ingredients) {
          ingredients.push(ing.amount ? `${ing.amount} ${ing.item}` : ing.item);
        }
      }
      const directions = [];
      for (const g of r.directionGroups || []) {
        for (const step of g.steps) {
          directions.push(typeof step === "string" ? step : step.text || String(step));
        }
      }
      recipes.push({
        title: r.title,
        slug: r.slug || slugify(r.title),
        category: chapterName,
        source: "cookbook",
        description:
          r.description ||
          `A signature chicken sandwich from the ${chapterName} collection.`,
        ingredients,
        directions,
      });
    }
  }
}

const personal = JSON.parse(
  fs.readFileSync(path.join(dataDir, "personal_recipes.json"), "utf-8")
);
const catNames = {};
for (const c of personal.categories) catNames[c.id] = c.name;

for (const r of personal.recipes) {
  recipes.push({
    title: r.title,
    slug: r.slug,
    category: catNames[r.category] || r.category,
    source: "personal",
    description:
      r.description ||
      `A Ben's Kitchen original ${(catNames[r.category] || "").toLowerCase()} recipe.`,
    ingredients: r.ingredients || [],
    directions: r.directions || [],
  });
}

// --- Full knowledge base (for client-side lookup) ---
const knowledge = recipes.map((r) => ({
  t: r.title,
  s: r.slug,
  c: r.category,
  src: r.source,
  d: r.description,
  i: r.ingredients,
  dir: r.directions,
}));
const fullPath = path.join(publicDir, "recipe-knowledge.json");
fs.writeFileSync(fullPath, JSON.stringify(knowledge));
const fullKB = (Buffer.byteLength(JSON.stringify(knowledge)) / 1024).toFixed(1);

// --- Compact catalog for AI system prompt (~15KB) ---
// Group by category, just names
const byCategory = {};
for (const r of recipes) {
  const cat = r.category;
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(r.title);
}
const catalog = Object.entries(byCategory)
  .map(([cat, titles]) => `${cat}: ${titles.join("; ")}`)
  .join("\n");

const catalogPath = path.join(publicDir, "recipe-catalog.txt");
fs.writeFileSync(catalogPath, catalog);
const catKB = (Buffer.byteLength(catalog) / 1024).toFixed(1);

console.log(`Recipe knowledge: ${recipes.length} recipes`);
console.log(`  Full:    ${fullKB}KB → ${fullPath}`);
console.log(`  Catalog: ${catKB}KB → ${catalogPath}`);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
