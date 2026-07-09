import { expect, test } from '@nuxt/test-utils/playwright'
import { getSessionUser, loginAs } from '../helpers/auth.ts'

test.describe('authenticated flows', () => {
  test('E2E login API creates a session and opens dashboard', async ({ page, goto }) => {
    await loginAs(page)

    const session = await getSessionUser(page)
    expect(session?.user?.email).toBe(process.env.E2E_TEST_USER_EMAIL)

    await goto('/dashboard', { waitUntil: 'hydration' })

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).toHaveTitle(/Dashboard/i)
  })
})
