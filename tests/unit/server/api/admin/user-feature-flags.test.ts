import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { getServerSession } from '../../../../../server/utils/session'

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  getRouterParam: (event: any, key: string) => event.context?.params?.[key],
  readBody: (event: any) => event.body,
  createError: (err: any) => {
    const error = new Error(err.statusMessage)
    ;(error as any).statusCode = err.statusCode
    ;(error as any).data = err.data
    return error
  }
}))

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/admin/users/[id]/feature-flags.post')
  return mod.default
}

describe('POST /api/admin/users/[id]/feature-flags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: false } } as any)
    const handler = await getHandler()

    await expect(
      handler({
        context: { params: { id: 'user-1' } },
        body: { path: 'structuredWorkout.generator', value: 'draft_json_v1' }
      } as any)
    ).rejects.toThrow('Forbidden')
  })

  it('sets the structured workout generator without dropping unrelated flags', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: true } } as any)
    vi.mocked((prisma as any).user.findUnique).mockResolvedValue({
      id: 'user-1',
      featureFlags: {
        chat: { toolRepair: true }
      }
    })
    vi.mocked((prisma as any).user.update).mockResolvedValue({
      id: 'user-1',
      featureFlags: {
        chat: { toolRepair: true },
        structuredWorkout: { generator: 'draft_json_v1' }
      }
    })

    const handler = await getHandler()
    const result = await handler({
      context: { params: { id: 'user-1' } },
      body: { path: 'structuredWorkout.generator', value: 'draft_json_v1' }
    } as any)

    expect((prisma as any).user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        featureFlags: {
          chat: { toolRepair: true },
          structuredWorkout: { generator: 'draft_json_v1' }
        }
      },
      select: {
        id: true,
        featureFlags: true
      }
    })
    expect(result).toEqual({
      success: true,
      userId: 'user-1',
      featureFlags: {
        chat: { toolRepair: true },
        structuredWorkout: { generator: 'draft_json_v1' }
      }
    })
  })

  it('clears the generator and prunes empty parents', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: true } } as any)
    vi.mocked((prisma as any).user.findUnique).mockResolvedValue({
      id: 'user-1',
      featureFlags: {
        structuredWorkout: { generator: 'draft_json_v1' }
      }
    })
    vi.mocked((prisma as any).user.update).mockResolvedValue({
      id: 'user-1',
      featureFlags: null
    })

    const handler = await getHandler()
    const result = await handler({
      context: { params: { id: 'user-1' } },
      body: { path: 'structuredWorkout.generator', value: null }
    } as any)

    expect((prisma as any).user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        featureFlags: null
      },
      select: {
        id: true,
        featureFlags: true
      }
    })
    expect(result.featureFlags).toBeNull()
  })
})
