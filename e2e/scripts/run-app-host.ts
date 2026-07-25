import { spawn } from 'node:child_process'
import { loadE2eEnv, getE2eRootDir } from '../helpers/env.ts'
import { waitForPostgres } from '../helpers/db.ts'
import { getE2eBaseUrl } from '../helpers/app.ts'

/**
 * Host-run E2E app against compose infra (postgres + redis).
 * Useful while iterating without rebuilding Dockerfile.e2e.
 *
 * Prefer the Docker app for CI-like runs: pnpm e2e:setup
 */
async function main() {
  loadE2eEnv()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Copy .env.e2e.example to .env.e2e.')
  }

  console.log('[e2e] Waiting for Postgres (run pnpm e2e:up:infra if needed)...')
  await waitForPostgres(connectionString)

  const port = Number(process.env.E2E_PORT ?? 3199)
  const baseUrl = getE2eBaseUrl()

  process.env.E2E_MODE = 'true'
  process.env.NUXT_AUTH_ORIGIN = process.env.NUXT_AUTH_ORIGIN ?? `${baseUrl}/api/auth`
  process.env.NUXT_PUBLIC_SITE_URL = process.env.NUXT_PUBLIC_SITE_URL ?? `${baseUrl}/`
  process.env.PORT = String(port)
  process.env.HOST = process.env.HOST ?? '0.0.0.0'
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS ?? '--max-old-space-size=8192'
  // Prevent root .env auth bypass from leaking into E2E (breaks login redirect tests).
  delete process.env.AUTH_BYPASS_USER
  delete process.env.AUTH_BYPASS_NAME
  process.env.AUTH_BYPASS_USER = ''
  process.env.AUTH_BYPASS_NAME = ''

  console.log(`[e2e] Starting Nuxt dev on ${baseUrl} (E2E_MODE=true)`)
  console.log('[e2e] Mobile emulators: Android 10.0.2.2:3199 · iOS sim localhost:3199')

  const child = spawn(
    'pnpm',
    ['exec', 'nuxt', 'dev', '--port', String(port), '--host', '0.0.0.0'],
    {
      cwd: getE2eRootDir(),
      stdio: 'inherit',
      env: process.env
    }
  )

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error('[e2e] Host app failed:', error)
  process.exit(1)
})
