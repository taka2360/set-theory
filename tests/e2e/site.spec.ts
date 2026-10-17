import { expect, test } from '@playwright/test';

const CHAPTER_SLUGS = ['intro', 'sets', 'logic', 'operations', 'maps', 'relations', 'orders', 'countable', 'uncountable', 'cbs', 'choice'];

test.describe('全ページ', () => {
  for (const slug of CHAPTER_SLUGS) {
    test(`章 ${slug} が表示され、数式エラーやはみ出しがない`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`chapters/${slug}/`);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.katex-error')).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }

  for (const path of ['', 'chapters/', 'glossary/', 'about/', 'search/']) {
    test(`ページ /${path} が表示される`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('内部リンクがすべて存在するページを指す', async ({ page, request, baseURL }) => {
    test.skip(test.info().project.name !== 'desktop', 'デスクトップのみ');
    const visited = new Set<string>();
    const queue = [new URL(baseURL!).pathname];
    const broken: string[] = [];
    while (queue.length) {
      const path = queue.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);
      await page.goto(path);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
      for (const href of hrefs) {
        const url = new URL(href);
        if (url.origin !== new URL(baseURL!).origin) continue;
        const p = url.pathname;
        if (visited.has(p) || queue.includes(p)) continue;
        const res = await request.get(p);
        if (res.status() !== 200) broken.push(`${path} → ${p} (${res.status()})`);
        else if (p.endsWith('/')) queue.push(p);
      }
    }
    expect(broken).toEqual([]);
    expect(visited.size).toBeGreaterThanOrEqual(15);
  });
});

test.describe('検索（受け入れテスト）', () => {
  test.skip(({ isMobile }) => isMobile, 'デスクトップのみ');

  for (const [query, expected] of [
    ['部分集合', '集合とは'],
    ['空集合', '集合とは'],
    ['選択公理', '公理化と選択公理'],
    ['対角線論法', '対角線論法'],
    ['∀', '論理の基礎'],
  ] as const) {
    test(`「${query}」で関連する章が見つかる`, async ({ page }) => {
      await page.goto(`search/?q=${encodeURIComponent(query)}`);
      const results = page.locator('.pagefind-ui__result');
      await expect(results.first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.pagefind-ui__result-title').filter({ hasText: expected }).first()).toBeVisible();
    });
  }
});

test.describe('学習記録の管理', () => {
  test('トップのロードマップに読了が反映され、about でリセットできる', async ({ page }) => {
    await page.goto('chapters/sets/');
    await page.locator('[data-read-toggle]').click();
    await page.goto('');
    await expect(page.locator('[data-rm-key="sets-basics-v1"]')).toHaveAttribute('data-read', '1');
    await expect(page.locator('[data-resume]')).toContainText('続きから');

    await page.goto('about/');
    await expect(page.locator('[data-summary]')).toContainText('読了 1 章');
    page.once('dialog', (d) => d.accept());
    await page.locator('[data-reset]').click();
    await expect(page.locator('[data-summary]')).toHaveText('まだ記録はありません。');
  });

  test('不正なファイルの読み込みは拒否される', async ({ page }) => {
    await page.goto('about/');
    page.once('dialog', (d) => d.accept());
    await page.locator('[data-import]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":9,"chapters":{}}') });
    await expect(page.locator('[data-msg]')).toContainText('読み込めませんでした');
  });
});
