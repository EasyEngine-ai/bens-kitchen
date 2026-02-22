#!/usr/bin/env node
/**
 * Generates sitemap.xml for all pages on gobigbencookbook.com.
 * Run as part of prebuild step.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const publicDir = path.join(__dirname, "..", "public");
const SITE = "https://gobigbencookbook.com";
const today = new Date().toISOString().split("T")[0];

// Load recipe data
const cookbook = JSON.parse(fs.readFileSync(path.join(dataDir, "cookbook.json"), "utf-8"));
const personal = JSON.parse(fs.readFileSync(path.join(dataDir, "personal_recipes.json"), "utf-8"));

const urls = [];

// Static pages
urls.push({ loc: "/", priority: "1.0", changefreq: "weekly" });
urls.push({ loc: "/recipes/", priority: "0.9", changefreq: "weekly" });
urls.push({ loc: "/community/", priority: "0.7", changefreq: "weekly" });
urls.push({ loc: "/pantry/", priority: "0.6", changefreq: "monthly" });

// Category pages
const categories = new Set();
categories.add("cookbook");
for (const c of personal.categories) categories.add(c.id);
for (const cat of categories) {
  urls.push({ loc: `/categories/${cat}/`, priority: "0.8", changefreq: "weekly" });
}

// Cookbook recipes
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

for (const part of cookbook.parts) {
  if (!part.chapters) continue;
  for (const chapter of part.chapters) {
    for (const r of chapter.recipes) {
      const slug = r.slug || slugify(r.title);
      urls.push({ loc: `/recipes/${slug}/`, priority: "0.7", changefreq: "monthly" });
    }
  }
}

// Personal recipes
for (const r of personal.recipes) {
  urls.push({ loc: `/recipes/${r.slug}/`, priority: "0.7", changefreq: "monthly" });
}

// Build XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml);
console.log(`Sitemap: ${urls.length} URLs → ${path.join(publicDir, "sitemap.xml")}`);
