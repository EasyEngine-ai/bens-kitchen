#!/usr/bin/env node
/**
 * Generates RSS feed (feed.xml) for all recipes on gobigbencookbook.com.
 * Run as part of prebuild step.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const publicDir = path.join(__dirname, "..", "public");
const SITE = "https://gobigbencookbook.com";

const cookbook = JSON.parse(fs.readFileSync(path.join(dataDir, "cookbook.json"), "utf-8"));
const personal = JSON.parse(fs.readFileSync(path.join(dataDir, "personal_recipes.json"), "utf-8"));

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const items = [];

// Cookbook recipes
const catNames = {};
for (const part of cookbook.parts) {
  if (!part.chapters) continue;
  for (const chapter of part.chapters) {
    for (const r of chapter.recipes) {
      const slug = r.slug || slugify(r.title);
      items.push({
        title: r.title,
        slug,
        description: r.description || `A ${chapter.title} chicken sandwich recipe from Ben's Kitchen.`,
        category: chapter.title,
        image: r.image || null,
      });
    }
  }
}

// Personal recipes
for (const c of personal.categories) catNames[c.id] = c.name;
for (const r of personal.recipes) {
  items.push({
    title: r.title,
    slug: r.slug,
    description: r.description || `A Ben's Kitchen original ${(catNames[r.category] || "").toLowerCase()} recipe.`,
    category: catNames[r.category] || r.category,
    image: r.image || null,
  });
}

const pubDate = new Date().toUTCString();

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ben's Kitchen</title>
    <link>${SITE}</link>
    <description>250+ original recipes — from signature chicken sandwiches to everyday sauces, sides, and everything in between. By Benjamin Larson.</description>
    <language>en-us</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map((item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${SITE}/recipes/${item.slug}/</link>
      <guid>${SITE}/recipes/${item.slug}/</guid>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>${item.image ? `\n      <enclosure url="${SITE}${item.image}" type="image/webp"/>` : ""}
    </item>`).join("\n")}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(publicDir, "feed.xml"), rss);
console.log(`RSS: ${items.length} recipes → ${path.join(publicDir, "feed.xml")}`);
