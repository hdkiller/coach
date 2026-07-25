import { loadE2eEnv } from './e2e/helpers/env.ts'
import { getE2eBaseUrl } from './e2e/helpers/app.ts'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

loadE2eEnv()

const baseURL = getE2eBaseUrl()

export default defineConfig({
  testDir: './e2e/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: fileURLToPath(new URL('./e2e/global-setup.ts', import.meta.url)),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
