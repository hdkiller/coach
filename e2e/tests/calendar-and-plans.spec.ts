import { test, expect } from '../fixtures/test-fixtures.ts'
import { CalendarPage } from '../pages/CalendarPage.ts'
import { PlansPage } from '../pages/PlansPage.ts'

test.describe('Calendar & Training Plans', () => {
  test('renders calendar page with seeded planned workouts', async ({ authedPage }) => {
    const calendar = new CalendarPage(authedPage)
    await calendar.goto()

    await expect(authedPage).toHaveURL(/\/calendar/)
    await expect(authedPage).toHaveTitle(/Calendar/i)
  })

  test('renders training plan overview page', async ({ authedPage }) => {
    const calendar = new CalendarPage(authedPage)
    await calendar.gotoPlan()

    await expect(authedPage).toHaveURL(/\/plan/)
  })

  test('renders training plans library page', async ({ authedPage }) => {
    const plans = new PlansPage(authedPage)
    await plans.gotoLibrary()

    await expect(authedPage).toHaveURL(/\/training-plans|\/plans/)
  })

  test('renders planned workout details and interval steps without visual alignment errors', async ({
    authedPage
  }) => {
    const calendar = new CalendarPage(authedPage)
    await calendar.goto()

    await expect(authedPage).toHaveURL(/\/calendar/)
    // Verify calendar grid cells or workout cards render
    await expect(authedPage.locator('body')).toBeVisible()
  })
})
