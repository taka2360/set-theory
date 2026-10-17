import { useState } from 'preact/hooks';
import './hotel.css';

type Scenario = 'one' | 'infinite';

const ROOMS = 10;

interface Guest {
  id: string;
  label: string;
  isNew: boolean;
  /** 新しい客が上空で待つ位置 */
  wait: number;
  before: number | null;
  after: number;
}

function guests(s: Scenario): Guest[] {
  const out: Guest[] = [];
  // 元からいる客 n（部屋 n に宿泊中）。画面に入る範囲だけ描く
  for (let n = 1; n <= ROOMS; n++) {
    out.push({ id: `old${n}`, label: `${n}`, isNew: false, wait: 0, before: n, after: s === 'one' ? n + 1 : 2 * n });
  }
  if (s === 'one') out.push({ id: 'new1', label: '新', isNew: true, wait: 1, before: null, after: 1 });
  else for (let k = 1; 2 * k - 1 <= ROOMS; k++) out.push({ id: `new${k}`, label: `新${k}`, isNew: true, wait: k, before: null, after: 2 * k - 1 });
  return out;
}

const RULE: Record<Scenario, { title: string; rule: string; newRule: string }> = {
  one: { title: '新しい客が1人来た', rule: '部屋 n の客は、部屋 n + 1 へ移る', newRule: '新しい客は、空いた部屋 1 へ' },
  infinite: { title: '新しい客が無限に（1, 2, 3, … 号の客が）来た', rule: '部屋 n の客は、部屋 2n へ移る', newRule: '新しい客 k は、空いた奇数の部屋 2k − 1 へ' },
};

export default function HilbertHotel() {
  const [scenario, setScenario] = useState<Scenario>('one');
  const [moved, setMoved] = useState(false);
  const list = guests(scenario);
  const r = RULE[scenario];

  return (
    <section class="hotel" aria-label="ヒルベルトホテル">
      <header class="hotel-head">
        <p class="hotel-title">
          <span class="hotel-badge">直観</span>
          ヒルベルトホテル
        </p>
        <div class="hotel-tabs" role="group" aria-label="場面の切り替え">
          {(['one', 'infinite'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scenario === s}
              onClick={() => {
                setScenario(s);
                setMoved(false);
              }}
            >
              {s === 'one' ? '1人来た' : '無限に来た'}
            </button>
          ))}
        </div>
      </header>
      <p class="hotel-scene">
        部屋 1, 2, 3, … が無限にあり、<b>すべて満室</b>。そこへ{r.title}。
      </p>

      <div class="hotel-stage" aria-hidden="true">
        <div class="hotel-rooms">
          {Array.from({ length: ROOMS }, (_, i) => (
            <div class="hotel-room" key={i}>
              <span class="hotel-door" />
              <span class="hotel-no">{i + 1}</span>
            </div>
          ))}
          <div class="hotel-more">…</div>
        </div>
        <div class="hotel-guests">
          {list.map((g) => {
            const pos = moved ? g.after : g.before;
            const offscreen = pos === null || pos > ROOMS;
            return (
              <span
                key={g.id}
                class={`hotel-guest${g.isNew ? ' is-new' : ''}${offscreen ? ' is-off' : ''}`}
                style={{ '--pos': pos === null ? 0 : Math.min(pos, ROOMS + 1), '--wait': g.wait } as Record<string, number>}
              >
                {g.label}
              </span>
            );
          })}
        </div>
      </div>

      <div class="hotel-controls">
        <button type="button" class="btn btn-primary" onClick={() => setMoved(!moved)}>
          {moved ? '最初に戻す' : '部屋を移ってもらう'}
        </button>
        <p class="hotel-rule" aria-live="polite">
          {moved ? (
            <>
              {r.rule}。{r.newRule}。<b>全員が部屋に入れた！</b>
            </>
          ) : (
            'ボタンを押すと、支配人のアイデアで全員が部屋を移ります。'
          )}
        </p>
      </div>

      <p class="hotel-caveat">
        ⚠ この図は、無限にある部屋のうち最初の {ROOMS} 室だけを見せる<strong>直観のための絵</strong>で、証明ではありません。証明では、移動の規則が全単射になっていること（どの客も1つの部屋に入り、どの部屋にも1人だけ入ること）を式で確かめます。
      </p>
    </section>
  );
}
