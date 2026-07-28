import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuthMock = vi.fn()
const checkRelationshipMock = vi.fn()

vi.stubGlobal('defineEventHandler', (handler: any) => handler)
vi.stubGlobal('getValidatedRouterParams', async () => ({
  id: 'athlete-1',
  workoutId: 'workout-1'
}))

vi.stubGlobal('createError', (input: { statusCode: number; message: string }) => {
  return Object.assign(new Error(input.message), { statusCode: input.statusCode })
})

vi.mock('../../../../server/utils/auth-guard', () => ({
  requireAuth: requireAuthMock
}))

vi.mock('../../../../server/utils/repositories/coachingRepository', () => ({
  coachingRepository: {
    checkRelationship: checkRelationshipMock
  }
}))

vi.mock('../../../../server/utils/planned-workout-service', () => ({
  createPlannedWorkoutForUser: vi.fn(),
  deletePlannedWorkoutForUser: vi.fn(),
  movePlannedWorkoutForUser: vi.fn(),
  updatePlannedWorkoutForUser: vi.fn()
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {}
}))

const mutationLoaders = [
  {
    name: 'planned-workout create',
    load: () => import('../../../../server/api/coaching/athletes/[id]/planned-workouts/index.post')
  },
  {
    name: 'planned-workout update',
    load: () =>
      import('../../../../server/api/coaching/athletes/[id]/planned-workouts/[workoutId].patch')
  },
  {
    name: 'planned-workout delete',
    load: () =>
      import('../../../../server/api/coaching/athletes/[id]/planned-workouts/[workoutId].delete')
  },
  {
    name: 'planned-workout move',
    load: () =>
      import('../../../../server/api/coaching/athletes/[id]/planned-workouts/[workoutId]/move.post')
  },
  {
    name: 'training-plan apply',
    load: () => import('../../../../server/api/library/plans/[id]/apply.post')
  }
]

describe('requireCoachAccessToAthlete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkRelationshipMock.mockResolvedValue(true)
  })

  it.each(mutationLoaders)('rejects a read-only OAuth token on $name', async ({ load }) => {
    requireAuthMock.mockImplementation(async (_event, requiredScopes?: string[]) => {
      const tokenScopes = ['coaching:read']
      if (requiredScopes?.some((scope) => !tokenScopes.includes(scope))) {
        throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 })
      }
      return { id: 'coach-1' }
    })

    const event = {} as any
    const { default: handler } = await load()

    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(requireAuthMock).toHaveBeenCalledWith(event, ['coaching:write'])
    expect(checkRelationshipMock).not.toHaveBeenCalled()
  })

  it('uses coaching:read by default for read routes', async () => {
    requireAuthMock.mockResolvedValue({ id: 'coach-1' })

    const { requireCoachAccessToAthlete } = await import('../../../../server/utils/coaching-auth')

    await requireCoachAccessToAthlete({} as any, 'athlete-1')

    expect(requireAuthMock).toHaveBeenCalledWith({}, ['coaching:read'])
    expect(checkRelationshipMock).toHaveBeenCalledWith('coach-1', 'athlete-1')
  })

  it('keeps session-cookie coaches authorized for mutations', async () => {
    requireAuthMock.mockResolvedValue({ id: 'coach-1' })

    const { requireCoachAccessToAthlete } = await import('../../../../server/utils/coaching-auth')

    await expect(
      requireCoachAccessToAthlete({} as any, 'athlete-1', ['coaching:write'])
    ).resolves.toMatchObject({ id: 'coach-1' })
    expect(requireAuthMock).toHaveBeenCalledWith({}, ['coaching:write'])
    expect(checkRelationshipMock).toHaveBeenCalledWith('coach-1', 'athlete-1')
  })
})
