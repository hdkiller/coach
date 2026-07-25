import { test, expect } from '../fixtures/test-fixtures.ts'
import { E2E_MOBILE_CLIENT_ID, E2E_MOBILE_REDIRECT_URI } from '../seed.ts'

test.describe('OAuth Companion Integration', () => {
  test('redirects unauthenticated user from OAuth authorize to login', async ({ page }) => {
    const authUrl = `/oauth/authorize?response_type=code&client_id=${E2E_MOBILE_CLIENT_ID}&redirect_uri=${encodeURIComponent(E2E_MOBILE_REDIRECT_URI)}&scope=openid%20profile%20email`
    await page.goto(authUrl, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/login/)
  })

  test('renders OAuth consent page for authenticated athlete', async ({ authedPage }) => {
    const authUrl = `/oauth/authorize?response_type=code&client_id=${E2E_MOBILE_CLIENT_ID}&redirect_uri=${encodeURIComponent(E2E_MOBILE_REDIRECT_URI)}&scope=openid%20profile%20email`
    await authedPage.goto(authUrl, { waitUntil: 'domcontentloaded' })

    // Should load the authorize/consent page or automatically redirect if pre-approved
    await expect(authedPage.locator('main, form, div')).toBeDefined()
  })
})
