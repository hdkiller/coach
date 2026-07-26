import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerTaskHandler,
  getTaskHandler,
  hasTaskHandler,
  executeRegisteredTask
} from '../../../../server/utils/task-registry'

describe('Worker Task Execution Registry', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('registers and executes a task handler successfully', async () => {
    const mockHandler = vi.fn().mockResolvedValue({ status: 'PROCESSED', count: 5 })
    registerTaskHandler('test-ingest-task', mockHandler)

    expect(hasTaskHandler('test-ingest-task')).toBe(true)
    expect(getTaskHandler('test-ingest-task')).toBe(mockHandler)

    const result = await executeRegisteredTask('test-ingest-task', { userId: 'user_123' })

    expect(mockHandler).toHaveBeenCalledWith({ userId: 'user_123' }, undefined)
    expect(result).toEqual({ status: 'PROCESSED', count: 5 })
  })

  it('throws an informative error if executing an unregistered task', async () => {
    expect(hasTaskHandler('unregistered-task')).toBe(false)
    await expect(executeRegisteredTask('unregistered-task', {})).rejects.toThrow(
      '[TaskRegistry] No handler registered for task: unregistered-task'
    )
  })
})
