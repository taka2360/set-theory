// 章の MDX を静的に検査する：前提章の存在と循環、必須セクション、確認問題の ID、章間リンク。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'src', 'content', 'chapters');

interface Chapter {
  file: string;
  slug: string;
  order: number;
  prereq: string[];
  body: string;
}

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error('frontmatter がありません');
  const out: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]!] = kv[2]!;
  }
  return out;
}

const chapters: Chapter[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map((file) => {
    const text = readFileSync(join(DIR, file), 'utf8');
    const fm = frontmatter(text);
    const prereq = (fm.prereq ?? '[]')
      .replace(/[[\]]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return { file, slug: fm.slug!, order: Number(fm.order), prereq, body: text };
  });

const errors: string[] = [];
const bySlug = new Map(chapters.map((c) => [c.slug, c]));

for (const c of chapters) {
  // 前提章
  for (const p of c.prereq) {
    const pc = bySlug.get(p);
    if (!pc) errors.push(`${c.file}: 前提章 "${p}" が存在しません`);
    else if (pc.order >= c.order) errors.push(`${c.file}: 前提章 "${p}" が後ろの章です`);
  }

  // 必須セクション（序章以外）
  if (c.order > 0) {
    for (const h of ['## 演習問題', '## まとめ']) if (!c.body.includes(h)) errors.push(`${c.file}: 「${h.slice(3)}」の節がありません`);
    if (!/<Exercise level=\{1\}/.test(c.body) || !/<Exercise level=\{2\}/.test(c.body) || !/<Exercise level=\{3\}/.test(c.body)) {
      errors.push(`${c.file}: 演習問題に基本・標準・発展の3段階がそろっていません`);
    }
  }

  // 確認問題
  const ids = [...c.body.matchAll(/<Quiz id="([^"]+)"/g)].map((m) => m[1]!);
  if (c.order > 0 && (ids.length < 2 || ids.length > 6)) errors.push(`${c.file}: 確認問題は 2〜6 問にしてください（現在 ${ids.length} 問）`);
  const seen = new Set<string>();
  for (const id of ids) {
    if (!new RegExp(`^${c.slug}-q\\d{2}$`).test(id)) errors.push(`${c.file}: 確認問題の id "${id}" は "${c.slug}-qNN" 形式にしてください`);
    if (seen.has(id)) errors.push(`${c.file}: 確認問題の id "${id}" が重複しています`);
    seen.add(id);
  }
  for (const block of c.body.split('<Quiz ').slice(1)) {
    const quiz = block.slice(0, block.indexOf('</Quiz>'));
    const correct = (quiz.match(/<Choice correct>/g) ?? []).length;
    if (correct !== 1) errors.push(`${c.file}: 正解の選択肢がちょうど1つでない確認問題があります（${quiz.slice(0, 20)}…）`);
    if (!quiz.includes('<Explain>')) errors.push(`${c.file}: 解説のない確認問題があります（${quiz.slice(0, 20)}…）`);
  }

  // 章間リンク ../slug/
  for (const m of c.body.matchAll(/\]\(\.\.\/([a-z0-9-]+)\/\)/g)) {
    if (!bySlug.has(m[1]!)) errors.push(`${c.file}: リンク先の章 "${m[1]}" が存在しません`);
  }
}

// 前提関係の循環
const state = new Map<string, 'visiting' | 'done'>();
const visit = (slug: string, path: string[]): void => {
  if (state.get(slug) === 'done') return;
  if (state.get(slug) === 'visiting') {
    errors.push(`前提章が循環しています: ${[...path, slug].join(' → ')}`);
    return;
  }
  state.set(slug, 'visiting');
  for (const p of bySlug.get(slug)?.prereq ?? []) visit(p, [...path, slug]);
  state.set(slug, 'done');
};
for (const c of chapters) visit(c.slug, []);

// 章番号の重複
const orders = chapters.map((c) => c.order);
if (new Set(orders).size !== orders.length) errors.push('章番号（order）が重複しています');

if (errors.length) {
  console.error(`コンテンツ検査で ${errors.length} 件の問題が見つかりました:\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`コンテンツ検査 OK（${chapters.length} 章）`);
