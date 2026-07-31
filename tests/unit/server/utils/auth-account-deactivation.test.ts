import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.fn()
const userUpdate = vi.fn()
const sessionDeleteMany = vi.fn()
const oAuthTokenDeleteMany = vi.fn()
const oAuthAuthCodeDeleteMany = vi.fn()
const apiKeyDeleteMany = vi.fn()
const logAction = vi.fn()

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => userUpdate(...args)
    },
    session: {
      deleteMany: (...args: unknown[]) => sessionDeleteMany(...args)
    },
    oAuthToken: {
      deleteMany: (...args: unknown[]) => oAuthTokenDeleteMany(...args)
    },
    oAuthAuthCode: {
      deleteMany: (...args: unknown[]) => oAuthAuthCodeDeleteMany(...args)
    },
    apiKey: {
      deleteMany: (...args: unknown[]) => apiKeyDeleteMany(...args)
    }
  }
}))

vi.mock('../../../../server/utils/audit', () => ({
  logAction: (...args: unknown[]) => logAction(...args)
}))

vi.mock('h3', () => ({
  createError: (err: { statusCode: number; statusMessage: string }) => {
    const error = new Error(err.statusMessage)
    ;(error as any).statusCode = err.statusCode
    return error
  }
}))

describe('deactivateAccount credential revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      deactivatedAt: null
    })
    userUpdate.mockResolvedValue({})
    sessionDeleteMany.mockResolvedValue({ count: 1 })
    oAuthTokenDeleteMany.mockResolvedValue({ count: 2 })
    oAuthAuthCodeDeleteMany.mockResolvedValue({ count: 1 })
    apiKeyDeleteMany.mockResolvedValue({ count: 1 })
    logAction.mockResolvedValue(undefined)
  })

  it('revokes sessions, OAuth tokens/auth codes, and API keys on deactivation', async () => {
    const { deactivateAccount } =
      await import('../../../../server/utils/services/accountDeactivationService')

    const result = await deactivateAccount({
      userId: 'user-1',
      actor: { id: 'admin-1', email: 'admin@example.com' },
      reason: 'Abuse'
    })

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        deactivatedAt: expect.any(Date),
        deactivationReason: 'Abuse'
      }
    })
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(oAuthTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(oAuthAuthCodeDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(apiKeyDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(result).toMatchObject({
      success: true,
      message: 'Account deactivated'
    })
  })

  it('does not revoke credentials again when already deactivated', async () => {
    const deactivatedAt = new Date('2026-07-01T00:00:00.000Z')
    findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      deactivatedAt
    })

    const { deactivateAccount } =
      await import('../../../../server/utils/services/accountDeactivationService')

    const result = await deactivateAccount({
      userId: 'user-1',
      actor: { id: 'admin-1' }
    })

    expect(result).toMatchObject({
      success: true,
      alreadyDeactivated: true,
      deactivatedAt
    })
    expect(userUpdate).not.toHaveBeenCalled()
    expect(oAuthTokenDeleteMany).not.toHaveBeenCalled()
    expect(apiKeyDeleteMany).not.toHaveBeenCalled()
  })
})
