import { execSync } from 'node:child_process'
import { loadE2eEnv, getE2eRootDir } from './helpers/env.ts'
import { createE2ePrisma, resetDatabase, waitForPostgres } from './helpers/db.ts'
import { seedE2eUsers } from './seed.ts'

async function main() {
  loadE2eEnv()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for E2E database preparation')
  }

  console.log('[e2e] Waiting for Postgres...')
  await waitForPostgres(connectionString)

  const rootDir = getE2eRootDir()
  console.log('[e2e] Applying migrations...')
  execSync('pnpm exec prisma migrate deploy', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  })

  console.log('[e2e] Resetting E2E database tables...')
  await resetDatabase(connectionString)

  const { prisma, pool } = createE2ePrisma(connectionString)

  try {
    console.log('[e2e] Seeding deterministic test users...')
    const users = await seedE2eUsers(prisma)
    console.log('[e2e] Seeded users:', {
      athlete: users.athlete.email,
      admin: users.admin.email
    })
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }

  console.log('[e2e] Database ready.')
}

main().catch((error) => {
  console.error('[e2e] Database preparation failed:', error)
  process.exit(1)
})
