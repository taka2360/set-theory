import { describe, expect, it } from 'vitest';
import { ProgressStore, STORAGE_KEY, summarize, validateProgress, type StorageLike } from '../../src/lib/progress';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

class BrokenStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
  removeItem(): void {}
}

describe('ProgressStore', () => {
  it('読了と回答を保存し、再読み込みしても残る', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    store.setRead('sets-basics-v1', true);
    store.recordAnswer('sets-basics-v1', 'sets-q01', true);
    store.recordAnswer('sets-basics-v1', 'sets-q02', false);
    const again = new ProgressStore(storage);
    expect(summarize(again.get(), 'sets-basics-v1')).toEqual({ read: true, answered: 2, correct: 1 });
  });

  it('同じ設問は最新の正誤で上書きされる', () => {
    const store = new ProgressStore(new MemoryStorage());
    store.recordAnswer('sets-basics-v1', 'sets-q01', false);
    store.recordAnswer('sets-basics-v1', 'sets-q01', true);
    expect(summarize(store.get(), 'sets-basics-v1')).toEqual({ read: false, answered: 1, correct: 1 });
  });

  it('ストレージが使えなくても例外を投げず、メモリ上で動く', () => {
    const store = new ProgressStore(new BrokenStorage());
    expect(store.available).toBe(false);
    store.recordAnswer('sets-basics-v1', 'sets-q01', true);
    expect(store.available).toBe(false);
    expect(summarize(store.get(), 'sets-basics-v1').correct).toBe(1);
  });

  it('SSR（ストレージなし）でも動く', () => {
    const store = new ProgressStore(null);
    expect(store.available).toBe(false);
    expect(store.get().chapters).toEqual({});
  });

  it('壊れた保存データは無視する', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    const store = new ProgressStore(storage);
    expect(store.get().chapters).toEqual({});
  });

  it('購読者に変更が通知される', () => {
    const store = new ProgressStore(new MemoryStorage());
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.setRead('sets-basics-v1', true);
    off();
    store.setRead('sets-basics-v1', false);
    expect(calls).toBe(1);
  });

  it('エクスポートしたものをインポートできる（全置換）', () => {
    const a = new ProgressStore(new MemoryStorage());
    a.recordAnswer('sets-basics-v1', 'sets-q01', true);
    const b = new ProgressStore(new MemoryStorage());
    b.recordAnswer('logic-basics-v1', 'logic-q01', true);
    expect(b.importJson(a.exportJson()).ok).toBe(true);
    expect(Object.keys(b.get().chapters)).toEqual(['sets-basics-v1']);
  });

  it('不正なインポートは拒否し、既存データを変えない', () => {
    const store = new ProgressStore(new MemoryStorage());
    store.recordAnswer('sets-basics-v1', 'sets-q01', true);
    const before = store.exportJson();
    expect(store.importJson('nope').ok).toBe(false);
    expect(store.importJson('{"version":2,"chapters":{}}').ok).toBe(false);
    expect(store.exportJson()).toBe(before);
  });
});

describe('validateProgress', () => {
  it('型と識別子を検証する', () => {
    expect(validateProgress({ version: 1, chapters: {} }).ok).toBe(true);
    expect(validateProgress([]).ok).toBe(false);
    expect(validateProgress({ version: 1 }).ok).toBe(false);
    expect(validateProgress({ version: 1, chapters: { 'Bad Key': { read: true, quiz: {} } } }).ok).toBe(false);
    expect(validateProgress({ version: 1, chapters: { 'sets-basics-v1': { read: 'yes', quiz: {} } } }).ok).toBe(false);
    expect(validateProgress({ version: 1, chapters: { 'sets-basics-v1': { read: true, quiz: { q1: 1 } } } }).ok).toBe(false);
    expect(validateProgress({ version: 1, chapters: { 'sets-basics-v1': { read: true, quiz: { '<script>': true } } } }).ok).toBe(false);
  });

  it('余計なフィールドは取り除く', () => {
    const r = validateProgress({ version: 1, extra: 1, chapters: { 'sets-basics-v1': { read: true, quiz: {}, junk: 1 } } });
    expect(r.ok && r.data).toEqual({ version: 1, chapters: { 'sets-basics-v1': { read: true, quiz: {} } } });
  });
});
