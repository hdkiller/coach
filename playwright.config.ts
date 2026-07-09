import { loadE2eEnv } from './helpers/env.ts'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

loadE2eEnv()

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const e2ePort = Number(process.env.E2E_PORT ?? 3199)

export default defineConfig<ConfigOptions>({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: fileURLToPath(new URL('./e2e/global-setup.ts', import.meta.url)),
  use: {
    trace: 'on-first-retry',
    nuxt: {
      rootDir,
      port: e2ePort,
      env: {
        ...process.env,
        E2E_MODE: 'true',
        NUXT_AUTH_ORIGIN: `http://localhost:${e2ePort}/api/auth`,
        NUXT_PUBLIC_SITE_URL: `http://localhost:${e2ePort}/`
      }
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
