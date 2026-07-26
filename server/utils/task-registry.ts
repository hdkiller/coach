export type TaskHandler<T = any> = (payload: T) => Promise<any>

const registry = new Map<string, TaskHandler>()

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

/**
 * Executes the registered task handler for the given task identifier and payload.
 */
export async function executeRegisteredTask(taskId: string, payload: any): Promise<any> {
  const handler = getTaskHandler(taskId)
  if (!handler) {
    throw new Error(`[TaskRegistry] No handler registered for task: ${taskId}`)
  }
  return await handler(payload)
}
