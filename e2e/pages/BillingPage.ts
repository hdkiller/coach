import type { Page, Locator } from '@playwright/test'

export class BillingPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly currentPlanCard: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.currentPlanCard = page
      .locator('[data-testid="billing-card"], .billing-card, main, div')
      .first()
  }

  async goto() {
    await this.page.goto('/settings/billing', { waitUntil: 'domcontentloaded' })
  }
}
