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
  return publishTaskRunUpdateEvent(userId, taskIdentifier, handle.id, {
    status: options.status || 'QUEUED',
    startedAt: options.startedAt,
    tags: options.tags
  })
}

export async function publishTaskRunUpdateEvent(
  userId: string,
  taskIdentifier: string,
  runId: string,
  options: {
    status: string
    startedAt?: string
    finishedAt?: string
    tags?: string[]
    output?: unknown
    error?: unknown
  }
) {
  await sendToUser(userId, {
    type: 'run_update',
    channel: 'task_run',
    runId,
    taskIdentifier,
    status: options.status,
    startedAt: options.startedAt || new Date().toISOString(),
    ...(options.finishedAt ? { finishedAt: options.finishedAt } : {}),
    ...(options.output !== undefined ? { output: options.output } : {}),
    ...(options.error !== undefined ? { error: options.error } : {}),
    tags: options.tags || [`user:${userId}`]
  })
}
