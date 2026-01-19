import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({path: '.env.e2e', override: true});
const env = {...process.env} as {[key: string]: string};

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: env.CI ? 'github' : 'html',
  forbidOnly: !!env.CI,
  globalTeardown: require.resolve('./e2e/lib/fixtures/global-teardown'),

  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: env.PUBLIC_APP_URL,
    // Collect trace, useful when tests fail.
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: env.PUBLIC_APP_URL,
    reuseExistingServer: !env.CI,
    env,
  },
});
