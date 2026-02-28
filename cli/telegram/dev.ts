import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'

const devCommand = new Command('dev')
  .description('Run Telegram bot in development mode (polling)')
  .option('-p, --port <number>', 'Local port to forward to', '3000')
  .action(async (options) => {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN_DEV || process.env.TELEGRAM_BOT_TOKEN
    const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
    const port = options.port || process.env.PORT || '3000'
    const LOCAL_URL =
      process.env.LOCAL_URL || `http://localhost:${port}/api/integrations/telegram/webhook`

    if (!TOKEN) {
      console.error(chalk.red('❌ TELEGRAM_BOT_TOKEN_DEV is not set in .env'))
      process.exit(1)
    }

    if (!SECRET) {
      console.error(chalk.red('❌ TELEGRAM_WEBHOOK_SECRET is not set in .env'))
      process.exit(1)
    }

    const TG_BASE = `https://api.telegram.org/bot${TOKEN}`

    console.log(chalk.blue('🔧 Initializing Dev Poller...'))

    // 1. Delete webhook if active
    try {
      const res = await fetch(`${TG_BASE}/deleteWebhook`).then((r) => r.json())
      if (res.ok) {
        console.log(chalk.green('✅ Telegram Webhook cleared (Polling enabled).'))
      } else {
        console.warn(chalk.yellow('⚠️ Failed to clear webhook. It might not be set.'))
      }
    } catch (e: any) {
      console.error(chalk.red('❌ Error connecting to Telegram API:'), e.message)
      process.exit(1)
    }

    console.log(chalk.cyan(`🚀 Forwarding messages to: ${LOCAL_URL}`))
    console.log(chalk.gray('Press Ctrl+C to stop.\n'))

    let lastUpdateId = 0

    const poll = async () => {
      try {
        const url = `${TG_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
        const response = await fetch(url)

        if (!response.ok) {
          console.error(chalk.red(`❌ Telegram API Error: ${response.status}`))
          setTimeout(poll, 5000)
          return
        }

        const data: any = await response.json()
        if (!data.ok) {
          console.error(chalk.red('❌ Telegram API response not OK'), data)
          setTimeout(poll, 5000)
          return
        }

        for (const update of data.result) {
          lastUpdateId = update.update_id
          const message = update.message || update.edited_message || update.callback_query?.message
          const from = message?.from?.first_name || 'Unknown'
          const text = message?.text || '[Non-text update]'

          console.log(chalk.white(`📩 Message from ${chalk.bold(from)}: "${text}"`))

          // Forward to local server
          try {
            const localRes = await fetch(LOCAL_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Bot-Api-Secret-Token': SECRET!
              },
              body: JSON.stringify(update)
            })

            if (localRes.ok) {
              const result = await localRes.json()
              console.log(chalk.green(`  └ ✅ Local Server processed: ${JSON.stringify(result)}`))
            } else {
              const err = await localRes.text()
              console.error(chalk.red(`  └ ❌ Local Server Error (${localRes.status}):`), err)
            }
          } catch (e: any) {
            console.error(
              chalk.red('  └ ❌ Failed to connect to local server. Is it running?'),
              e.message
            )
          }
        }

        // Immediate next poll
        setImmediate(poll)
      } catch (error: any) {
        console.error(chalk.red('💥 Poller loop crashed:'), error.message)
        setTimeout(poll, 5000)
      }
    }

    await poll()
  })

export default devCommand
