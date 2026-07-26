import { test, expect } from '../fixtures/test-fixtures.ts'
import { AdminPage } from '../pages/AdminPage.ts'
import { DashboardPage } from '../pages/DashboardPage.ts'
import { createE2ePrisma } from '../helpers/db.ts'
import { E2E_ATHLETE_EMAIL } from '../seed.ts'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coach_wattz_e2e'

test.describe('Admin Suite & RBAC', () => {
  test('denies non-admin athlete access to /admin', async ({ authedPage }) => {
    await authedPage.goto('/admin', { waitUntil: 'domcontentloaded' })

    // Non-admin user should either be redirected to dashboard or see 403 / Access Denied
    const url = authedPage.url()
    const isRedirectedOrForbidden =
      url.includes('/dashboard') ||
      (await authedPage.getByText(/403|access denied|unauthorized/i).isVisible())
    expect(isRedirectedOrForbidden).toBeTruthy()
  })

  test('allows admin user to access /admin pages', async ({ adminPage }) => {
    const admin = new AdminPage(adminPage)
    await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(adminPage).toHaveURL(/\/admin/)

    // Test system messages management
    await admin.gotoSystemMessages()
    await expect(adminPage).toHaveURL(/\/admin\/system-messages/)

    // Test Admin Debug Environment page
    await admin.gotoDebugEnv()
    await expect(adminPage).toHaveURL(/\/admin\/debug\/env/)

    // Test Admin LLM Stats page
    await admin.gotoStatsLlm()
    await expect(adminPage).toHaveURL(/\/admin\/stats\/llm/)
  })

  test('admin system message creation, athlete banner display, and dismissal persistence', async ({
    authedPage
  }) => {
    const db = createE2ePrisma(DATABASE_URL)
    const prisma = db.prisma

    // Clean up any pre-existing messages to ensure deterministic top candidate
    await prisma.userSystemMessageDismissal.deleteMany({})
    await prisma.systemMessage.deleteMany({})

    // Ensure athlete user createdAt is strictly in the past to avoid clock-skew age filter issues
    await prisma.user.update({
      where: { email: E2E_ATHLETE_EMAIL },
      data: { createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })

    const msgTitle = `System Maintenance Alert ${Date.now()}`
    const msgContent = 'Scheduled maintenance tonight at 02:00 UTC.'

    // 1. Create system message directly in DB
    const message = await prisma.systemMessage.create({
      data: {
        title: msgTitle,
        content: msgContent,
        type: 'WARNING',
        isActive: true,
        minUserAgeDays: 0
      }
    })
    expect(message?.id).toBeTruthy()

    // Debug: verify endpoint returns the message for athlete
    const latestRes = await authedPage.request.get('/api/system-messages/latest')
    const latestJson = await latestRes.json()
    expect(latestJson.message?.id).toBe(message.id)

    // 2. Athlete navigates to /dashboard and waits for system message fetch
    const responsePromise = authedPage.waitForResponse((resp) =>
      resp.url().includes('/api/system-messages/latest')
    )
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()
    await responsePromise

    // 3. Banner displays on athlete dashboard
    const bannerTitle = authedPage.getByText(msgTitle)
    await expect(bannerTitle).toBeVisible()

    // 4. Click dismiss button on banner
    const closeButton = authedPage
      .locator('button[aria-label*="close" i], button:has(.i-heroicons-x-mark-20-solid)')
      .first()
    await closeButton.click()

    // 5. Banner disappears from UI
    await expect(bannerTitle).not.toBeVisible()

    // 6. Verify UserSystemMessageDismissal record in DB
    const athlete = await prisma.user.findFirst({ where: { email: E2E_ATHLETE_EMAIL } })
    const dismissal = await prisma.userSystemMessageDismissal.findFirst({
      where: {
        userId: athlete!.id,
        systemMessageId: message.id
      }
    })
    expect(dismissal).toBeTruthy()

    // Cleanup
    await prisma.userSystemMessageDismissal.deleteMany({ where: { systemMessageId: message.id } })
    await prisma.systemMessage.delete({ where: { id: message.id } })
    await db.pool.end()
    await prisma.$disconnect()
  })
})
