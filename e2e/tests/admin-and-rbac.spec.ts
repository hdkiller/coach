import { test, expect } from '../fixtures/test-fixtures.ts'
import { AdminPage } from '../pages/AdminPage.ts'

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
})
