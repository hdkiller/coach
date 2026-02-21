import { describe, it, expect, vi, beforeEach } from 'vitest'

import { prisma } from '../../../../../server/utils/db'
import { getServerSession } from '../../../../../server/utils/session'

// Mock h3 globals
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getQuery', (event: any) => event.query)
vi.stubGlobal('createError', (err: any) => new Error(err.statusMessage))

// Mock prisma
vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    emailDelivery: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}))

vi.mock('../../../../../server/utils/session', () => ({
  getServerSession: vi.fn()
}))

const getHandler = async () => {
  const mod = await import('../../../../../server/api/admin/emails/index.get')
  return mod.default
}

describe('Admin List Emails API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list email deliveries with pagination', async () => {
    const handler = await getHandler()
    const mockDeliveries = [{ id: '1', toEmail: 'test@example.com' }]

    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: true } } as any)
    vi.mocked(prisma.emailDelivery.findMany).mockResolvedValue(mockDeliveries as any)
    vi.mocked(prisma.emailDelivery.count).mockResolvedValue(100)

    const event = { query: { page: '2', limit: '10' } }

    // @ts-expect-error: mocking internal h3 event
    const result = await handler(event)

    expect(result.deliveries).toEqual(mockDeliveries)
    expect(result.total).toBe(100)
    expect(result.totalPages).toBe(10)
    expect(prisma.emailDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10
      })
    )
  })

  it('should reject non-admin access', async () => {
    const handler = await getHandler()
    vi.mocked(getServerSession).mockResolvedValue({ user: { isAdmin: false } } as any)

    const event = { query: {} }
    // @ts-expect-error: mocking internal h3 event
    await expect(handler(event)).rejects.toThrow('Forbidden')
  })
})
