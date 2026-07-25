import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveTitle(/AI Endurance Coaching/i)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('pricing page renders', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveTitle(/Pricing/i)
  })

  test('login page redirects unauthenticated dashboard access', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome/i)
  })

  test('privacy and terms policy pages render', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/privacy/)

    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/terms/)
  })
})
