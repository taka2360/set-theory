// 学習記録はこのブラウザの localStorage にだけ保存する（サーバー・アカウントなし）。
// 保存するのは「読了したか」と「各設問の最新の正誤」だけ。試行履歴は持たない。

export const STORAGE_KEY = 'setTheory:v1';
export const PROGRESS_VERSION = 1;

const CHAPTER_KEY_RE = /^[a-z0-9-]+-v\d+$/;
const QUESTION_ID_RE = /^[a-z0-9-]+$/;

export interface ChapterProgress {
  read: boolean;
  quiz: Record<string, boolean>;
}

export interface ProgressData {
  version: typeof PROGRESS_VERSION;
  chapters: Record<string, ChapterProgress>;
}

export type ValidationResult = { ok: true; data: ProgressData } | { ok: false; error: string };

export function emptyProgress(): ProgressData {
  return { version: PROGRESS_VERSION, chapters: {} };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 外部から来たデータ（保存済みデータ・インポートファイル）を厳密に検証する */
export function validateProgress(raw: unknown): ValidationResult {
  if (!isPlainObject(raw)) return { ok: false, error: 'データの形式が正しくありません（オブジェクトではありません）。' };
  if (raw.version !== PROGRESS_VERSION) {
    return { ok: false, error: `対応していないバージョンです（version: ${String(raw.version)}）。` };
  }
  if (!isPlainObject(raw.chapters)) return { ok: false, error: '"chapters" が見つかりません。' };

  const chapters: Record<string, ChapterProgress> = {};
  for (const [key, value] of Object.entries(raw.chapters)) {
    if (!CHAPTER_KEY_RE.test(key)) return { ok: false, error: `章の識別子が不正です: ${key}` };
    if (!isPlainObject(value)) return { ok: false, error: `章 ${key} のデータが不正です。` };
    if (typeof value.read !== 'boolean') return { ok: false, error: `章 ${key} の "read" は true / false である必要があります。` };
    if (!isPlainObject(value.quiz)) return { ok: false, error: `章 ${key} の "quiz" が不正です。` };
    const quiz: Record<string, boolean> = {};
    for (const [qid, correct] of Object.entries(value.quiz)) {
      if (!QUESTION_ID_RE.test(qid)) return { ok: false, error: `設問の識別子が不正です: ${qid}` };
      if (typeof correct !== 'boolean') return { ok: false, error: `設問 ${qid} の値は true / false である必要があります。` };
      quiz[qid] = correct;
    }
    chapters[key] = { read: value.read, quiz };
  }
  return { ok: true, data: { version: PROGRESS_VERSION, chapters } };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface ChapterSummary {
  read: boolean;
  answered: number;
  correct: number;
}

export function summarize(data: ProgressData, chapterKey: string): ChapterSummary {
  const ch = data.chapters[chapterKey];
  if (!ch) return { read: false, answered: 0, correct: 0 };
  const values = Object.values(ch.quiz);
  return { read: ch.read, answered: values.length, correct: values.filter(Boolean).length };
}

type Listener = (data: ProgressData) => void;

/** 進捗ストア。ストレージが使えなくても、メモリ上では動作し続ける。 */
export class ProgressStore {
  private data: ProgressData = emptyProgress();
  private listeners = new Set<Listener>();
  /** ストレージに保存できる状態か */
  available = false;

  constructor(private storage: StorageLike | null = defaultStorage()) {
    this.reload();
  }

  reload(): void {
    if (!this.storage) {
      this.available = false;
      return;
    }
    try {
      const text = this.storage.getItem(STORAGE_KEY);
      this.available = true;
      if (text) {
        const result = validateProgress(JSON.parse(text));
        this.data = result.ok ? result.data : emptyProgress();
      }
    } catch {
      // 壊れた JSON やアクセス拒否。本文は使えるようにメモリ上の空データで続ける。
      this.available = false;
    }
  }

  get(): ProgressData {
    return this.data;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 外部（他のタブ）での変更を購読者に知らせる */
  notify(): void {
    for (const fn of this.listeners) fn(this.data);
  }

  private commit(next: ProgressData): void {
    this.data = next;
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
        this.available = true;
      } catch {
        this.available = false;
      }
    }
    this.notify();
  }

  private chapter(key: string): ChapterProgress {
    const ch = this.data.chapters[key];
    return ch ? { read: ch.read, quiz: { ...ch.quiz } } : { read: false, quiz: {} };
  }

  setRead(chapterKey: string, read: boolean): void {
    const ch = this.chapter(chapterKey);
    ch.read = read;
    this.commit({ ...this.data, chapters: { ...this.data.chapters, [chapterKey]: ch } });
  }

  recordAnswer(chapterKey: string, questionId: string, correct: boolean): void {
    const ch = this.chapter(chapterKey);
    ch.quiz[questionId] = correct;
    this.commit({ ...this.data, chapters: { ...this.data.chapters, [chapterKey]: ch } });
  }

  reset(): void {
    this.commit(emptyProgress());
  }

  exportJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /** 検証に通った場合のみ、現在の記録をすべて置き換える */
  importJson(text: string): ValidationResult {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, error: 'JSON として読み込めませんでした。' };
    }
    const result = validateProgress(raw);
    if (result.ok) this.commit(result.data);
    return result;
  }
}

let shared: ProgressStore | null = null;

/** ページ内で共有するストア（クライアント側でのみ呼ぶこと） */
export function progressStore(): ProgressStore {
  if (!shared) {
    shared = new ProgressStore();
    // 他のタブでの変更を反映する
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && shared) {
          shared.reload();
          shared.notify();
        }
      });
    }
  }
  return shared;
}
