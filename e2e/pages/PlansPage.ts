import type { Page, Locator } from '@playwright/test'

export class PlansPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly planCard: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.planCard = page.locator('[data-testid="plan-card"], .plan-card, main a, main div').first()
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'domcontentloaded' })
  }

  async gotoLibrary() {
    await this.page.goto('/training-plans', { waitUntil: 'domcontentloaded' })
  }
}
