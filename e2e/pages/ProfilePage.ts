import type { Page, Locator } from '@playwright/test'

export class ProfilePage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly athleteProfileCard: Locator
  readonly refreshProfileButton: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.athleteProfileCard = page
      .locator('[data-testid="athlete-profile"], .athlete-profile, main, div')
      .first()
    this.refreshProfileButton = page
      .getByRole('button', { name: /refresh|re-generate|update/i })
      .first()
  }

  async goto() {
    await this.page.goto('/profile', { waitUntil: 'domcontentloaded' })
  }
}
