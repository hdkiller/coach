import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('../..', import.meta.url))

export function loadE2eEnv() {
  const envPath = resolve(rootDir, '.env.e2e')
  const examplePath = resolve(rootDir, '.env.e2e.example')

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: true })
    return envPath
  }

  if (existsSync(examplePath)) {
    loadEnv({ path: examplePath, override: true })
    return examplePath
  }

  throw new Error(
    'Missing E2E env file. Copy .env.e2e.example to .env.e2e and adjust if needed.'
  )
}

export function getE2eRootDir() {
  return rootDir
}
