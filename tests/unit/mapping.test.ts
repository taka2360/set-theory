import { describe, expect, it } from 'vitest';
import { analyzeMapping } from '../../src/lib/mapping';

describe('analyzeMapping', () => {
  it('矢印が足りない・多すぎると写像ではない', () => {
    const a = analyzeMapping(3, 3, [
      [0, 0],
      [0, 1],
    ]);
    expect(a.isFunction).toBe(false);
    expect(a.noImage).toEqual([1, 2]);
    expect(a.multiImage).toEqual([0]);
    expect(a.injective).toBe(false);
    expect(a.surjective).toBe(false);
  });

  it('全単射', () => {
    const a = analyzeMapping(3, 3, [
      [0, 2],
      [1, 0],
      [2, 1],
    ]);
    expect(a).toMatchObject({ isFunction: true, injective: true, surjective: true, bijective: true });
  });

  it('単射だが全射でない', () => {
    const a = analyzeMapping(2, 3, [
      [0, 0],
      [1, 1],
    ]);
    expect(a).toMatchObject({ injective: true, surjective: false, unreached: [2] });
  });

  it('全射だが単射でない', () => {
    const a = analyzeMapping(3, 2, [
      [0, 0],
      [1, 1],
      [2, 1],
    ]);
    expect(a).toMatchObject({ injective: false, surjective: true, collisions: [{ to: 1, from: [1, 2] }] });
  });

  it('同じ矢印の重複は1本として数える', () => {
    const a = analyzeMapping(1, 1, [
      [0, 0],
      [0, 0],
    ]);
    expect(a.bijective).toBe(true);
  });

  it('範囲外はエラー', () => {
    expect(() => analyzeMapping(1, 1, [[0, 1]])).toThrow(RangeError);
  });
});
