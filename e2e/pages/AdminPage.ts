import type { Page, Locator } from '@playwright/test'

export class AdminPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly newMessageButton: Locator
  readonly messagesTable: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.newMessageButton = page.getByRole('button', { name: /new message|create/i }).first()
    this.messagesTable = page.locator('table, [role="table"], main').first()
  }

  async gotoSystemMessages() {
    await this.page.goto('/admin/system-messages', { waitUntil: 'domcontentloaded' })
  }

  async gotoDebugEnv() {
    await this.page.goto('/admin/debug/env', { waitUntil: 'domcontentloaded' })
  }

  async gotoStatsLlm() {
    await this.page.goto('/admin/stats/llm', { waitUntil: 'domcontentloaded' })
  }
}
