import { useState } from 'preact/hooks';
import './diagonal.css';

const N = 6;

function randomRows(): number[][] {
  return Array.from({ length: N }, () => Array.from({ length: N }, () => Math.floor(Math.random() * 10)));
}

// 初期表示（サーバー描画と一致させるため固定）
const INITIAL: number[][] = [
  [1, 4, 1, 5, 9, 2],
  [5, 0, 0, 0, 0, 0],
  [3, 3, 3, 3, 3, 3],
  [7, 1, 8, 2, 8, 1],
  [2, 5, 0, 1, 1, 7],
  [6, 9, 3, 1, 4, 7],
];

/** 対角の桁が 1 なら 2、それ以外なら 1（0 と 9 を使わない） */
export const diagonalDigit = (d: number): number => (d === 1 ? 2 : 1);

export default function DiagonalArgument() {
  const [rows, setRows] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const done = step >= N;

  return (
    <section class="diag" aria-label="対角線論法">
      <header class="diag-head">
        <p class="diag-title">
          <span class="diag-badge">直観</span>
          対角線論法を1ステップずつ
        </p>
      </header>
      <p class="diag-help">
        「[0, 1) の実数がすべて並んだ」と仮定したリストの、最初の {N} 行・{N} 桁を表示しています。対角線上の桁を見て、<b>1 なら 2、それ以外なら 1</b> に変えた数 c を作ります。
      </p>
      <div class="diag-table-wrap">
        <table class="diag-table">
          <caption class="visually-hidden">仮定した実数のリスト</caption>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} class={i < step ? 'is-done' : i === step ? 'is-current' : ''}>
                <th scope="row">
                  <i>x</i>
                  <sub>{i + 1}</sub> = 0.
                </th>
                {r.map((d, j) => (
                  <td key={j} class={i === j ? (j < step ? 'is-diag is-seen' : j === step ? 'is-diag is-now' : 'is-diag') : ''}>
                    {d}
                  </td>
                ))}
                <td class="diag-dots">…</td>
              </tr>
            ))}
            <tr class="diag-more">
              <th scope="row">⋮</th>
              <td colSpan={N + 1} />
            </tr>
            <tr class="diag-result">
              <th scope="row">
                <i>c</i> = 0.
              </th>
              {rows.map((r, j) => (
                <td key={j} class={j < step ? 'is-filled' : ''}>
                  {j < step ? diagonalDigit(r[j]!) : '?'}
                </td>
              ))}
              <td class="diag-dots">…</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="diag-status" aria-live="polite">
        {step === 0 && '「次へ」を押すと、x₁ の 1 桁目から順に見ていきます。'}
        {step > 0 &&
          !done &&
          `x${toSub(step)} の ${step} 桁目は ${rows[step - 1]![step - 1]} なので、c の ${step} 桁目は ${diagonalDigit(rows[step - 1]![step - 1]!)}。これで c は x${toSub(step)} と ${step} 桁目が違います。`}
        {done && `c は x₁ と 1 桁目が、x₂ と 2 桁目が、…… xₙ と n 桁目が違うので、リストのどの数とも異なります。リストには載っていない数が作れました！`}
      </p>
      <div class="diag-controls">
        <button type="button" class="btn btn-primary" onClick={() => setStep(Math.min(N, step + 1))} disabled={done}>
          次へ
        </button>
        <button type="button" class="btn" onClick={() => setStep(0)}>
          最初から
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          onClick={() => {
            setRows(randomRows());
            setStep(0);
          }}
        >
          別のリストで試す
        </button>
      </div>
      <p class="diag-caveat">
        ⚠ 画面に出せるのは有限個の行と桁だけです。証明では、無限に続くリストのすべての n について「c と xₙ は n 桁目が違う」ことを、式と言葉で示します。
      </p>
    </section>
  );
}

function toSub(n: number): string {
  return String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!);
}
