import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 5173);

export default defineConfig({
  testDir: './e2e',
  testMatch: 'registro-facial.spec.js',
  timeout: 120000,
  workers: 1,
  use: { baseURL: `http://localhost:${port}`, browserName: 'chromium', channel: 'msedge' },
  webServer: {
    command: `npm run dev -- --host localhost --port ${port} --strictPort`,
    url: `http://localhost:${port}`, reuseExistingServer: false,
  },
});
