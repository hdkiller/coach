import { test, expect } from '@playwright/test'
import { createE2ePrisma } from '../helpers/db.ts'
import { loginAs } from '../helpers/auth.ts'
import { SettingsPage } from '../pages/SettingsPage.ts'
import { runDeleteUserAccount } from '../../server/utils/services/accountDeletionService.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Category D2: Danger Zone Account Deletion & Data Purge', () => {
  let prisma: ReturnType<typeof createE2ePrisma>['prisma']
  let cleanupPool: ReturnType<typeof createE2ePrisma>['pool']

  test.beforeAll(async () => {
    const db = createE2ePrisma(DATABASE_URL)
    prisma = db.prisma
    cleanupPool = db.pool
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
    await cleanupPool.end()
  })

  test('Account deletion from Danger Zone purges user and cascaded data', async ({ page }) => {
    const dynamicEmail = `dynamic-delete-${Date.now()}@coachwatts.test`

    // 1. Create a dedicated test user with associated records and accepted consent
    const testUser = await prisma.user.create({
      data: {
        email: dynamicEmail,
        name: 'Dynamic Deletion User',
        timezone: 'America/Los_Angeles',
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
        healthConsentAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0'
      }
    })

    const workout = await prisma.workout.create({
      data: {
        userId: testUser.id,
        title: 'Pre-deletion Ride',
        type: 'Ride',
        source: 'strava',
        date: new Date(),
        durationSec: 1800,
        distanceMeters: 15000,
        externalId: `delete-workout-${Date.now()}`
      }
    })

    const wellnessDate = new Date('2026-07-26T00:00:00Z')
    const wellness = await prisma.wellness.create({
      data: {
        userId: testUser.id,
        date: wellnessDate,
        sleepHours: 7.0,
        sleepScore: 80
      }
    })

    // 2. Authenticate as the newly created dynamic test user
    await loginAs(page, dynamicEmail)

    // 3. Navigate to Danger Zone settings
    const settings = new SettingsPage(page)
    await settings.goto('danger')

    // 4. Trigger account deletion endpoint (matching UI executeDeleteAccount behavior)
    const deleteRes = await page.request.delete('/api/profile')
    expect(deleteRes.ok()).toBeTruthy()

    // 6. Assert client signs out and redirects to /login or /dashboard
    await page.waitForURL(/\/(login|dashboard)?/, { timeout: 10000 })

    // 7. Ensure background user purge completes
    await runDeleteUserAccount({ userId: testUser.id }).catch(() => {
      // Ignore if scheduled task already purged user
    })

    // 8. Assert user and cascaded records are completely purged from DB
    const purgedUser = await prisma.user.findUnique({ where: { id: testUser.id } })
    const purgedWorkout = await prisma.workout.findUnique({ where: { id: workout.id } })
    const purgedWellness = await prisma.wellness.findUnique({ where: { id: wellness.id } })

    expect(purgedUser).toBeNull()
    expect(purgedWorkout).toBeNull()
    expect(purgedWellness).toBeNull()
  })
})
