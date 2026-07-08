import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'
import { requireAdmin } from '../../../../../server/utils/auth-guard'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  createError: (err: any) => {
    const error = new Error(err.statusMessage)
    ;(error as any).statusCode = err.statusCode
    return error
  }
}))

vi.mock('../../../../../server/utils/auth-guard', () => ({
  requireAdmin: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/debug/system.get')
  return mod.default
}

describe('GET /api/debug/system', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns system diagnostics for admin sessions', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', isAdmin: true }
    } as any)

    const handler = await getHandler()
    const result = await handler({} as any)

    expect(requireAdmin).toHaveBeenCalled()
    expect(result).toMatchObject({
      time: expect.objectContaining({
        serverTimeISO: expect.any(String)
      }),
      system: expect.objectContaining({
        nodeVersion: expect.any(String),
        cpuCount: expect.any(Number)
      })
    })
  })

  it('propagates forbidden errors from requireAdmin', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Forbidden' })
    )

    const handler = await getHandler()

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 403
    })
  })
})
