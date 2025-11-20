import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

const isCI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  [isCI ? 'line' : 'list'],
  ['html', { open: isCI ? 'never' : 'on-failure', outputFolder: 'playwright-report' }],
];

if (isCI) {
  reporters.push(['github']);
  reporters.push(['blob']);
} else {
  reporters.push(['json', { outputFile: 'playwright-report/results.json' }]);
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: reporters,
  
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
