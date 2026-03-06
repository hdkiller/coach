import { logger, task } from '@trigger.dev/sdk/v3'
import { userBackgroundQueue } from './queues'
import { executeChatTurn } from '../server/utils/chat/turn-executor'

export const executeChatTurnTask = task({
  id: 'execute-chat-turn',
  queue: userBackgroundQueue,
  maxDuration: 300,
  run: async (payload: { turnId: string }) => {
    logger.log('[ExecuteChatTurn] Starting', { turnId: payload.turnId })
    const result = await executeChatTurn(payload.turnId)
    logger.log('[ExecuteChatTurn] Finished', { turnId: payload.turnId, result })
    return result
  }
})
