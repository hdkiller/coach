import type { Page, Locator } from '@playwright/test'

export class GoalsPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly addGoalButton: Locator
  readonly goalCard: Locator
  readonly wizardContainer: Locator
  readonly wizardModal: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.addGoalButton = page.getByRole('button', { name: /add goal|new goal|create/i }).first()
    this.goalCard = page.locator('[data-testid="goal-card"], .goal-card, main, div').first()
    this.wizardContainer = page
      .getByRole('heading', { name: /training for/i })
      .or(page.locator('[role="dialog"]').or(page.locator('form')))
      .first()
    this.wizardModal = this.wizardContainer
  }

  async goto() {
    await this.page.goto('/profile/goals')
  }

  async gotoWizard() {
    await this.page.goto('/profile/goals?new=true')
  }
}
