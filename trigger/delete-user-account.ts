import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userBackgroundQueue } from './queues'
import { runDeleteUserAccount } from '../server/utils/services/accountDeletionService'

export const deleteUserAccountTask = task({
  id: 'delete-user-account',
  queue: userBackgroundQueue,
  maxDuration: 600, // 10 minutes for heavy deletion
  run: async (payload: {
    userId: string
    notificationEmail?: {
      requestedAt: string
      initiatedBy: 'self' | 'admin'
      actorEmail?: string | null
    }
  }) => {
    logger.log('Starting user account deletion via Trigger.dev', { userId: payload.userId })
    return await runDeleteUserAccount(payload)
  }
})
