import type { Page, Locator } from '@playwright/test'

export class NutritionPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly prevDayButton: Locator
  readonly nextDayButton: Locator
  readonly todayButton: Locator
  readonly macroCard: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.prevDayButton = page.getByRole('button', { name: /previous|prev|left/i }).first()
    this.nextDayButton = page.getByRole('button', { name: /next|right/i }).first()
    this.todayButton = page.getByRole('button', { name: /today/i }).first()
    this.macroCard = page.locator('[data-testid="macro-card"], .macro-card, header, div').first()
  }

  async goto(date?: string) {
    const path = date ? `/nutrition/${date}` : '/nutrition'
    await this.page.goto(path, { waitUntil: 'domcontentloaded' })
  }
}
