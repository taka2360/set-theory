# ゼロからの集合論

高校生のための、大学の集合論入門サイトです。集合・論理・写像・関係・順序から、可算／非可算、カントールの定理、カントール＝ベルンシュタイン＝シュレーダーの定理、選択公理までを、図と演習で基礎から学べます。完全無料・登録不要。

公開先: https://taka2360.github.io/set-theory/

## 特長

- 全11章（序章＋10章）。各章に確認問題（即時判定・解説付き）と3段階の演習問題
- 操作できる図: ベン図（集合式の入力とチャレンジ）、写像（単射・全射の判定）、ヒルベルトホテル、対角線論法
- 学習記録はブラウザの localStorage にのみ保存（書き出し・読み込み・リセット可）
- ライト／ダークモード、スマホ対応、キーボード操作、全文検索（Pagefind）

## 開発

Node.js 24 以上が必要です（`.nvmrc`）。

```sh
npm ci
npm run dev           # 開発サーバー（検索は動きません）
npm run build         # 本番ビルド＋検索インデックス生成（KaTeX の数式エラーでビルドが失敗します）
npm run preview       # dist を配信
npm test              # ユニットテスト（Vitest）
npm run lint:content  # 章の構成検査（前提章・必須セクション・確認問題の ID など）
npm run check         # 型チェック
npm run test:e2e      # E2E テスト（Playwright。先に npm run build）
```

## 構成

| パス | 内容 |
| --- | --- |
| `src/content/chapters/*.mdx` | 章の本文。frontmatter の `slug` が URL、`chapterKey` が学習記録の保存キー |
| `src/components/` | 定義・定理・証明・確認問題などの部品（MDX から import なしで使える） |
| `src/components/interactive/` | Preact の操作できる図 |
| `src/lib/setExpr.ts` | 集合式のパーサー（`eval` は使わない） |
| `src/lib/progress.ts` | 学習記録（バージョン付き・検証付き） |
| `docs/content-checklist.md` | 章を書くときの品質チェックリスト |

章を追加・修正したら `docs/content-checklist.md` で点検し、`npm run lint:content` と `npm run build` を通してください。

## ライセンス

- 本文（`src/content/`）: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja)
- ソースコード: MIT License（`LICENSE`）

誤りの報告やご意見は Issues へお願いします。
