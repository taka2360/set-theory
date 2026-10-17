// 集合式（A, B, C と ∪ ∩ \ △ ᶜ）の専用パーサー。eval は使わない。
//
// 文法（優先順位は「補集合 ᶜ」＞「二項演算」）:
//   expr    := postfix (binop postfix)*      ※異なる二項演算を括弧なしで混ぜるとエラー
//   postfix := primary ('ᶜ')*
//   primary := A | B | C | U | ∅ | '(' expr ')'
//
// A ∪ B ∩ C のような式は、教科書によって解釈が分かれるため受け付けず、括弧を求める。
// 同じ演算の連続（A ∪ B ∪ C）は結合法則が成り立つので許可する。差 \ だけは結合法則が
// 成り立たないので、A \ B \ C も括弧を求める。

export type SetName = 'A' | 'B' | 'C';
export type BinaryOp = 'union' | 'intersection' | 'difference' | 'symdiff';

export type SetExpr =
  | { type: 'set'; name: SetName }
  | { type: 'universe' }
  | { type: 'empty' }
  | { type: 'complement'; operand: SetExpr }
  | { type: 'binary'; op: BinaryOp; left: SetExpr; right: SetExpr };

export class SetExprError extends Error {
  constructor(
    message: string,
    /** 入力文字列中の位置（0 始まり） */
    public position: number,
  ) {
    super(message);
    this.name = 'SetExprError';
  }
}

type Token =
  | { kind: 'set'; name: SetName; pos: number }
  | { kind: 'universe'; pos: number }
  | { kind: 'empty'; pos: number }
  | { kind: 'op'; op: BinaryOp; pos: number }
  | { kind: 'comp'; pos: number }
  | { kind: 'lparen'; pos: number }
  | { kind: 'rparen'; pos: number }
  | { kind: 'end'; pos: number };

export const OP_SYMBOL: Record<BinaryOp, string> = {
  union: '∪',
  intersection: '∩',
  difference: '\\',
  symdiff: '△',
};

const OP_NAME: Record<BinaryOp, string> = {
  union: '和集合 ∪',
  intersection: '共通部分 ∩',
  difference: '差集合 \\',
  symdiff: '対称差 △',
};

const SINGLE: Record<string, (pos: number) => Token> = {
  A: (pos) => ({ kind: 'set', name: 'A', pos }),
  B: (pos) => ({ kind: 'set', name: 'B', pos }),
  C: (pos) => ({ kind: 'set', name: 'C', pos }),
  a: (pos) => ({ kind: 'set', name: 'A', pos }),
  b: (pos) => ({ kind: 'set', name: 'B', pos }),
  U: (pos) => ({ kind: 'universe', pos }),
  Ω: (pos) => ({ kind: 'universe', pos }),
  '∅': (pos) => ({ kind: 'empty', pos }),
  Ø: (pos) => ({ kind: 'empty', pos }),
  '∪': (pos) => ({ kind: 'op', op: 'union', pos }),
  '+': (pos) => ({ kind: 'op', op: 'union', pos }),
  '|': (pos) => ({ kind: 'op', op: 'union', pos }),
  '∩': (pos) => ({ kind: 'op', op: 'intersection', pos }),
  '&': (pos) => ({ kind: 'op', op: 'intersection', pos }),
  '*': (pos) => ({ kind: 'op', op: 'intersection', pos }),
  '\\': (pos) => ({ kind: 'op', op: 'difference', pos }),
  '＼': (pos) => ({ kind: 'op', op: 'difference', pos }),
  '-': (pos) => ({ kind: 'op', op: 'difference', pos }),
  '−': (pos) => ({ kind: 'op', op: 'difference', pos }),
  '△': (pos) => ({ kind: 'op', op: 'symdiff', pos }),
  '∆': (pos) => ({ kind: 'op', op: 'symdiff', pos }),
  'ᶜ': (pos) => ({ kind: 'comp', pos }),
  "'": (pos) => ({ kind: 'comp', pos }),
  '′': (pos) => ({ kind: 'comp', pos }),
  '(': (pos) => ({ kind: 'lparen', pos }),
  '（': (pos) => ({ kind: 'lparen', pos }),
  ')': (pos) => ({ kind: 'rparen', pos }),
  '）': (pos) => ({ kind: 'rparen', pos }),
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const chars = Array.from(input);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (/\s/.test(ch)) continue;
    // 小文字 c は集合 C、^c は補集合
    if (ch === '^' && chars[i + 1]?.toLowerCase() === 'c') {
      tokens.push({ kind: 'comp', pos: i });
      i++;
      continue;
    }
    if (ch === 'c') {
      tokens.push({ kind: 'set', name: 'C', pos: i });
      continue;
    }
    if (ch === '{' && chars[i + 1] === '}') {
      tokens.push({ kind: 'empty', pos: i });
      i++;
      continue;
    }
    const make = SINGLE[ch];
    if (!make) throw new SetExprError(`「${ch}」は使えない文字です。A, B, C, U, ∅ と ∪ ∩ \\ △ ᶜ と括弧が使えます。`, i);
    tokens.push(make(i));
  }
  tokens.push({ kind: 'end', pos: chars.length });
  return tokens;
}

