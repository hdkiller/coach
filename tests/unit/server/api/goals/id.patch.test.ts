import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { prisma } from '../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    goal: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    event: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    }
  }
}))

const getHandler = async () => (await import('../../../../../server/api/goals/[id].patch')).default

const ownedGoal = {
  id: 'goal-1',
  userId: 'attacker-1',
  events: []
}

describe('PATCH /api/goals/:id event IDOR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'attacker-1' } as any)
    vi.mocked(prisma.goal.findUnique).mockResolvedValue(ownedGoal as any)
  })

  it('rejects foreign eventIds and never updates the goal', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([])

    await expect(
      handler({
        context: { params: { id: 'goal-1' } },
        body: { eventIds: ['victim-event-1'] }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Not authorized to link one or more events'
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['victim-event-1'] },
        userId: 'attacker-1'
      },
      select: { id: true }
    })
    expect(prisma.goal.update).not.toHaveBeenCalled()
  })

  it('rejects when eventIds mixes owned and foreign ids', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([{ id: 'owned-event-1' }] as any)

    await expect(
      handler({
        context: { params: { id: 'goal-1' } },
        body: { eventIds: ['owned-event-1', 'victim-event-1'] }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Not authorized to link one or more events'
    })

    expect(prisma.goal.update).not.toHaveBeenCalled()
  })

  it('rejects a foreign eventId and never updates the goal', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([])

    await expect(
      handler({
        context: { params: { id: 'goal-1' } },
        body: { eventId: 'victim-event-1' }
      } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Not authorized to link one or more events'
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['victim-event-1'] },
        userId: 'attacker-1'
      },
      select: { id: true }
    })
    expect(prisma.goal.update).not.toHaveBeenCalled()
  })

  it('links owned eventIds after ownership verification', async () => {
    const handler = await getHandler()
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: 'owned-event-1' },
      { id: 'owned-event-2' }
    ] as any)
    vi.mocked(prisma.goal.update).mockResolvedValue({
      id: 'goal-1',
      userId: 'attacker-1'
    } as any)

    await expect(
      handler({
        context: { params: { id: 'goal-1' } },
        body: { eventIds: ['owned-event-1', 'owned-event-2'] }
      } as any)
    ).resolves.toMatchObject({
      success: true,
      goal: { id: 'goal-1' }
    })

    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      data: expect.objectContaining({
        events: {
          set: [{ id: 'owned-event-1' }, { id: 'owned-event-2' }]
        }
      })
    })
  })
})
