import { logger, schedules } from '@trigger.dev/sdk/v3'
import { chatTurnService } from '../server/utils/services/chatTurnService'

export const recoverStaleChatTurnsTask = schedules.task({
  id: 'recover-stale-chat-turns',
  cron: '*/5 * * * *',
  run: async () => {
    const interruptedCount = await chatTurnService.markStaleTurnsInterrupted()
    logger.log('[RecoverStaleChatTurns] Sweep finished', { interruptedCount })
    return { interruptedCount }
  }
})
