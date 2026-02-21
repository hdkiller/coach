import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmailTask } from '../../../trigger/send-email'
import { prisma } from '../../../server/utils/db'

// Mock prisma
vi.mock('../../../server/utils/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    emailSuppression: {
      findFirst: vi.fn()
    },
    emailDelivery: {
      create: vi.fn()
    }
  }
}))

// Mock logger
vi.mock('@trigger.dev/sdk/v3', async () => {
  const actual = await vi.importActual('@trigger.dev/sdk/v3')
  return {
    ...actual,
    logger: {
      log: vi.fn(),
      error: vi.fn()
    },
    // Mock task to just return the run function if called
    task: vi.fn().mockImplementation((config) => {
      return {
        run: config.run,
        id: config.id
      }
    })
  }
})

describe('sendEmailTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful fetch for internal render
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ html: '<html></html>', text: 'plain text' }),
      text: () => Promise.resolve('ok')
    })

    // Set environment variable for fetch
    process.env.NUXT_PUBLIC_SITE_URL = 'http://localhost:3099'
    process.env.INTERNAL_API_TOKEN = 'internal-test-token'
    process.env.NUXT_AUTH_SECRET = 'test-secret'
  })

  const mockPayload = {
    userId: 'user-123',
    templateKey: 'Welcome',
    eventKey: 'SIGNUP',
    audience: 'ENGAGEMENT' as const,
    subject: 'Welcome!'
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    emailPreferences: []
  }

  it('should skip if email is suppressed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.emailSuppression.findFirst).mockResolvedValue({ id: 'sup-1' } as any)

    const result = await sendEmailTask.run(mockPayload, { ctx: {} } as any)

    expect(result).toBeUndefined()
    expect(prisma.emailDelivery.create).not.toHaveBeenCalled()
  })

  it('should queue email if user is found and not suppressed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.emailSuppression.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.emailDelivery.create).mockResolvedValue({ id: 'delivery-1' } as any)

    const result = await sendEmailTask.run(mockPayload, { ctx: {} } as any)

    expect(result.success).toBe(true)
    expect(result.deliveryId).toBe('delivery-1')
    expect(prisma.emailDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toEmail: mockUser.email,
          status: 'QUEUED'
        })
      })
    )
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3099/api/internal/render-email',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-internal-api-token': 'internal-test-token'
        })
      })
    )
  })

  it('should handle idempotency key collision gracefully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.emailSuppression.findFirst).mockResolvedValue(null)

    const dbError = {
      code: 'P2002',
      meta: { target: ['idempotencyKey'] },
      message: 'Unique constraint failed'
    }

    vi.mocked(prisma.emailDelivery.create).mockRejectedValue(dbError)

    const result = await sendEmailTask.run(mockPayload, { ctx: {} } as any)

    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('Duplicate')
  })
})
