import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.resolve(__dirname, 'e2e.env'), override: true});
const env = {...process.env} as {[key: string]: string};

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  reporter: env.CI ? 'github' : 'html',
  forbidOnly: !!env.CI,
  globalTeardown: require.resolve('./lib/fixtures/global-teardown'),

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
      ? `docker run --rm --network host --env-file ${path.resolve(__dirname, 'e2e.env')} ${env.E2E_DOCKER_IMAGE}`
      : 'bash start.sh',
    url: env.PUBLIC_APP_URL,
    reuseExistingServer: !env.CI,
    env,
    timeout: 180_000,
  },
});
