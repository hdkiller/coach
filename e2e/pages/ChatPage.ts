import type { Page, Locator } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly newChatButton: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page
      .locator('textarea, input[placeholder*="Ask"], input[placeholder*="Message"]')
      .first()
    this.sendButton = page.locator('button[type="submit"], button:has-text("Send")').first()
    this.messageList = page.locator('.chat-messages, [data-testid="chat-messages"]')
    this.newChatButton = page.getByRole('button', { name: /new chat/i }).first()
  }

  async goto() {
    await this.page.goto('/chat', { waitUntil: 'domcontentloaded' })
  }
}
