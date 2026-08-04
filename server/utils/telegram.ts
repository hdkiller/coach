export interface TelegramMessageOptions {
  parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown'
  disable_web_page_preview?: boolean
  disable_notification?: boolean
  reply_to_message_id?: number
}

export async function sendTelegramAction(chatId: string | number, action: string) {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token) return false

  try {
    const response = await $fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        action
      }
    })
    return response
  } catch (error) {
    console.error('[Telegram] Failed to send action:', error)
    return false
  }
}

export async function sendTelegramMessage(
  textOrChatId: string | number,
  chatIdOrText?: string | number,
  optionsOrParseMode?: TelegramMessageOptions | 'Markdown' | 'HTML'
) {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token) {
    console.warn('[Telegram] Skipping message send: TELEGRAM_BOT_TOKEN is not configured.')
    return false
  }

  let actualChatId: string | number = config.telegramAdminChatId
  let actualText: string
  let actualOptions: TelegramMessageOptions = { parse_mode: 'HTML' }

  // Detect signature:
  // Signature 1 (Legacy): sendTelegramMessage(chatId, text, 'Markdown')
  // Signature 2 (New): sendTelegramMessage(text, chatId, options)

  // A chatId is usually numeric or a string of numbers.
  // We can also just check if the first argument looks like a chatId (starts with number or '-')
  // and the second argument exists and is a string.
  const str1 = String(textOrChatId)
  if (chatIdOrText !== undefined) {
    const str2 = String(chatIdOrText)
    if (/^-?\d+$/.test(str1) && str2.length > 0) {
      // Signature 1
      actualChatId = textOrChatId
      actualText = str2
    } else {
      // Signature 2
      actualText = str1
      actualChatId = chatIdOrText
    }
  } else {
    // Only 1 arg (text)
    actualText = str1
  }

  if (typeof optionsOrParseMode === 'string') {
    actualOptions.parse_mode = optionsOrParseMode as any
  } else if (optionsOrParseMode) {
    actualOptions = { ...actualOptions, ...optionsOrParseMode }
  }

  if (!actualChatId) {
    console.warn(
      '[Telegram] Skipping message send: No chatId provided and TELEGRAM_ADMIN_CHAT_ID is not configured.'
    )
    return false
  }

  try {
    const response = await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: actualChatId,
        text: actualText,
        ...actualOptions
      }
    })
    return response
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error)
    return false
  }
}
