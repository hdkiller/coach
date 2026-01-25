export const sendTelegramMessage = async (chatId: string | number, text: string) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set')
    return
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  try {
    await $fetch(url, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: text
        // We avoid parse_mode='Markdown' initially to prevent crashes on unescaped chars
        // parse_mode: 'Markdown'
      }
    })
  } catch (error: any) {
    console.error('[Telegram] Send failed:', error.data || error.message)
  }
}

export const sendTelegramAction = async (chatId: string | number, action: string = 'typing') => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const url = `https://api.telegram.org/bot${token}/sendChatAction`
  try {
    await $fetch(url, {
      method: 'POST',
      body: {
        chat_id: chatId,
        action
      }
    })
  } catch (error) {
    // Ignore action errors
  }
}
