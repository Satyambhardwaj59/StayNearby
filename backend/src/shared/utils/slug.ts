/** URL-safe slug: lower-case, ASCII, hyphen-separated. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

/** Appends a short, stable suffix so slugs stay unique. */
export function withSlugSuffix(slug: string, suffix: string): string {
  const base = slug.replace(/-+$/g, '').slice(0, 80 - (suffix.length + 1));
  return `${base}-${suffix}`;
}
