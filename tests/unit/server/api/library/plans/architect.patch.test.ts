import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../../server/utils/session'
import { prisma } from '../../../../../../server/utils/db'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, name: string) => event.params?.[name])
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).data = err.data
  return error
})

vi.mock('../../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../../server/utils/db', () => ({
  prisma: {
    trainingPlan: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    trainingBlock: {
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    trainingWeek: {
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    plannedWorkout: {
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.mock('../../../../../../shared/structured-workout-contract', () => ({
  adaptStructuredWorkout: vi.fn((structure: any) => structure)
}))

vi.mock('../../../../../../server/utils/canonical-planned-workout-write', () => ({
  buildTemplateStructureWriteData: vi.fn(() => null)
}))

vi.mock('../../../../../../server/utils/repositories/sportSettingsRepository', () => ({
  sportSettingsRepository: {
    getForActivityType: vi.fn().mockResolvedValue({})
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../../server/api/library/plans/[id]/architect.patch')
  return mod.default
}

const attackerPlan = {
  id: 'plan-attacker',
  userId: 'attacker-1',
  blocks: [
    {
      id: 'block-attacker',
      weeks: [
        {
          id: 'week-attacker',
          workouts: [{ id: 'workout-attacker' }]
        }
      ]
    }
  ]
}

const baseBlockPayload = {
  name: 'Base',
  type: 'BASE',
  primaryFocus: 'endurance',
  durationWeeks: 1,
  order: 0,
  weeks: [
    {
      weekNumber: 1,
      volumeTargetMinutes: 300,
      tssTarget: 200,
      focus: null,
      workouts: [
        {
          dayIndex: 0,
          weekIndex: 1,
          title: 'Easy',
          description: null,
          type: 'Ride',
          durationSec: 3600,
          tss: 40,
          category: 'endurance',
          structuredWorkout: null
        }
      ]
    }
  ]
}

describe('PATCH /api/library/plans/:id/architect IDOR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'attacker-1' } } as any)
    vi.mocked(prisma.trainingPlan.findUnique).mockResolvedValue(attackerPlan as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))
  })

  it('rejects a foreign block id and never updates it', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        params: { id: 'plan-attacker' },
        body: {
          blocks: [
            {
              ...baseBlockPayload,
              id: 'block-victim'
            }
          ]
        }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: 'Block not found' })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.trainingBlock.update).not.toHaveBeenCalled()
  })

  it('rejects a foreign week id and never updates it', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        params: { id: 'plan-attacker' },
        body: {
          blocks: [
            {
              ...baseBlockPayload,
              id: 'block-attacker',
              weeks: [
                {
                  ...baseBlockPayload.weeks[0],
                  id: 'week-victim'
                }
              ]
            }
          ]
        }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: 'Week not found' })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.trainingWeek.update).not.toHaveBeenCalled()
  })

  it('rejects a foreign workout id and never updates it', async () => {
    const handler = await getHandler()

    await expect(
      handler({
        params: { id: 'plan-attacker' },
        body: {
          blocks: [
            {
              ...baseBlockPayload,
              id: 'block-attacker',
              weeks: [
                {
                  ...baseBlockPayload.weeks[0],
                  id: 'week-attacker',
                  workouts: [
                    {
                      ...baseBlockPayload.weeks[0].workouts[0],
                      id: 'workout-victim'
                    }
                  ]
                }
              ]
            }
          ]
        }
      } as any)
    ).rejects.toMatchObject({ statusCode: 404, message: 'Workout not found' })

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.plannedWorkout.update).not.toHaveBeenCalled()
  })

  it('allows nested updates for ids that belong to the ownership-verified plan', async () => {
    const handler = await getHandler()

    const result = await handler({
      params: { id: 'plan-attacker' },
      body: {
        name: 'Updated plan',
        blocks: [
          {
            ...baseBlockPayload,
            id: 'block-attacker',
            name: 'Updated block',
            weeks: [
              {
                ...baseBlockPayload.weeks[0],
                id: 'week-attacker',
                volumeTargetMinutes: 320,
                workouts: [
                  {
                    ...baseBlockPayload.weeks[0].workouts[0],
                    id: 'workout-attacker',
                    title: 'Updated easy'
                  }
                ]
              }
            ]
          }
        ]
      }
    } as any)

    expect(result).toEqual({ success: true })
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.trainingBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'block-attacker' } })
    )
    expect(prisma.trainingWeek.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'week-attacker' } })
    )
    expect(prisma.plannedWorkout.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'workout-attacker' } })
    )
  })
})
