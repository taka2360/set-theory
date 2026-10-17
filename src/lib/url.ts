/** base パス（/set-theory/）を付けた内部リンクを返す。先頭の / の有無は問わない。 */
export function withBase(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`;
}

export function chapterUrl(slug: string): string {
  return withBase(`chapters/${slug}/`);
}
