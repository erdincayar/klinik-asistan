import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'https://poby.ai',
    headless: true,
    screenshot: 'on',
    trace: 'off',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  outputDir: 'test-results',
});