class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.i]!;
  }

  private next(): Token {
    return this.tokens[this.i++]!;
  }

  parse(): SetExpr {
    if (this.peek().kind === 'end') throw new SetExprError('式が空です。', 0);
    const expr = this.expr();
    const t = this.peek();
    if (t.kind === 'rparen') throw new SetExprError('閉じ括弧「)」に対応する開き括弧がありません。', t.pos);
    if (t.kind !== 'end') throw new SetExprError('ここに演算子（∪ ∩ \\ △）が必要です。', t.pos);
    return expr;
  }

  private expr(): SetExpr {
    let left = this.postfix();
    let firstOp: BinaryOp | null = null;
    while (true) {
      const t = this.peek();
      if (t.kind !== 'op') break;
      if (firstOp === null) {
        firstOp = t.op;
      } else if (t.op !== firstOp) {
        throw new SetExprError(
          `${OP_NAME[firstOp]} と ${OP_NAME[t.op]} を括弧なしで並べると、どちらを先に計算するかが決まりません。括弧で計算順を示してください。`,
          t.pos,
        );
      } else if (t.op === 'difference') {
        throw new SetExprError('差集合 \\ を続けて書くと、どちらを先に計算するかで結果が変わります。括弧で計算順を示してください。', t.pos);
      }
      this.next();
      const right = this.postfix();
      left = { type: 'binary', op: t.op, left, right };
    }
    return left;
  }

  private postfix(): SetExpr {
    let expr = this.primary();
    while (this.peek().kind === 'comp') {
      this.next();
      expr = { type: 'complement', operand: expr };
    }
    return expr;
  }

  private primary(): SetExpr {
    const t = this.next();
    switch (t.kind) {
      case 'set':
        return { type: 'set', name: t.name };
      case 'universe':
        return { type: 'universe' };
      case 'empty':
        return { type: 'empty' };
      case 'lparen': {
        if (this.peek().kind === 'rparen') throw new SetExprError('括弧の中が空です。', this.peek().pos);
        const inner = this.expr();
        const close = this.next();
        if (close.kind !== 'rparen') throw new SetExprError('閉じ括弧「)」が足りません。', close.pos);
        return inner;
      }
      case 'end':
        throw new SetExprError('式が途中で終わっています。集合（A, B, C など）が必要です。', t.pos);
      case 'op':
        throw new SetExprError(`${OP_NAME[t.op]} の前に集合が必要です。`, t.pos);
      case 'comp':
        throw new SetExprError('補集合 ᶜ は集合の後ろに付けます（例: Aᶜ）。', t.pos);
      case 'rparen':
        throw new SetExprError('閉じ括弧「)」の前に集合が必要です。', t.pos);
    }
  }
}

export function parseSetExpr(input: string): SetExpr {
  return new Parser(tokenize(input)).parse();
}

/**
 * ベン図の領域は 3 ビットのマスクで表す（bit0 = A に属する, bit1 = B, bit2 = C）。
 * 例: 0b101 は「A と C に属し、B に属さない」領域。0 は A, B, C のどれにも属さない部分。
 */
export function contains(expr: SetExpr, region: number): boolean {
  switch (expr.type) {
    case 'set':
      return (region & (1 << ['A', 'B', 'C'].indexOf(expr.name))) !== 0;
    case 'universe':
      return true;
    case 'empty':
      return false;
    case 'complement':
      return !contains(expr.operand, region);
    case 'binary': {
      const l = contains(expr.left, region);
      const r = contains(expr.right, region);
      switch (expr.op) {
        case 'union':
          return l || r;
        case 'intersection':
          return l && r;
        case 'difference':
          return l && !r;
        case 'symdiff':
          return l !== r;
      }
    }
  }
}

/** 式が表す領域の一覧（setCount 個の集合を使うときの 2^setCount 領域のうち） */
export function regionsOf(expr: SetExpr, setCount: 2 | 3 = 3): number[] {
  const result: number[] = [];
  for (let r = 0; r < 1 << setCount; r++) if (contains(expr, r)) result.push(r);
  return result;
}

/** 2 つの式が（どんな集合 A, B, C に対しても）等しい集合を表すか */
export function equivalent(a: SetExpr, b: SetExpr, setCount: 2 | 3 = 3): boolean {
  for (let r = 0; r < 1 << setCount; r++) if (contains(a, r) !== contains(b, r)) return false;
  return true;
}

export function usedSets(expr: SetExpr): Set<SetName> {
  const out = new Set<SetName>();
  const walk = (e: SetExpr): void => {
    if (e.type === 'set') out.add(e.name);
    else if (e.type === 'complement') walk(e.operand);
    else if (e.type === 'binary') {
      walk(e.left);
      walk(e.right);
    }
  };
  walk(expr);
  return out;
}

/** 正規化した表記に戻す（括弧は必要な所にだけ付ける） */
export function formatSetExpr(expr: SetExpr): string {
  const wrap = (e: SetExpr, parentOp: BinaryOp | null): string => {
    const s = formatSetExpr(e);
    if (e.type !== 'binary') return s;
    const sameAssociative = parentOp === e.op && e.op !== 'difference';
    return sameAssociative ? s : `(${s})`;
  };
  switch (expr.type) {
    case 'set':
      return expr.name;
    case 'universe':
      return 'U';
    case 'empty':
      return '∅';
    case 'complement':
      return `${expr.operand.type === 'binary' ? `(${formatSetExpr(expr.operand)})` : formatSetExpr(expr.operand)}ᶜ`;
    case 'binary':
      return `${wrap(expr.left, expr.op)} ${OP_SYMBOL[expr.op]} ${expr.right.type === 'binary' ? `(${formatSetExpr(expr.right)})` : formatSetExpr(expr.right)}`;
  }
}
