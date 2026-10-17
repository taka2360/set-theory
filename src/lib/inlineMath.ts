import katex from 'katex';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** コンポーネントの title 属性などに含まれる $...$ を、ビルド時に KaTeX で HTML にする */
export function inlineMath(text: string): string {
  return text
    .split(/(\$[^$]+\$)/g)
    .map((part) => (part.length > 2 && part.startsWith('$') && part.endsWith('$') ? katex.renderToString(part.slice(1, -1), { throwOnError: true, strict: 'error' }) : escapeHtml(part)))
    .join('');
}
