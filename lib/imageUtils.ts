export function getSrcSet(src: string): string {
  const base = src.replace(".webp", "");
  return `${base}-400w.webp 400w, ${base}-800w.webp 800w, ${src} 1024w`;
}
