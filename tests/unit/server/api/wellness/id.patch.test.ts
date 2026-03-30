import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { requireAuth } from '../../../../../server/utils/auth-guard'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getRouterParam', (event: any, name: string) => event.params?.[name])
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).statusMessage = err.statusMessage
  return error
})

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAuth: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    wellness: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/wellness/[id].patch')
  return mod.default
}

describe('PATCH /api/wellness/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.wellness.findUnique).mockResolvedValue({
      id: 'wellness-1',
      userId: 'user-1'
    } as any)
    vi.mocked(prisma.wellness.update).mockResolvedValue({
      id: 'wellness-1',
      userId: 'user-1'
    } as any)
  })

  it('accepts manual SpO2 updates without rejecting the request', async () => {
    const handler = await getHandler()

    await handler({
      params: { id: 'wellness-1' },
      body: {
        spO2: 97.5,
        comments: null
      }
    } as any)

    expect(prisma.wellness.update).toHaveBeenCalledWith({
      where: { id: 'wellness-1' },
      data: expect.objectContaining({
        spO2: 97.5,
        comments: null
      })
    })
  })

  it('normalizes fractional SpO2 payloads before saving', async () => {
    const handler = await getHandler()

    await handler({
      params: { id: 'wellness-1' },
      body: {
        spO2: 0.976,
        customMetrics: {
          note: 'manual'
        }
      }
    } as any)

    expect(prisma.wellness.update).toHaveBeenCalledWith({
      where: { id: 'wellness-1' },
      data: expect.objectContaining({
        spO2: 97.6,
        customMetrics: {
          note: 'manual'
        }
      })
    })
  })
})
