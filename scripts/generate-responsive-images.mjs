import sharp from "sharp";
import { readdir, writeFile, access, mkdir } from "fs/promises";
import { join, basename, extname } from "path";

const PUBLIC = new URL("../public", import.meta.url).pathname;
const DIRS = [
  "images/recipes",
  "images/personal/recipes",
  "images/chapters",
  "images/personal/categories",
];
const WIDTHS = [400, 800];
const BLUR_SIZE = 20;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function processDir(dir) {
  const absDir = join(PUBLIC, dir);
  if (!(await exists(absDir))) return [];

  const files = await readdir(absDir);
  const webps = files.filter((f) => f.endsWith(".webp") && !/-\d+w\.webp$/.test(f));
  const results = [];

  for (const file of webps) {
    const src = join(absDir, file);
    const name = basename(file, ".webp");

    // Generate responsive variants
    for (const w of WIDTHS) {
      const out = join(absDir, `${name}-${w}w.webp`);
      if (await exists(out)) continue;
      await sharp(src).resize(w).webp({ quality: 80 }).toFile(out);
    }

    // Generate blur placeholder
    const buf = await sharp(src)
      .resize(BLUR_SIZE, BLUR_SIZE, { fit: "cover" })
      .webp({ quality: 20 })
      .toBuffer();
    const dataUri = `data:image/webp;base64,${buf.toString("base64")}`;
    results.push([`/${dir}/${file}`, dataUri]);
  }

  return results;
}

console.log("Generating responsive images...");
const all = [];
for (const dir of DIRS) {
  const r = await processDir(dir);
  all.push(...r);
  if (r.length) console.log(`  ${dir}: ${r.length} images`);
}

const placeholders = Object.fromEntries(all.sort((a, b) => a[0].localeCompare(b[0])));
await writeFile(join(PUBLIC, "image-placeholders.json"), JSON.stringify(placeholders, null, 2));
console.log(`Done — ${all.length} placeholders written to image-placeholders.json`);
