import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// BASE_URL を指定すると、公開済みサイトに対してテストする（例: BASE_URL=https://taka2360.github.io/set-theory/）
const REMOTE = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}/set-theory/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // ビルド済みの dist を配信する（先に npm run build を実行しておく）
  webServer: REMOTE
    ? undefined
    : {
        command: `npx astro preview --port ${PORT}`,
        url: `http://localhost:${PORT}/set-theory/`,
        reuseExistingServer: !process.env.CI,
      },
});
