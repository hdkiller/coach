import type { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly recommendationCard: Locator
  readonly refineButton: Locator
  readonly refineModal: Locator
  readonly refineTextarea: Locator
  readonly refineSubmitButton: Locator
  readonly checkinModal: Locator
  readonly wellnessModal: Locator
  readonly navCalendar: Locator
  readonly navActivities: Locator
  readonly navFitness: Locator
  readonly navChat: Locator

  constructor(page: Page) {
    this.page = page
    this.recommendationCard = page
      .locator('[data-testid="recommendation-card"], .recommendation-card, header')
      .first()
    this.refineButton = page.getByRole('button', { name: /refine|refresh/i }).first()
    this.refineModal = page.locator('[role="dialog"]').first()
    this.refineTextarea = page.locator('textarea').first()
    this.refineSubmitButton = page
      .getByRole('button', { name: /refine|refresh|update|submit/i })
      .first()
    this.checkinModal = page.locator('[role="dialog"], div.fixed.inset-0').first()
    this.wellnessModal = page.locator('[role="dialog"], div.fixed.inset-0').first()
    this.navCalendar = page.getByRole('link', { name: /calendar/i })
    this.navActivities = page.getByRole('link', { name: /activities/i })
    this.navFitness = page.getByRole('link', { name: /fitness|health/i })
    this.navChat = page.getByRole('link', { name: /chat/i })
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async gotoCheckin() {
    await this.page.goto('/dashboard?focus=checkin')
  }

  async gotoWellness() {
    await this.page.goto('/dashboard?focus=wellness')
  }
}
