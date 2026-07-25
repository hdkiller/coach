import { test, expect } from '../fixtures/test-fixtures.ts'
import { SettingsPage } from '../pages/SettingsPage.ts'
import { ProfilePage } from '../pages/ProfilePage.ts'
import { GoalsPage } from '../pages/GoalsPage.ts'
import { BillingPage } from '../pages/BillingPage.ts'

test.describe('Settings & Profile Management', () => {
  test('renders user settings page and navigates tabs', async ({ authedPage }) => {
    const settings = new SettingsPage(authedPage)
    await settings.goto('apps')

    await expect(authedPage).toHaveURL(/\/settings\/apps|\/settings/)
    await expect(authedPage).toHaveTitle(/Settings|Connected Apps/i)

    // Test navigation to AI Coach tab
    await settings.goto('ai')
    await expect(authedPage).toHaveURL(/\/settings\/ai/)

    // Test navigation to Developer tab
    await settings.goto('developer')
    await expect(authedPage).toHaveURL(/\/settings\/developer/)
  })

  test('renders billing and subscription management page', async ({ authedPage }) => {
    const billing = new BillingPage(authedPage)
    await billing.goto()

    await expect(authedPage).toHaveURL(/\/settings\/billing/)
  })

  test('renders user profile page', async ({ authedPage }) => {
    const profile = new ProfilePage(authedPage)
    await profile.goto()

    await expect(authedPage).toHaveURL(/\/profile/)
  })

  test('renders user goals page and opens goal wizard modal', async ({ authedPage }) => {
    const goals = new GoalsPage(authedPage)
    await goals.goto()

    await expect(authedPage).toHaveURL(/\/profile\/goals/)

    // Open Goal Wizard via query parameter or button
    await goals.gotoWizard()
    await expect(goals.wizardModal).toBeVisible({ timeout: 15000 })
  })
})
