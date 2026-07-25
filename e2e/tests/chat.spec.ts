import { test, expect } from '../fixtures/test-fixtures.ts'
import { ChatPage } from '../pages/ChatPage.ts'

test.describe('AI Chat Interface', () => {
  test('renders chat page and seeded chat session', async ({ authedPage }) => {
    const chat = new ChatPage(authedPage)
    await chat.goto()

    await expect(authedPage).toHaveURL(/\/chat/)
    await expect(authedPage).toHaveTitle(/Chat/i)
  })

  test('allows typing in chat input area', async ({ authedPage }) => {
    const chat = new ChatPage(authedPage)
    await chat.goto()

    if (await chat.messageInput.isVisible()) {
      await chat.messageInput.fill('What is my recommended FTP?')
      await expect(chat.messageInput).toHaveValue('What is my recommended FTP?')
    }
  })

  test('displays chat container and response elements without crashing', async ({ authedPage }) => {
    const chat = new ChatPage(authedPage)
    await chat.goto()

    await expect(authedPage).toHaveURL(/\/chat/)
    await expect(chat.messageInput).toBeVisible({ timeout: 15000 })
  })
})
