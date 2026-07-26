import { heartbeats, wait } from '@trigger.dev/sdk/v3'
import { getCurrentTaskExecution } from './task-registry'

/** Yield cooperatively in Trigger.dev; Redis jobs already own their worker heartbeat. */
export async function yieldTaskHeartbeat(): Promise<void> {
  if (getCurrentTaskExecution()) return
  await heartbeats.yield()
}

/** Sleep using the active task runtime so cancellation remains observable. */
export async function waitForTaskSeconds(seconds: number): Promise<void> {
  const execution = getCurrentTaskExecution()
  if (!execution) {
    await wait.for({ seconds })
    return
  }

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      execution.signal?.removeEventListener('abort', abort)
      resolve()
    }
    const timer = setTimeout(finish, seconds * 1000)
    const abort = () => {
      clearTimeout(timer)
      reject(execution.signal?.reason || new Error('Task was aborted'))
    }
    if (execution.signal?.aborted) abort()
    else execution.signal?.addEventListener('abort', abort, { once: true })
  })
}
