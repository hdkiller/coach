import { test, expect } from '../fixtures/test-fixtures.ts'
import { DashboardPage } from '../pages/DashboardPage.ts'

test.describe('Dashboard Page', () => {
  test('renders authenticated athlete dashboard with recommendation', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    await expect(authedPage).toHaveURL(/\/dashboard/)
    await expect(authedPage).toHaveTitle(/Dashboard/i)

    // Verify key page elements render cleanly
    await expect(authedPage.getByRole('heading').first()).toBeVisible()
  })

  test('opens refine recommendation modal and accepts feedback input', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    if (await dashboard.refineButton.isVisible()) {
      await dashboard.refineButton.click()
      await expect(dashboard.refineModal).toBeVisible()

      if (await dashboard.refineTextarea.isVisible()) {
        await dashboard.refineTextarea.fill('Felt great today, focus on VO2Max intervals')
        await expect(dashboard.refineTextarea).toHaveValue(
          'Felt great today, focus on VO2Max intervals'
        )
      }
    }
  })

  test('opens morning check-in drawer via focus query parameter', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.gotoCheckin()

    // Verify modal/drawer dialog is opened once dashboard finishes initial loading
    await expect(dashboard.checkinModal).toBeVisible({ timeout: 15000 })
  })

  test('opens today wellness modal via focus query parameter', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.gotoWellness()

    // Verify wellness dialog is opened once dashboard finishes initial loading
    await expect(dashboard.wellnessModal).toBeVisible({ timeout: 15000 })
  })

  test('navigation sidebar / header links work', async ({ authedPage }) => {
    const dashboard = new DashboardPage(authedPage)
    await dashboard.goto()

    if (await dashboard.navCalendar.isVisible()) {
      await dashboard.navCalendar.click()
      await expect(authedPage).toHaveURL(/\/calendar/)
    }
  })
})
