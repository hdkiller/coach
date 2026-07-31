import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { prisma } from '../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).statusMessage = err.statusMessage || err.message
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    goal: {
      create: vi.fn()
    },
    event: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn()
    }
  }
}))

const getHandler = async () => (await import('../../../../../server/api/goals/index.post')).default

describe('POST /api/goals event IDOR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'attacker-1' } as any)
  })

  it('rejects foreign eventIds and never creates the goal', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([])

    await expect(
      handler({
        body: {
          type: 'EVENT',
          title: 'Stolen race',
          eventIds: ['victim-event-1']
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Not authorized to link one or more events'
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['victim-event-1'] },
        userId: 'attacker-1'
      },
      select: { id: true }
    })
    expect(prisma.goal.create).not.toHaveBeenCalled()
  })

  it('rejects when eventIds mixes owned and foreign ids', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([{ id: 'owned-event-1' }] as any)

    await expect(
      handler({
        body: {
          type: 'EVENT',
          title: 'Mixed events',
          eventIds: ['owned-event-1', 'victim-event-1']
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Not authorized to link one or more events'
    })

    expect(prisma.goal.create).not.toHaveBeenCalled()
  })

  it('rejects a foreign eventId and never creates the goal', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([])

    await expect(
      handler({
        body: {
          type: 'EVENT',
          title: 'Stolen race',
          eventId: 'victim-event-1'
        }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Not authorized to link one or more events'
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['victim-event-1'] },
        userId: 'attacker-1'
      },
      select: { id: true }
    })
    expect(prisma.goal.create).not.toHaveBeenCalled()
  })

  it('links owned eventIds after ownership verification', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'owned-event-1' },
      { id: 'owned-event-2' }
    ] as any)
    vi.mocked(prisma.goal.create).mockResolvedValue({
      id: 'goal-1',
      title: 'My race'
    } as any)

    await expect(
      handler({
        body: {
          type: 'EVENT',
          title: 'My race',
          targetDate: '2026-09-01T00:00:00.000Z',
          eventIds: ['owned-event-1', 'owned-event-2']
        }
      } as any)
    ).resolves.toMatchObject({
      success: true,
      goal: { id: 'goal-1', title: 'My race' }
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['owned-event-1', 'owned-event-2'] },
        userId: 'attacker-1'
      },
      select: { id: true }
    })
    expect(prisma.goal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'attacker-1',
        title: 'My race',
        events: {
          connect: [{ id: 'owned-event-1' }, { id: 'owned-event-2' }]
        }
      })
    })
  })
})
