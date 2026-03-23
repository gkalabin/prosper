import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({path: '.env.e2e', override: true});
const env = {...process.env} as {[key: string]: string};

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: env.CI ? 'github' : 'html',
  forbidOnly: !!env.CI,
  globalTeardown: require.resolve('./e2e/lib/fixtures/global-teardown'),

  use: {
    baseURL: env.PUBLIC_APP_URL,
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: env.E2E_DOCKER_IMAGE
      ? `docker run --rm --network host --env-file .env.e2e ${env.E2E_DOCKER_IMAGE}`
      : 'bash scripts/e2e-server.sh',
    url: env.PUBLIC_APP_URL,
    reuseExistingServer: !env.CI,
    env,
    timeout: 180_000,
  },
});
