// 有限集合の間の「対応」（矢印の集まり）が写像か、単射か、全射かを判定する。
// 定義域の要素は 0..domainSize-1、終域の要素は 0..codomainSize-1 の番号で表す。

export type Arrow = readonly [from: number, to: number];

export interface MappingAnalysis {
  /** 写像になっているか（定義域のどの要素からも矢印がちょうど1本） */
  isFunction: boolean;
  /** 矢印が出ていない定義域の要素 */
  noImage: number[];
  /** 矢印が2本以上出ている定義域の要素 */
  multiImage: number[];
  /** 写像のとき、同じ行き先に2つ以上の要素が移っている組（単射でない理由） */
  collisions: { to: number; from: number[] }[];
  /** 写像のとき、どこからも矢印が来ていない終域の要素（全射でない理由） */
  unreached: number[];
  injective: boolean;
  surjective: boolean;
  bijective: boolean;
}

export function analyzeMapping(domainSize: number, codomainSize: number, arrows: readonly Arrow[]): MappingAnalysis {
  const unique = new Map<string, Arrow>();
  for (const a of arrows) unique.set(`${a[0]}-${a[1]}`, a);
  const images: number[][] = Array.from({ length: domainSize }, () => []);
  for (const [from, to] of unique.values()) {
    if (from < 0 || from >= domainSize || to < 0 || to >= codomainSize) throw new RangeError(`範囲外の矢印: ${from} → ${to}`);
    images[from]!.push(to);
  }
  const noImage = images.flatMap((im, i) => (im.length === 0 ? [i] : []));
  const multiImage = images.flatMap((im, i) => (im.length > 1 ? [i] : []));
  const isFunction = noImage.length === 0 && multiImage.length === 0;

  const preimages: number[][] = Array.from({ length: codomainSize }, () => []);
  if (isFunction) images.forEach((im, i) => preimages[im[0]!]!.push(i));
  const collisions = isFunction ? preimages.flatMap((from, to) => (from.length > 1 ? [{ to, from }] : [])) : [];
  const unreached = isFunction ? preimages.flatMap((from, to) => (from.length === 0 ? [to] : [])) : [];
  const injective = isFunction && collisions.length === 0;
  const surjective = isFunction && unreached.length === 0;
  return { isFunction, noImage, multiImage, collisions, unreached, injective, surjective, bijective: injective && surjective };
}
