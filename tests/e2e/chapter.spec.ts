import { expect, test } from '@playwright/test';

async function hydratedVenn(page: import('@playwright/test').Page) {
  const venn = page.locator('.venn');
  await venn.scrollIntoViewIfNeeded();
  // client:visible の island がハイドレートされるのを待つ
  await expect(page.locator('astro-island:has(.venn)')).not.toHaveAttribute('ssr', /.*/);
  return venn;
}

test.describe('第1章（パイロット章）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('chapters/sets/');
  });

  test('本文と数式が表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: '集合とは' })).toBeVisible();
    expect(await page.locator('.prose .katex').count()).toBeGreaterThan(50);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    // ページ全体が横にはみ出さない
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('確認問題に答えると判定と解説が出て、リロード後も記録が残る', async ({ page }) => {
    const quiz = page.locator('[data-qid="sets-q01"]');
    await quiz.locator('[data-choice]').nth(1).click();
    await expect(quiz.locator('[data-quiz-result]')).toHaveText('正解です！');
    await expect(quiz.locator('[data-explain]')).toBeVisible();

    const wrong = page.locator('[data-qid="sets-q02"]');
    await wrong.locator('[data-choice]').nth(0).click();
    await expect(wrong.locator('[data-quiz-result]')).toContainText('不正解');

    await expect(page.locator('[data-score]')).toContainText('回答済み 2 / 5 問・正解 1 問');
    await page.reload();
    await expect(page.locator('[data-score]')).toContainText('回答済み 2 / 5 問・正解 1 問');
    await expect(page.locator('[data-qid="sets-q01"] [data-quiz-prev]')).toHaveText('前回：正解');

    // やり直すと最新の正誤で上書きされる
    await wrong.locator('[data-choice]').nth(2).click();
    await expect(page.locator('[data-score]')).toContainText('正解 2 問');
  });

  test('読了ボタンの状態が保存される', async ({ page }) => {
    const btn = page.locator('[data-read-toggle]');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('[data-read-toggle]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('ベン図：式を入力すると図が変わり、誤りは指摘される', async ({ page }) => {
    const venn = await hydratedVenn(page);
    const input = venn.locator('input.venn-input');
    await input.fill('(A ∪ B)ᶜ');
    await expect(venn.locator('figcaption')).toHaveText('(A ∪ B)ᶜ');
    await expect(venn.locator('.venn-region.is-filled')).toHaveCount(1);

    await input.fill('A ∪ B ∩ C');
    await expect(venn.locator('.venn-error')).toContainText('括弧');
    await expect(input).toHaveAttribute('aria-invalid', 'true');

    // 記号ボタンでも入力できる
    await venn.getByRole('button', { name: 'すべて消す' }).click();
    await venn.getByRole('button', { name: 'Aを入力' }).click();
    await venn.getByRole('button', { name: '共通部分を入力' }).click();
    await venn.getByRole('button', { name: 'Bを入力' }).click();
    await expect(input).toHaveValue('A ∩ B');
  });

  test('ベン図：チャレンジで正誤判定できる', async ({ page }) => {
    const venn = await hydratedVenn(page);
    await venn.getByRole('button', { name: 'チャレンジ' }).click();
    const input = venn.locator('input.venn-input');
    await input.fill('A ∪ B');
    await venn.getByRole('button', { name: '判定' }).click();
    await expect(venn.locator('.venn-verdict')).toContainText('まだ違います');
    await input.fill('A - B');
    await input.press('Enter');
    await expect(venn.locator('.venn-verdict')).toContainText('正解');
  });

  test('ダークモードを切り替えて保存できる', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('キーボードだけで確認問題に答えられる', async ({ page }) => {
    const first = page.locator('[data-qid="sets-q01"] [data-choice]').nth(1);
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-qid="sets-q01"] [data-quiz-result]')).toHaveText('正解です！');
  });
});

test.describe('スマホ表示', () => {
  test.skip(({ isMobile }) => !isMobile, 'スマホのみ');

  test('ドロワーで章一覧を開閉できる', async ({ page }) => {
    await page.goto('chapters/sets/');
    const drawer = page.locator('[data-drawer]');
    await expect(drawer).toBeHidden();
    await page.getByRole('button', { name: '章の一覧を開く' }).click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});
