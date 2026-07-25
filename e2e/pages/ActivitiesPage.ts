import type { Page, Locator } from '@playwright/test'

export class ActivitiesPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly workoutList: Locator
  readonly searchInput: Locator
  readonly fitnessLink: Locator
  readonly nutritionLink: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1, name: /activities/i })
    this.workoutList = page.locator('main, [data-testid="activities-list"], .activities-list')
    this.searchInput = page.getByPlaceholder(/search|filter/i).first()
    this.fitnessLink = page.getByRole('link', { name: /fitness/i }).first()
    this.nutritionLink = page.getByRole('link', { name: /nutrition/i }).first()
  }

  async goto() {
    await this.page.goto('/activities', { waitUntil: 'domcontentloaded' })
  }
}
