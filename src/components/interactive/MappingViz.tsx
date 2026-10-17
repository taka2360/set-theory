import { useMemo, useState } from 'preact/hooks';
import { analyzeMapping, type Arrow } from '../../lib/mapping';
import './mapping.css';

type GoalKind = 'function' | 'injective' | 'surjective' | 'bijective' | 'injective-only' | 'surjective-only';

interface Props {
  domain?: string[];
  codomain?: string[];
  initial?: [number, number][];
  /** 作ってみる課題（満たすと ✓ が付く） */
  goals?: GoalKind[];
  title?: string;
}

const GOAL_TEXT: Record<GoalKind, string> = {
  function: '写像を作る',
  injective: '単射を作る',
  surjective: '全射を作る',
  bijective: '全単射を作る',
  'injective-only': '単射だが全射でない写像を作る',
  'surjective-only': '全射だが単射でない写像を作る',
};

const ROW = 50;
const TOP = 46;
const XL = 78;
const XR = 242;

export default function MappingViz({ domain = ['a', 'b', 'c'], codomain = ['1', '2', '3'], initial = [], goals = [], title = '写像を作って調べる' }: Props) {
  const [arrows, setArrows] = useState<Arrow[]>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const a = useMemo(() => analyzeMapping(domain.length, codomain.length, arrows), [arrows, domain.length, codomain.length]);
  const rows = Math.max(domain.length, codomain.length);
  const height = TOP + rows * ROW + 6;
  const yL = (i: number) => TOP + i * ROW + ((rows - domain.length) * ROW) / 2 + ROW / 2 - 6;
  const yR = (j: number) => TOP + j * ROW + ((rows - codomain.length) * ROW) / 2 + ROW / 2 - 6;

  const toggle = (from: number, to: number) => {
    setArrows((prev) => (prev.some(([f, t]) => f === from && t === to) ? prev.filter(([f, t]) => !(f === from && t === to)) : [...prev, [from, to]]));
  };

  const pickDomain = (i: number) => setSelected(selected === i ? null : i);
  const pickCodomain = (j: number) => {
    if (selected === null) return;
    toggle(selected, j);
    setSelected(null);
  };

  const goalMet = (g: GoalKind): boolean => {
    switch (g) {
      case 'function':
        return a.isFunction;
      case 'injective':
        return a.injective;
      case 'surjective':
        return a.surjective;
      case 'bijective':
        return a.bijective;
      case 'injective-only':
        return a.injective && !a.surjective;
      case 'surjective-only':
        return a.surjective && !a.injective;
    }
  };

  const names = (idx: number[], labels: string[]) => idx.map((i) => labels[i]).join('、');
  const key = (e: KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  const verdicts: { label: string; ok: boolean; reason: string }[] = [
    {
      label: '写像',
      ok: a.isFunction,
      reason: a.isFunction
        ? 'X のどの要素からも、矢印がちょうど1本出ています。'
        : [a.noImage.length ? `${names(a.noImage, domain)} から矢印が出ていません` : '', a.multiImage.length ? `${names(a.multiImage, domain)} から矢印が2本以上出ています` : ''].filter(Boolean).join('。') + '。',
    },
    {
      label: '単射',
      ok: a.injective,
      reason: !a.isFunction ? 'まず写像にする必要があります。' : a.injective ? '異なる要素は、異なる行き先に移っています。' : a.collisions.map((c) => `${names(c.from, domain)} が同じ ${codomain[c.to]} に移っています`).join('。') + '。',
    },
    {
      label: '全射',
      ok: a.surjective,
      reason: !a.isFunction ? 'まず写像にする必要があります。' : a.surjective ? 'Y のどの要素にも、矢印が届いています。' : `${names(a.unreached, codomain)} にはどこからも矢印が来ていません。`,
    },
  ];

  return (
    <section class="mapviz" aria-label={title}>
      <header class="mapviz-head">
        <p class="mapviz-title">
          <span class="mapviz-badge">操作してみよう</span>
          {title}
        </p>
      </header>
      <p class="mapviz-help">
        左の要素を選んでから右の要素を選ぶと、矢印を引けます（もう一度同じ組を選ぶと消えます）。キーボードでは Tab で移動し、Enter で選べます。
      </p>
      <div class="mapviz-body">
        <svg viewBox={`0 0 320 ${height}`} class="mapviz-svg" role="group" aria-label="写像の図">
          <defs>
            <marker id="mapviz-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" class="mapviz-arrowhead" />
            </marker>
          </defs>
          <text x={XL} y="22" text-anchor="middle" class="mapviz-setname">
            X
          </text>
          <text x={XR} y="22" text-anchor="middle" class="mapviz-setname">
            Y
          </text>
          <rect x={XL - 44} y={TOP - 8} width="88" height={rows * ROW + 4} rx="40" class="mapviz-set" />
          <rect x={XR - 44} y={TOP - 8} width="88" height={rows * ROW + 4} rx="40" class="mapviz-set" />
          {arrows.map(([f, t]) => {
            const bad = a.multiImage.includes(f);
            return <line key={`${f}-${t}`} x1={XL + 16} y1={yL(f)} x2={XR - 18} y2={yR(t)} class={`mapviz-arrow${bad ? ' is-bad' : ''}`} marker-end="url(#mapviz-head)" />;
          })}
          {domain.map((d, i) => (
            <g
              key={d}
              class={`mapviz-node${selected === i ? ' is-selected' : ''}${a.noImage.includes(i) || a.multiImage.includes(i) ? ' is-warn' : ''}`}
              tabIndex={0}
              role="button"
              aria-pressed={selected === i}
              aria-label={`X の要素 ${d}${selected === i ? '（選択中）' : ''}`}
              onClick={() => pickDomain(i)}
              onKeyDown={(e) => key(e as unknown as KeyboardEvent, () => pickDomain(i))}
            >
              <circle cx={XL} cy={yL(i)} r="15" />
              <text x={XL} y={yL(i)} text-anchor="middle" dominant-baseline="central">
                {d}
              </text>
            </g>
          ))}
          {codomain.map((c, j) => (
            <g
              key={c}
              class={`mapviz-node${selected !== null ? ' is-target' : ''}${a.isFunction && a.unreached.includes(j) ? ' is-dim' : ''}`}
              tabIndex={0}
              role="button"
              aria-disabled={selected === null}
              aria-label={`Y の要素 ${c}`}
              onClick={() => pickCodomain(j)}
              onKeyDown={(e) => key(e as unknown as KeyboardEvent, () => pickCodomain(j))}
            >
              <circle cx={XR} cy={yR(j)} r="15" />
              <text x={XR} y={yR(j)} text-anchor="middle" dominant-baseline="central">
                {c}
              </text>
            </g>
          ))}
        </svg>
        <div class="mapviz-side">
          <ul class="mapviz-verdicts" aria-live="polite">
            {verdicts.map((v) => (
              <li key={v.label} class={v.ok ? 'is-ok' : 'is-ng'}>
                <span class="mapviz-mark" aria-hidden="true">
                  {v.ok ? '○' : '×'}
                </span>
                <span>
                  <b>
                    {v.label}
                    {v.ok ? 'である' : 'ではない'}
                  </b>
                  <br />
                  <small>{v.reason}</small>
                </span>
              </li>
            ))}
          </ul>
          {a.bijective && <p class="mapviz-bij">全単射です！ X と Y の要素がぴったり1対1に対応しています。</p>}
          <div class="mapviz-actions">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => {
                setArrows([]);
                setSelected(null);
              }}
            >
              矢印をすべて消す
            </button>
          </div>
        </div>
      </div>
      {goals.length > 0 && (
        <div class="mapviz-goals">
          <p class="mapviz-goals-title">チャレンジ（X と Y の要素の個数に注目）</p>
          <ul>
            {goals.map((g) => (
              <li key={g} class={goalMet(g) ? 'is-done' : ''}>
                <span aria-hidden="true">{goalMet(g) ? '✓' : '□'}</span> {GOAL_TEXT[g]}
                {goalMet(g) && <span class="visually-hidden">（達成）</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
