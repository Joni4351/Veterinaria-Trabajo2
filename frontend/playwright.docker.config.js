import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'docker.smoke.spec.js',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:15173', browserName: 'chromium', channel: 'msedge' },
});
