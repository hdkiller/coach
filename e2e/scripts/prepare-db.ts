import { execSync } from 'node:child_process'
import { loadE2eEnv, getE2eRootDir } from '../helpers/env.ts'
import { createE2ePrisma, resetDatabase, waitForPostgres } from '../helpers/db.ts'
import { E2E_MOBILE_CLIENT_ID, seedE2eData } from '../seed.ts'

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
    console.log('[e2e] Seeding deterministic E2E fixtures...')
    const seeded = await seedE2eData(prisma)
    console.log('[e2e] Seeded:', {
      athlete: seeded.athlete.email,
      admin: seeded.admin.email,
      mobileClientId: seeded.mobileApp.clientId,
      primaryGoalId: seeded.softActivation.goal.id,
      activePlanId: seeded.softActivation.plan.id,
      todayRecommendationId: seeded.todayRecommendation.id,
      expectedMobileClientId: E2E_MOBILE_CLIENT_ID
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
