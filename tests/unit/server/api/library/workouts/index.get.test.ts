import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../../server/utils/session'
import { prisma } from '../../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../../server/utils/db', () => ({
  prisma: {
    workoutTemplate: {
      findMany: vi.fn()
    }
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../../server/api/library/workouts/index.get')
  return mod.default
}

describe('GET /api/library/workouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns athlete templates by default', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'athlete-1' } } as any)
    vi.mocked(prisma.workoutTemplate.findMany).mockResolvedValue([
      { id: 'tpl-1', userId: 'athlete-1', title: 'Athlete ride' }
    ] as any)

    const handler = await getHandler()
    const result = await handler({ query: {} } as any)

    expect(prisma.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['athlete-1'] } }
      })
    )
    expect(result[0]).toMatchObject({
      id: 'tpl-1',
      ownerScope: 'athlete',
      ownerUserId: 'athlete-1'
    })
  })

  it('groups coach and athlete templates for all scope in coaching mode', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'athlete-1',
        originalUserId: 'coach-1',
        isCoaching: true
      }
    } as any)
    vi.mocked(prisma.workoutTemplate.findMany).mockResolvedValue([
      { id: 'tpl-coach', userId: 'coach-1', title: 'Coach ride' },
      { id: 'tpl-athlete', userId: 'athlete-1', title: 'Athlete ride' }
    ] as any)

    const handler = await getHandler()
    const result = await handler({ query: { scope: 'all' } } as any)

    expect(prisma.workoutTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['coach-1', 'athlete-1'] } }
      })
    )
    expect(result.coach[0]).toMatchObject({
      id: 'tpl-coach',
      ownerScope: 'coach'
    })
    expect(result.athlete[0]).toMatchObject({
      id: 'tpl-athlete',
      ownerScope: 'athlete'
    })
  })
})
