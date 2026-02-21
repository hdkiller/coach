import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResendService } from '../../../../../server/utils/services/resendService'
import { prisma } from '../../../../../server/utils/db'

// Mock prisma
vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    emailDelivery: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    emailSuppression: {
      upsert: vi.fn()
    }
  }
}))

describe('ResendService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processWebhookEvent', () => {
    const mockEmailId = 'resend-msg-123'
    const mockCreatedAt = '2026-02-21T12:00:00Z'
    const mockDelivery = {
      id: 'delivery-uuid-1',
      toEmail: 'athlete@example.com',
      providerMessageId: mockEmailId,
      status: 'SENT'
    }

    it('should update delivery status to DELIVERED', async () => {
      vi.mocked(prisma.emailDelivery.findUnique).mockResolvedValue(mockDelivery as any)

      const result = await ResendService.processWebhookEvent(
        'email.delivered',
        { email_id: mockEmailId },
        mockCreatedAt
      )

      expect(result.handled).toBe(true)
      expect(prisma.emailDelivery.update).toHaveBeenCalledWith({
        where: { id: mockDelivery.id },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: new Date(mockCreatedAt)
        })
      })
    })

    it('should update delivery status to BOUNCED and add to suppression list', async () => {
      vi.mocked(prisma.emailDelivery.findUnique).mockResolvedValue(mockDelivery as any)

      const result = await ResendService.processWebhookEvent(
        'email.bounced',
        { email_id: mockEmailId },
        mockCreatedAt
      )

      expect(result.handled).toBe(true)
      expect(prisma.emailDelivery.update).toHaveBeenCalledWith({
        where: { id: mockDelivery.id },
        data: expect.objectContaining({
          status: 'BOUNCED',
          bouncedAt: new Date(mockCreatedAt)
        })
      })

      expect(prisma.emailSuppression.upsert).toHaveBeenCalledWith({
        where: expect.objectContaining({
          email_reason_active: {
            email: mockDelivery.toEmail,
            reason: 'BOUNCE',
            active: true
          }
        }),
        create: expect.objectContaining({
          email: mockDelivery.toEmail,
          reason: 'BOUNCE'
        }),
        update: expect.any(Object)
      })
    })

    it('should throw an error if delivery record is not found (for BullMQ retry)', async () => {
      vi.mocked(prisma.emailDelivery.findUnique).mockResolvedValue(null)

      await expect(
        ResendService.processWebhookEvent('email.opened', { email_id: 'unknown' }, mockCreatedAt)
      ).rejects.toThrow('Delivery not found')
    })

    it('should return handled: false for unknown event types', async () => {
      const result = await ResendService.processWebhookEvent(
        'email.unknown_type',
        { email_id: mockEmailId },
        mockCreatedAt
      )
      expect(result.handled).toBe(false)
      expect(result.message).toContain('Unhandled type')
    })
  })
})
