import type { Page, Locator } from '@playwright/test'

export class CalendarPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly calendarContainer: Locator
  readonly plannedWorkoutCard: Locator
  readonly planOverviewLink: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.calendarContainer = page
      .locator('[data-testid="calendar-view"], .calendar, main, div')
      .first()
    this.plannedWorkoutCard = page
      .locator('[data-testid="planned-workout"], .planned-workout, main a, main div')
      .first()
    this.planOverviewLink = page.getByRole('link', { name: /plan|training plan/i }).first()
  }

  async goto() {
    await this.page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  }

  async gotoPlan() {
    await this.page.goto('/plan', { waitUntil: 'domcontentloaded' })
  }
}
