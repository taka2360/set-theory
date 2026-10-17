import { describe, expect, it } from 'vitest';
import { equivalent, formatSetExpr, parseSetExpr, regionsOf, SetExprError } from '../../src/lib/setExpr';

const regions = (s: string, n: 2 | 3 = 3) => regionsOf(parseSetExpr(s), n);
const eq = (a: string, b: string) => equivalent(parseSetExpr(a), parseSetExpr(b));

describe('parseSetExpr', () => {
  it('単独の集合', () => {
    expect(regions('A')).toEqual([1, 3, 5, 7]);
    expect(regions('U', 2)).toEqual([0, 1, 2, 3]);
    expect(regions('∅')).toEqual([]);
  });

  it('基本の演算（2 集合）', () => {
    expect(regions('A ∪ B', 2)).toEqual([1, 2, 3]);
    expect(regions('A ∩ B', 2)).toEqual([3]);
    expect(regions('A \\ B', 2)).toEqual([1]);
    expect(regions('A △ B', 2)).toEqual([1, 2]);
    expect(regions('Aᶜ', 2)).toEqual([0, 2]);
  });

  it('補集合は二項演算より優先される', () => {
    expect(eq('A ∩ Bᶜ', 'A \\ B')).toBe(true);
    expect(eq('(A ∩ B)ᶜ', 'Aᶜ ∩ Bᶜ')).toBe(false);
  });

  it('ド・モルガンの法則', () => {
    expect(eq('(A ∪ B)ᶜ', 'Aᶜ ∩ Bᶜ')).toBe(true);
    expect(eq('(A ∩ B)ᶜ', 'Aᶜ ∪ Bᶜ')).toBe(true);
  });

  it('分配法則', () => {
    expect(eq('A ∩ (B ∪ C)', '(A ∩ B) ∪ (A ∩ C)')).toBe(true);
    expect(eq('A ∪ (B ∩ C)', '(A ∪ B) ∩ (A ∪ C)')).toBe(true);
  });

  it('入力の別表記を受け付ける', () => {
    expect(eq("(a+b)'", 'Aᶜ ∩ Bᶜ')).toBe(true);
    expect(eq('A & B^c', 'A \\ B')).toBe(true);
    expect(eq('c - {}', 'C')).toBe(true);
    expect(eq('（A−B）', 'A \\ B')).toBe(true);
  });

  it('同じ演算の連続は許可する', () => {
    expect(regions('A ∪ B ∪ C')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(regions('A ∩ B ∩ C')).toEqual([7]);
  });

  it('二重補集合', () => {
    expect(eq('Aᶜᶜ', 'A')).toBe(true);
  });
});

describe('エラー', () => {
  const errorAt = (s: string) => {
    try {
      parseSetExpr(s);
    } catch (e) {
      if (e instanceof SetExprError) return { pos: e.position, msg: e.message };
      throw e;
    }
    throw new Error(`エラーになるはず: ${s}`);
  };

  it('異なる演算を括弧なしで混ぜるとエラー', () => {
    const e = errorAt('A ∪ B ∩ C');
    expect(e.pos).toBe(6);
    expect(e.msg).toContain('括弧');
  });

  it('差の連続はエラー', () => {
    expect(errorAt('A \\ B \\ C').msg).toContain('差集合');
  });

  it('括弧の対応', () => {
    expect(errorAt('(A ∪ B').msg).toContain('閉じ括弧');
    expect(errorAt('A ∪ B)').msg).toContain('開き括弧');
    expect(errorAt('()').msg).toContain('空');
  });

  it('不正な文字・不完全な式', () => {
    expect(errorAt('A ∪ D').pos).toBe(4);
    expect(errorAt('').msg).toContain('空');
    expect(errorAt('A ∪').msg).toContain('途中');
    expect(errorAt('∪ A').msg).toContain('前に集合');
    expect(errorAt('ᶜA').msg).toContain('後ろ');
    expect(errorAt('A B').msg).toContain('演算子');
  });

  it('eval を使わない（コードを渡しても評価されない）', () => {
    expect(() => parseSetExpr('alert(1)')).toThrow(SetExprError);
  });
});

describe('formatSetExpr', () => {
  it('正規化した表記', () => {
    expect(formatSetExpr(parseSetExpr("(a+b)'"))).toBe('(A ∪ B)ᶜ');
    expect(formatSetExpr(parseSetExpr('A∪B∪C'))).toBe('A ∪ B ∪ C');
    expect(formatSetExpr(parseSetExpr('(A\\B)\\C'))).toBe('(A \\ B) \\ C');
    expect(formatSetExpr(parseSetExpr('A∩(B∪C)'))).toBe('A ∩ (B ∪ C)');
  });
});
