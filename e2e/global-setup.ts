import { loadE2eEnv } from './helpers/env.ts'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export default async function globalSetup() {
  loadE2eEnv()

  execSync('pnpm exec tsx e2e/scripts/prepare-db.ts', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: 'inherit',
    env: process.env
  })
}
