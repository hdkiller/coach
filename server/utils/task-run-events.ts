import { sendToUser } from './ws-state'

type TriggerHandleLike = {
  id: string
}

export async function publishTaskRunStartedEvent(
  userId: string,
  taskIdentifier: string,
  handle: TriggerHandleLike,
  options: {
    startedAt?: string
    tags?: string[]
    status?: string
  } = {}
) {
  await sendToUser(userId, {
    type: 'run_update',
    channel: 'task_run',
    runId: handle.id,
    taskIdentifier,
    status: options.status || 'QUEUED',
    startedAt: options.startedAt || new Date().toISOString(),
    tags: options.tags || [`user:${userId}`]
  })
}
