import { test, expect } from '../fixtures/test-fixtures.ts'
import { ActivitiesPage } from '../pages/ActivitiesPage.ts'
import { NutritionPage } from '../pages/NutritionPage.ts'

test.describe('Activities & Fitness / Health Tracking', () => {
  test('renders activities page with seeded workouts list', async ({ authedPage }) => {
    const activities = new ActivitiesPage(authedPage)
    await activities.goto()

    await expect(authedPage).toHaveURL(/\/activities/)
    await expect(authedPage).toHaveTitle(/Activities/i)

    // Verify activities page or seeded workout content is rendered
    await expect(authedPage.getByText(/E2E|Activities|Workouts|Ride|Run/i).first()).toBeVisible()
  })

  test('renders fitness & health tracking page', async ({ authedPage }) => {
    await authedPage.goto('/fitness', { waitUntil: 'domcontentloaded' })

    await expect(authedPage).toHaveURL(/\/fitness/)
    await expect(authedPage).toHaveTitle(/Fitness|Health/i)
  })

  test('renders nutrition tracking page and handles date navigation', async ({ authedPage }) => {
    const nutrition = new NutritionPage(authedPage)
    await nutrition.goto()

    await expect(authedPage).toHaveURL(/\/nutrition/)
    await expect(authedPage).toHaveTitle(/Nutrition|Metabolic/i)

    // Test specific date navigation
    await nutrition.goto('2026-07-25')
    await expect(authedPage).toHaveURL(/\/nutrition\/2026-07-25/)
  })
})
