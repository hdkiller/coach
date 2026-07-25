import type { Page, Locator } from '@playwright/test'

export class SettingsPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly tabApps: Locator
  readonly tabAiCoach: Locator
  readonly tabBilling: Locator
  readonly tabDeveloper: Locator
  readonly tabDangerZone: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.tabApps = page.getByRole('link', { name: /connected apps|apps/i }).first()
    this.tabAiCoach = page.getByRole('link', { name: /ai coach/i }).first()
    this.tabBilling = page.getByRole('link', { name: /billing/i }).first()
    this.tabDeveloper = page.getByRole('link', { name: /developer/i }).first()
    this.tabDangerZone = page.getByRole('link', { name: /danger zone/i }).first()
  }

  async goto(tab: 'apps' | 'ai' | 'developer' | 'danger' = 'apps') {
    await this.page.goto(`/settings/${tab}`, { waitUntil: 'domcontentloaded' })
  }
}
