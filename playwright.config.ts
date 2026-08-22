import { defineConfig, devices } from '@playwright/test';

export const PORT = 4321;

export default defineConfig({
  testDir: './tests',
  // `astro preview` has to be started with `--background`, which returns once
  // the server is ready. Playwright's `webServer` expects a foreground process,
  // so start and stop it around the run instead.
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  fullyParallel: true,
  globalTimeout: 5 * 60 * 1000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
