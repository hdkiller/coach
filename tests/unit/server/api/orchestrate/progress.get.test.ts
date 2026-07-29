import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'

const activeSyncs = new Map<
  string,
  {
    userId: string
    states: Record<string, unknown>
    startTime: Date
    subscribers: Set<(data: unknown) => void>
  }
>()

const setHeaderMock = vi.fn()

vi.stubGlobal('defineRouteMeta', () => {})

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  setHeader: (...args: unknown[]) => setHeaderMock(...args),
  createError: (err: { message: string; statusCode?: number }) => {
    const error = new Error(err.message)
    ;(error as any).statusCode = err.statusCode
    return error
  }
}))

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/api/orchestrate/full-sync.post', () => ({
  activeSyncs
}))

const getHandler = async () =>
  (await import('../../../../../server/api/orchestrate/progress.get')).default

function createMockEvent() {
  const closeHandlers: Array<() => void> = []
  return {
    node: {
      req: {
        on: (eventName: string, handler: () => void) => {
          if (eventName === 'close') closeHandlers.push(handler)
        }
      }
    },
    _closeHandlers: closeHandlers
  }
}

async function readFirstSseEvent(stream: ReadableStream): Promise<unknown> {
  const reader = stream.getReader()
  const { value } = await reader.read()
  await reader.cancel()

  const text = new TextDecoder().decode(value)
  const dataLine = text.split('\n').find((line) => line.startsWith('data: '))
  if (!dataLine) throw new Error(`No SSE data line in: ${text}`)
  return JSON.parse(dataLine.slice('data: '.length))
}

describe('GET /api/orchestrate/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeSyncs.clear()
    vi.mocked(requireAuth).mockResolvedValue({
      id: 'user-id-123',
      email: 'athlete@example.com'
    } as any)
  })

  it('looks up activeSyncs by user.id (not email) and emits init', async () => {
    const startTime = new Date('2026-07-29T12:00:00.000Z')
    activeSyncs.set('user-id-123', {
      userId: 'user-id-123',
      states: {
        'task-a': { taskId: 'task-a', status: 'running' }
      },
      startTime,
      subscribers: new Set()
    })
    // Email key must NOT match — this is the CW-8 regression
    activeSyncs.set('athlete@example.com', {
      userId: 'wrong',
      states: {},
      startTime,
      subscribers: new Set()
    })

    const handler = await getHandler()
    const event = createMockEvent()
    const stream = (await handler(event as any)) as ReadableStream
    const payload = await readFirstSseEvent(stream)

    expect(payload).toMatchObject({
      type: 'init',
      states: {
        'task-a': { taskId: 'task-a', status: 'running' }
      }
    })
    expect(requireAuth).toHaveBeenCalledWith(event)
  })

  it('returns no_sync when no entry exists for user.id', async () => {
    // Only email-keyed entry present (pre-fix bug shape)
    activeSyncs.set('athlete@example.com', {
      userId: 'athlete@example.com',
      states: { 'task-a': { taskId: 'task-a', status: 'running' } },
      startTime: new Date(),
      subscribers: new Set()
    })

    const handler = await getHandler()
    const stream = (await handler(createMockEvent() as any)) as ReadableStream
    const payload = await readFirstSseEvent(stream)

    expect(payload).toEqual({
      type: 'no_sync',
      message: 'No active sync in progress'
    })
  })
})
