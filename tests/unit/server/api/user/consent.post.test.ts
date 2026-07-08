import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})

const readBody = vi.fn()
vi.stubGlobal('readBody', readBody)

const getServerSession = vi.fn()
const userUpdate = vi.fn()

vi.mock('#auth', () => ({
  getServerSession
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: { update: userUpdate }
  }
}))

describe('POST /api/user/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
    userUpdate.mockResolvedValue({
      termsAcceptedAt: new Date('2026-07-08T00:00:00Z')
    })
  })

  it('rejects requests without explicit health consent', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0'
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default

    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Health consent is required'
    })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('accepts consent when healthConsentAccepted is true', async () => {
    readBody.mockResolvedValue({
      termsVersion: '1.0',
      privacyPolicyVersion: '1.0',
      healthConsentAccepted: true
    })

    const mod = await import('../../../../../server/api/user/consent.post')
    const handler = mod.default
    const result = await handler({} as any)

    expect(userUpdate).toHaveBeenCalled()
    expect(result).toMatchObject({ success: true })
  })
})
