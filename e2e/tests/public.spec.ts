import { expect, test } from '@nuxt/test-utils/playwright'

test.describe('public pages', () => {
  test('landing page renders', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    await expect(page).toHaveTitle(/AI Endurance Coaching/i)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('pricing page renders', async ({ page, goto }) => {
    await goto('/pricing', { waitUntil: 'hydration' })

    await expect(page).toHaveTitle(/Pricing/i)
  })

  test('login page redirects unauthenticated dashboard access', async ({ page, goto }) => {
    await goto('/dashboard', { waitUntil: 'hydration' })

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome/i)
  })
})
