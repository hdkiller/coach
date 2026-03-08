import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workoutRepository } from '../../../../../server/utils/repositories/workoutRepository'
import { imageGenerator } from '../../../../../server/utils/sharing/image-generator'

const setResponseHeaderMock = vi.fn()
const prismaMock = {
  shareToken: {
    findUnique: vi.fn()
  }
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('defineRouteMeta', () => {})
vi.stubGlobal('getRouterParam', (event: any, key: string) => event.params?.[key])
vi.stubGlobal('getQuery', (event: any) => event.query || {})
vi.stubGlobal('setResponseHeader', setResponseHeaderMock)
vi.stubGlobal('prisma', prismaMock)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message)
  // @ts-expect-error test-only statusCode assignment
  error.statusCode = err.statusCode
  return error
})

vi.mock('../../../../../server/utils/repositories/workoutRepository', () => ({
  workoutRepository: {
    getById: vi.fn()
  }
}))

vi.mock('../../../../../server/utils/sharing/image-generator', () => ({
  normalizeWorkoutImageRatio: vi.fn((value?: string | null) =>
    value === 'square' || value === 'post' ? value : 'story'
  ),
  normalizeWorkoutImageStyle: vi.fn((value?: string | null) =>
    value === 'poster' || value === 'crest' || value === 'pulse' ? value : 'map'
  ),
  normalizeWorkoutImageVariant: vi.fn((value?: string | null) =>
    value === 'transparent' || value === 'flat' ? value : 'default'
  ),
  imageGenerator: {
    generateWorkoutImage: vi.fn()
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/share/workouts/[token]/image.get')
  return mod.default
}

describe('GET /api/share/workouts/[token]/image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a png buffer and sets headers for workouts with gps data', async () => {
    const handler = await getHandler()
    const pngBuffer = Buffer.from('png-binary')

    vi.mocked(prismaMock.shareToken.findUnique).mockResolvedValue({
      token: 'share-123',
      resourceType: 'WORKOUT',
      resourceId: 'workout-1',
      userId: 'user-1',
      expiresAt: null
    } as any)
    vi.mocked(workoutRepository.getById).mockResolvedValue({
      id: 'workout-1',
      title: 'Route Ride',
      streams: {
        latlng: [
          [47.5, 19.04],
          [47.5005, 19.041]
        ]
      }
    } as any)
    vi.mocked(imageGenerator.generateWorkoutImage).mockResolvedValue(pngBuffer)

    const result = await handler({ params: { token: 'share-123' } })

    expect(workoutRepository.getById).toHaveBeenCalledWith('workout-1', 'user-1', {
      include: { streams: true }
    })
    expect(imageGenerator.generateWorkoutImage).toHaveBeenCalledWith(expect.anything(), {
      variant: 'default',
      style: 'map',
      ratio: 'story'
    })
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      { params: { token: 'share-123' } },
      'Content-Type',
      'image/png'
    )
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      { params: { token: 'share-123' } },
      'Cache-Control',
      'public, max-age=86400'
    )
    expect(result).toBe(pngBuffer)
  })

  it('still returns a png when the workout has no gps data and the generator falls back', async () => {
    const handler = await getHandler()
    const pngBuffer = Buffer.from('fallback-png')

    vi.mocked(prismaMock.shareToken.findUnique).mockResolvedValue({
      token: 'share-123',
      resourceType: 'WORKOUT',
      resourceId: 'workout-1',
      userId: 'user-1',
      expiresAt: null
    } as any)
    vi.mocked(workoutRepository.getById).mockResolvedValue({
      id: 'workout-1',
      title: 'Gym Session',
      streams: null
    } as any)
    vi.mocked(imageGenerator.generateWorkoutImage).mockResolvedValue(pngBuffer)

    const result = await handler({
      params: { token: 'share-123' },
      query: { variant: 'transparent', style: 'pulse', ratio: 'square' }
    })

    expect(result).toBe(pngBuffer)
    expect(imageGenerator.generateWorkoutImage).toHaveBeenCalledWith(
      expect.objectContaining({ streams: null }),
      { variant: 'transparent', style: 'pulse', ratio: 'square' }
    )
  })

  it('returns 410 for expired share links', async () => {
    const handler = await getHandler()

    vi.mocked(prismaMock.shareToken.findUnique).mockResolvedValue({
      token: 'share-123',
      resourceType: 'WORKOUT',
      resourceId: 'workout-1',
      userId: 'user-1',
      expiresAt: new Date('2026-03-07T00:00:00Z')
    } as any)

    await expect(handler({ params: { token: 'share-123' } })).rejects.toMatchObject({
      message: 'Share link has expired',
      statusCode: 410
    })
  })

  it('returns 404 for invalid share links', async () => {
    const handler = await getHandler()

    vi.mocked(prismaMock.shareToken.findUnique).mockResolvedValue(null)

    await expect(handler({ params: { token: 'missing' } })).rejects.toMatchObject({
      message: 'Workout share link not found',
      statusCode: 404
    })
  })
})
