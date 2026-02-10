export const sendTelegramMessage = async (
  chatId: string | number,
  text: string,
  parseMode?: 'Markdown' | 'HTML'
) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set')
    return
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  try {
    await ($fetch as any)(url, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
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
    await ($fetch as any)(url, {
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
