import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.context?.params?.[key])
vi.stubGlobal('getValidatedQuery', async (_event: any, parse: any) => parse({}))

const findMany = vi.fn()
const findFirst = vi.fn()
const findUnique = vi.fn()

vi.stubGlobal('prisma', {
  trainingPlan: {
    findMany,
    findFirst
  },
  shareToken: {
    findUnique
  }
})

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    trainingPlan: {
      findMany,
      findFirst
    },
    shareToken: {
      findUnique
    }
  }
}))

function makeUser() {
  return {
    name: 'Coach Jane',
    image: null,
    publicAuthorSlug: 'coach-jane',
    publicDisplayName: 'Coach Jane',
    publicBio: 'Helps first-time marathoners.',
    publicLocation: 'Budapest',
    publicWebsiteUrl: 'https://example.com',
    publicSocialLinks: [],
    publicCoachingBrand: 'Summit Endurance'
  }
}

function makePlan(overrides: Record<string, any> = {}) {
  return {
    id: 'plan-1',
    slug: 'starter-marathon',
    name: 'Starter Marathon',
    publicHeadline: 'Build toward your first marathon',
    publicDescription: 'A practical first marathon block.',
    primarySport: 'RUNNING',
    sportSubtype: 'Marathon',
    skillLevel: 'BEGINNER',
    planLanguage: 'English',
    daysPerWeek: 4,
    weeklyVolumeBand: 'MEDIUM',
    goalLabel: 'First marathon',
    difficulty: 4,
    accessState: 'RESTRICTED',
    visibility: 'PUBLIC',
    isFeatured: false,
    equipmentTags: [],
    updatedAt: new Date('2026-03-01T00:00:00Z'),
    createdAt: new Date('2026-03-01T00:00:00Z'),
    user: makeUser(),
    goal: { title: 'Spring Marathon' },
    sampleWeeks: [{ weekId: 'week-1' }],
    blocks: [
      {
        id: 'block-1',
        name: 'Base',
        order: 1,
        type: 'BASE',
        weeks: [
          {
            id: 'week-1',
            weekNumber: 1,
            focus: 'Aerobic build',
            workouts: [{ id: 'w1', dayIndex: 0, title: 'Easy Run', durationSec: 1800, tss: 30 }]
          },
          {
            id: 'week-2',
            weekNumber: 2,
            focus: 'Tempo',
            workouts: [{ id: 'w2', dayIndex: 2, title: 'Tempo Run', durationSec: 3600, tss: 65 }]
          }
        ]
      }
    ],
    ...overrides
  }
}

describe('public plan APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only mapped public plan summaries', async () => {
    findMany.mockResolvedValue([makePlan()])
    const mod = await import('../../../../../server/api/public/plans/index.get')

    const result = await mod.default({})

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: 'PUBLIC'
        })
      })
    )
    expect(result.plans).toHaveLength(1)
    expect(result.plans[0]).toMatchObject({
      slug: 'starter-marathon',
      lengthWeeks: 2,
      author: {
        slug: 'coach-jane'
      }
    })
  })

  it('shows only curated sample weeks on restricted public detail pages', async () => {
    findFirst.mockResolvedValue(makePlan())
    const mod = await import('../../../../../server/api/public/plans/[slug].get')

    const result = await mod.default({ context: { params: { slug: 'starter-marathon' } } })

    expect(result.plan.previewMode).toBe(true)
    expect(result.plan.blocks[0].weeks).toHaveLength(1)
    expect(result.plan.blocks[0].weeks[0].id).toBe('week-1')
  })

  it('unlocks the full plan for private full-access links', async () => {
    findUnique.mockResolvedValue({
      token: 'share-token',
      userId: 'user-1',
      resourceType: 'TRAINING_PLAN',
      resourceId: 'plan-1',
      accessMode: 'FULL',
      expiresAt: null,
      user: makeUser()
    })
    findFirst.mockResolvedValue(makePlan())

    const mod = await import('../../../../../server/api/public/plans/access/[token].get')
    const result = await mod.default({ context: { params: { token: 'share-token' } } })

    expect(result.plan.fullAccess).toBe(true)
    expect(result.plan.previewMode).toBe(false)
    expect(result.plan.blocks[0].weeks).toHaveLength(2)
  })
})
