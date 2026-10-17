/** MDX 本文中の確認問題（<Quiz id="...">）の数を数える */
export function countQuizzes(body: string | undefined): number {
  return body?.match(/<Quiz\s+id=/g)?.length ?? 0;
}
