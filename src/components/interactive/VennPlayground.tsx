import { useId, useMemo, useRef, useState } from 'preact/hooks';
import { contains, equivalent, formatSetExpr, parseSetExpr, SetExprError, usedSets, type SetExpr } from '../../lib/setExpr';
import './venn.css';

type Count = 2 | 3;

interface Challenge {
  /** 目標の集合を表す式（正解の一例） */
  target: string;
  /** 問題文 */
  prompt?: string;
}

interface Props {
  initial?: string;
  sets?: Count;
  challenges?: Challenge[];
  title?: string;
}

const NAMES = ['A', 'B', 'C'] as const;

const GEOMETRY: Record<Count, { cx: number; cy: number; label: [number, number] }[]> = {
  2: [
    { cx: 122, cy: 112, label: [56, 40] },
    { cx: 198, cy: 112, label: [264, 40] },
  ],
  3: [
    { cx: 128, cy: 92, label: [62, 40] },
    { cx: 192, cy: 92, label: [258, 40] },
    { cx: 160, cy: 148, label: [160, 214] },
  ],
};
const RADIUS: Record<Count, number> = { 2: 74, 3: 60 };
const UNIVERSE = { x: 8, y: 8, w: 304, h: 216 };

function regionName(region: number, count: Count): string {
  if (region === 0) return count === 2 ? 'A にも B にも属さない部分' : 'A, B, C のどれにも属さない部分';
  const ins: string[] = [];
  const outs: string[] = [];
  for (let i = 0; i < count; i++) ((region >> i) & 1 ? ins : outs).push(NAMES[i]);
  return `${ins.join('・')} に属し${outs.length ? `、${outs.join('・')} に属さない部分` : 'ている部分'}`;
}

function regionFormula(region: number, count: Count): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) parts.push((region >> i) & 1 ? NAMES[i] : `${NAMES[i]}ᶜ`);
  return parts.join(' ∩ ');
}

type Parsed = { ok: true; expr: SetExpr } | { ok: false; error: SetExprError };

function tryParse(src: string): Parsed {
  try {
    return { ok: true, expr: parseSetExpr(src) };
  } catch (e) {
    if (e instanceof SetExprError) return { ok: false, error: e };
    throw e;
  }
}

function Diagram({ expr, count, caption, onHover, highlight }: { expr: SetExpr | null; count: Count; caption: string; onHover?: (r: number | null) => void; highlight?: number | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const circles = GEOMETRY[count];
  const r = RADIUS[count];
  const regions = Array.from({ length: 1 << count }, (_, i) => i);
  const filled = regions.filter((reg) => expr !== null && contains(expr, reg));
  const desc = expr === null ? '式が正しくないため、図は表示していません。' : filled.length === 0 ? 'どの部分も塗られていません（空集合）。' : `塗られている部分：${filled.map((f) => regionName(f, count)).join('／')}`;

  return (
    <figure class="venn-figure">
      <svg viewBox="0 0 320 232" role="img" aria-label={`${caption}のベン図。${desc}`} class="venn-svg">
        <defs>
          {circles.map((c, i) => (
            <clipPath id={`${uid}c${i}`} key={i}>
              <circle cx={c.cx} cy={c.cy} r={r} />
            </clipPath>
          ))}
          {regions.map((reg) => {
            const excluded = ((1 << count) - 1) & ~reg;
            return (
              <mask id={`${uid}m${reg}`} key={reg}>
                <rect x={UNIVERSE.x} y={UNIVERSE.y} width={UNIVERSE.w} height={UNIVERSE.h} fill="white" />
                {circles.map((c, i) => ((excluded >> i) & 1 ? <circle key={i} cx={c.cx} cy={c.cy} r={r} fill="black" /> : null))}
              </mask>
            );
          })}
          <pattern id={`${uid}hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" class="venn-hatch" />
          </pattern>
        </defs>
        <rect x={UNIVERSE.x} y={UNIVERSE.y} width={UNIVERSE.w} height={UNIVERSE.h} rx="14" class="venn-universe" />
        {regions.map((reg) => {
          const isFilled = filled.includes(reg);
          let node = (
            <g mask={`url(#${uid}m${reg})`}>
              <rect x={UNIVERSE.x} y={UNIVERSE.y} width={UNIVERSE.w} height={UNIVERSE.h} rx="14" class={`venn-region${isFilled ? ' is-filled' : ''}${highlight === reg ? ' is-hover' : ''}`} />
              {isFilled && <rect x={UNIVERSE.x} y={UNIVERSE.y} width={UNIVERSE.w} height={UNIVERSE.h} rx="14" fill={`url(#${uid}hatch)`} class="venn-hatch-layer" />}
            </g>
          );
          for (let i = 0; i < count; i++) {
            if ((reg >> i) & 1) node = <g clip-path={`url(#${uid}c${i})`}>{node}</g>;
          }
          return (
            <g key={reg} onMouseEnter={() => onHover?.(reg)} onMouseLeave={() => onHover?.(null)} onClick={() => onHover?.(reg)}>
              {node}
            </g>
          );
        })}
        {circles.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={r} class="venn-outline" />
        ))}
        {circles.map((c, i) => (
          <text key={i} x={c.label[0]} y={c.label[1]} class="venn-label" text-anchor="middle" dominant-baseline="middle">
            {NAMES[i]}
          </text>
        ))}
        <text x={UNIVERSE.x + 14} y={UNIVERSE.y + UNIVERSE.h - 12} class="venn-u">
          U
        </text>
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const KEYS: { label: string; insert: string; aria: string }[] = [
  { label: 'A', insert: 'A', aria: 'A' },
  { label: 'B', insert: 'B', aria: 'B' },
  { label: 'C', insert: 'C', aria: 'C' },
  { label: '∪', insert: ' ∪ ', aria: '和集合' },
  { label: '∩', insert: ' ∩ ', aria: '共通部分' },
  { label: '\\', insert: ' \\ ', aria: '差集合' },
  { label: 'ᶜ', insert: 'ᶜ', aria: '補集合' },
  { label: '(', insert: '(', aria: '開き括弧' },
  { label: ')', insert: ')', aria: '閉じ括弧' },
  { label: '△', insert: ' △ ', aria: '対称差' },
  { label: 'U', insert: 'U', aria: '全体集合' },
  { label: '∅', insert: '∅', aria: '空集合' },
];

