// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** KaTeX の描画エラーを警告で済ませず、ビルドを失敗させる */
function rehypeFailOnKatexError() {
  /** @param {unknown} _tree @param {import('vfile').VFile} file */
  return (_tree, file) => {
    const errors = file.messages.filter((m) => m.source === 'rehype-katex');
    if (errors.length > 0) {
      const detail = errors.map((m) => `${file.path}:${m.line ?? '?'} ${m.cause instanceof Error ? m.cause.message : m.reason}`).join('\n');
      throw new Error(`KaTeX の数式エラー:\n${detail}`);
    }
  };
}

export default defineConfig({
  site: 'https://taka2360.github.io',
  base: '/set-theory',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: 'error', output: 'htmlAndMathml' }], rehypeFailOnKatexError],
      smartypants: false,
    }),
  },
  integrations: [mdx(), preact(), sitemap()],
});
