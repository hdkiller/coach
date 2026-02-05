import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sportSettingsRepository } from '../../../../../server/utils/repositories/sportSettingsRepository'
import { prisma } from '../../../../../server/utils/db'

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    sportSettings: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}))

describe('sportSettingsRepository', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByUserId', () => {
    it('should return existing settings and not create default if it exists', async () => {
      const mockSettings = [{ isDefault: true, id: 's-1', ftp: 250 }]
      vi.mocked(prisma.sportSettings.findMany).mockResolvedValue(mockSettings as any)

      const result = await sportSettingsRepository.getByUserId(userId)

      expect(result).toEqual(mockSettings)
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should lazy-create default profile if missing', async () => {
      vi.mocked(prisma.sportSettings.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ftp: 200,
        lthr: 160,
        maxHr: 180,
        restingHr: 50
      } as any)
      vi.mocked(prisma.sportSettings.create).mockResolvedValue({
        isDefault: true,
        id: 'new-def',
        ftp: 200
      } as any)

      const result = await sportSettingsRepository.getByUserId(userId)

      expect(prisma.sportSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            isDefault: true,
            ftp: 200
          })
        })
      )
      expect(result[0].isDefault).toBe(true)
    })
  })

  describe('upsertSettings', () => {
    it('should sync Default profile updates back to legacy User fields', async () => {
      const settingsPayload = [
        {
          id: 's-default',
          isDefault: true,
          ftp: 300,
          lthr: 170,
          maxHr: 190,
          restingHr: 55
        }
      ]

      vi.mocked(prisma.sportSettings.findUnique).mockResolvedValue({
        id: 's-default',
        isDefault: true
      } as any)
      vi.mocked(prisma.sportSettings.update).mockResolvedValue({
        id: 's-default',
        isDefault: true,
        ftp: 300,
        lthr: 170,
        maxHr: 190,
        restingHr: 55
      } as any)

      await sportSettingsRepository.upsertSettings(userId, settingsPayload)

      // Verify sport settings update
      expect(prisma.sportSettings.update).toHaveBeenCalled()

      // Verify sync back to user
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          ftp: 300,
          lthr: 170,
          maxHr: 190,
          restingHr: 55
        }
      })
    })

    it('should NOT sync back to User if setting is not Default', async () => {
      const settingsPayload = [
        {
          id: 's-run',
          isDefault: false,
          types: ['Run'],
          ftp: 280
        }
      ]

      vi.mocked(prisma.sportSettings.findUnique).mockResolvedValue({
        id: 's-run',
        isDefault: false
      } as any)
      vi.mocked(prisma.sportSettings.update).mockResolvedValue({
        id: 's-run',
        isDefault: false,
        ftp: 280
      } as any)

      await sportSettingsRepository.upsertSettings(userId, settingsPayload)

      expect(prisma.sportSettings.update).toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })
})
