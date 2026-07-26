import { AsyncLocalStorage } from 'node:async_hooks'

export interface TaskExecutionContext {
  runId?: string
  signal?: AbortSignal
  attemptNumber?: number
  maxAttempts?: number
}

export type TaskHandler<T = any> = (payload: T, context?: TaskExecutionContext) => Promise<any>

const registry = new Map<string, TaskHandler>()
const executionStorage = new AsyncLocalStorage<{
  taskId: string
  runId?: string
  signal?: AbortSignal
}>()

/**
 * Registers a task handler function for execution by BullMQ workers or fallback drivers.
 */
export function registerTaskHandler<T = any>(taskId: string, handler: TaskHandler<T>): void {
  const existing = registry.get(taskId)
  if (existing && existing !== handler) {
    throw new Error(`[TaskRegistry] Duplicate handler registered for task: ${taskId}`)
  }
  registry.set(taskId, handler)
}

/** Replaces a compatibility handler with the canonical Trigger task run function. */
export function registerCanonicalTaskHandler<T = any>(
  taskId: string,
  handler: TaskHandler<T>
): void {
  registry.set(taskId, handler)
}

export function getRegisteredTaskIds(): string[] {
  return Array.from(registry.keys()).sort()
}

/**
 * Retrieves the registered task handler for a given task identifier.
 */
export function getTaskHandler<T = any>(taskId: string): TaskHandler<T> | undefined {
  return registry.get(taskId) as TaskHandler<T> | undefined
}

/**
 * Returns true if a task handler has been registered for the specified task identifier.
 */
export function hasTaskHandler(taskId: string): boolean {
  return registry.has(taskId)
}

export function getCurrentTaskExecution():
  { taskId: string; runId?: string; signal?: AbortSignal } | undefined {
  return executionStorage.getStore()
}

/**
 * Executes the registered task handler for the given task identifier and payload.
 */
export async function executeRegisteredTask(
  taskId: string,
  payload: any,
  context?: TaskExecutionContext
): Promise<any> {
  const handler = getTaskHandler(taskId)
  if (!handler) {
    throw new Error(`[TaskRegistry] No handler registered for task: ${taskId}`)
  }
  return await executionStorage.run(
    { taskId, runId: context?.runId, signal: context?.signal },
    () => handler(payload, context)
  )
}