export default function VennPlayground({ initial = 'A ∩ B', sets = 2, challenges = [], title = 'ベン図で確かめる' }: Props) {
  const [src, setSrc] = useState(initial);
  const [count, setCount] = useState<Count>(sets);
  const [hover, setHover] = useState<number | null>(null);
  const [mode, setMode] = useState<'free' | 'challenge'>('free');
  const [ci, setCi] = useState(0);
  const [verdict, setVerdict] = useState<null | boolean>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errId = useId();

  const parsed = useMemo(() => tryParse(src), [src]);
  const needsThree = parsed.ok && usedSets(parsed.expr).has('C');
  const effectiveCount: Count = needsThree ? 3 : count;
  const challenge = challenges[ci];
  const target = useMemo(() => (challenge ? parseSetExpr(challenge.target) : null), [challenge]);
  const targetCount: Count = target && usedSets(target).has('C') ? 3 : effectiveCount;
  const shownCount: Count = mode === 'challenge' ? (Math.max(targetCount, effectiveCount) as Count) : effectiveCount;

  const insert = (text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? src.length;
    const end = el?.selectionEnd ?? src.length;
    const next = src.slice(0, start) + text + src.slice(end);
    setSrc(next);
    setVerdict(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const backspace = () => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? src.length;
    const end = el?.selectionEnd ?? src.length;
    if (start === end && start === 0) return;
    const from = start === end ? Array.from(src.slice(0, start)).slice(0, -1).join('').length : start;
    setSrc(src.slice(0, from) + src.slice(end));
    setVerdict(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from, from);
    });
  };

  const check = () => {
    if (!parsed.ok || !target) return;
    setVerdict(equivalent(parsed.expr, target, 3));
  };

  const errorPos = !parsed.ok ? parsed.error.position : -1;
  const chars = Array.from(src);

  return (
    <section class="venn" aria-label={title}>
      <header class="venn-head">
        <p class="venn-title">
          <span class="venn-badge">操作してみよう</span>
          {title}
        </p>
        <div class="venn-tabs" role="group" aria-label="表示の切り替え">
          {challenges.length > 0 && (
            <>
              <button type="button" aria-pressed={mode === 'free'} onClick={() => setMode('free')}>
                自由に
              </button>
              <button type="button" aria-pressed={mode === 'challenge'} onClick={() => {
                  if (mode !== 'challenge') setSrc('');
                  setMode('challenge');
                  setVerdict(null);
                }}>
                チャレンジ
              </button>
              <span class="venn-sep" aria-hidden="true" />
            </>
          )}
          <button type="button" aria-pressed={shownCount === 2} disabled={needsThree || (mode === 'challenge' && targetCount === 3)} onClick={() => setCount(2)}>
            2つの集合
          </button>
          <button type="button" aria-pressed={shownCount === 3} onClick={() => setCount(3)}>
            3つの集合
          </button>
        </div>
      </header>

      {mode === 'challenge' && challenge && (
        <div class="venn-challenge">
          <p class="venn-challenge-q">
            <b>
              問題 {ci + 1} / {challenges.length}
            </b>{' '}
            {challenge.prompt ?? '左の図の塗られた部分を表す式を入力しよう。'}
          </p>
        </div>
      )}

      <div class={`venn-diagrams${mode === 'challenge' ? ' is-two' : ''}`}>
        {mode === 'challenge' && target && <Diagram expr={target} count={shownCount} caption="目標" />}
        <Diagram expr={parsed.ok ? parsed.expr : null} count={shownCount} caption={mode === 'challenge' ? 'あなたの式' : parsed.ok ? formatSetExpr(parsed.expr) : '（式を修正してください）'} onHover={setHover} highlight={hover} />
      </div>

      <p class="venn-hover" aria-live="polite">
        {hover !== null ? (
          <>
            <span class="venn-hover-formula">{regionFormula(hover, shownCount)}</span>：{regionName(hover, shownCount)}
            {parsed.ok && (contains(parsed.expr, hover) ? '（塗られている）' : '（塗られていない）')}
          </>
        ) : (
          '図の各部分にカーソルを合わせる（タップする）と、どんな部分か表示されます。'
        )}
      </p>

      <div class="venn-input-row">
        <label for={inputId} class="visually-hidden">
          集合の式
        </label>
        <input
          id={inputId}
          ref={inputRef}
          class={`venn-input${parsed.ok ? '' : ' has-error'}`}
          value={src}
          onInput={(e) => {
            setSrc((e.target as HTMLInputElement).value);
            setVerdict(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && mode === 'challenge') check();
          }}
          spellcheck={false}
          autocomplete="off"
          autocapitalize="characters"
          aria-invalid={!parsed.ok}
          aria-describedby={errId}
          placeholder="例: (A ∪ B)ᶜ"
        />
        {mode === 'challenge' && (
          <button type="button" class="btn btn-primary venn-check" onClick={check} disabled={!parsed.ok}>
            判定
          </button>
        )}
      </div>

      <div class="venn-keys" role="group" aria-label="記号の入力">
        {KEYS.map((k) => (
          <button type="button" key={k.label} onClick={() => insert(k.insert)} aria-label={`${k.aria}を入力`} class={k.label === 'ᶜ' ? 'venn-key-sup' : undefined}>
            {k.label === 'ᶜ' ? (
              <>
                □<sup>c</sup>
              </>
            ) : (
              k.label
            )}
          </button>
        ))}
        <button type="button" onClick={backspace} aria-label="1文字消す" class="venn-key-wide">
          ⌫
        </button>
        <button
          type="button"
          onClick={() => {
            setSrc('');
            setVerdict(null);
            inputRef.current?.focus();
          }}
          aria-label="すべて消す"
          class="venn-key-wide"
        >
          クリア
        </button>
      </div>

      <div id={errId} class="venn-status" aria-live="polite">
        {!parsed.ok ? (
          <div class="venn-error">
            <p class="venn-error-src" aria-hidden="true">
              {chars.map((ch, i) => (
                <span key={i} class={i === errorPos ? 'is-err' : ''}>
                  {ch}
                </span>
              ))}
              {errorPos >= chars.length && <span class="is-err">␣</span>}
            </p>
            <p>{parsed.error.message}</p>
          </div>
        ) : needsThree && count === 2 && mode === 'free' ? (
          <p class="venn-info">C を使っているので、3つの集合で表示しています。</p>
        ) : null}
        {mode === 'challenge' && verdict !== null && (
          <div class={`venn-verdict ${verdict ? 'is-ok' : 'is-ng'}`}>
            {verdict ? (
              <>
                <b>正解！</b> 同じ部分を表しています{parsed.ok && target && formatSetExpr(parsed.expr) !== formatSetExpr(target) ? `（別解の例：${formatSetExpr(target)}）` : ''}。
                {ci < challenges.length - 1 && (
                  <button
                    type="button"
                    class="btn btn-ghost"
                    onClick={() => {
                      setCi(ci + 1);
                      setSrc('');
                      setVerdict(null);
                    }}
                  >
                    次の問題へ →
                  </button>
                )}
              </>
            ) : (
              <>
                <b>まだ違います。</b> 2つの図を見比べて、塗り方が違う部分を探そう。
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
