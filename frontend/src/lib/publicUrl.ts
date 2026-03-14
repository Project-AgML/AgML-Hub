/**
 * Resolve a path to a public asset so it works with any Vite base URL
 * (e.g. '/' in dev or '/AgML-Hub/' on GitHub Pages).
 */
export function publicUrl(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || '';
  return `${base}/${path.replace(/^\//, '')}`;
}
