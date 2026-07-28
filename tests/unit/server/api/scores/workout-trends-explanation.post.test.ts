import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerSession } from '../../../../../server/utils/session'
import { prisma } from '../../../../../server/utils/db'
import { generateStructuredAnalysis } from '../../../../../server/utils/gemini'
import { getUserAiSettings } from '../../../../../server/utils/ai-user-settings'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  ;(error as any).statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    workout: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/gemini', () => ({
  generateStructuredAnalysis: vi.fn()
}))

vi.mock('../../../../../server/utils/ai-user-settings', () => ({
  getUserAiSettings: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/scores/workout-trends-explanation.post')
  return mod.default
}

const baseSummary = {
  total: 5,
  avgOverall: 7.5,
  avgTechnical: 7,
  avgEffort: 8,
  avgPacing: 7.2,
  avgExecution: 7.8
}

const baseWorkout = {
  date: new Date('2026-07-20T10:00:00.000Z'),
  title: 'Long Run',
  type: 'Run',
  distanceMeters: 10000,
  durationSec: 3000,
  tss: 80
}

describe('POST /api/scores/workout-trends-explanation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'athlete@example.com' } } as any)
    vi.mocked(getUserAiSettings).mockResolvedValue({
      aiPersona: 'Supportive',
      aiModelPreference: 'flash'
    } as any)
    vi.mocked(prisma.workout.findMany).mockResolvedValue([baseWorkout] as any)
    vi.mocked(generateStructuredAnalysis).mockResolvedValue({
      executive_summary: 'ok',
      sections: [],
      recommendations: []
    } as any)
  })

  it('formats workout distances in kilometers in the prompt when the athlete prefers Kilometers', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      distanceUnits: 'Kilometers'
    } as any)

    const handler = await getHandler()
    await handler({ body: { days: 30, summary: baseSummary } } as any)

    const [prompt] = vi.mocked(generateStructuredAnalysis).mock.calls[0] as [string, ...unknown[]]
    expect(prompt).toContain('10.00 km')
    expect(prompt).not.toMatch(/\bmi\b/)
  })

  it('formats workout distances in kilometers in the prompt when distanceUnits is not set', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      distanceUnits: null
    } as any)

    const handler = await getHandler()
    await handler({ body: { days: 30, summary: baseSummary } } as any)

    const [prompt] = vi.mocked(generateStructuredAnalysis).mock.calls[0] as [string, ...unknown[]]
    expect(prompt).toContain('10.00 km')
  })

  it('formats workout distances in miles in the prompt when the athlete prefers Miles', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'athlete@example.com',
      distanceUnits: 'Miles'
    } as any)

    const handler = await getHandler()
    await handler({ body: { days: 30, summary: baseSummary } } as any)

    const [prompt] = vi.mocked(generateStructuredAnalysis).mock.calls[0] as [string, ...unknown[]]
    expect(prompt).toContain('6.21 mi')
    expect(prompt).not.toContain('km')
  })
})
