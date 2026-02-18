import { describe, it, expect, vi, beforeEach } from 'vitest'
import { profileTools } from '../../../../../server/utils/ai-tools/profile'
import { userRepository } from '../../../../../server/utils/repositories/userRepository'

// Mock the repository
vi.mock('../../../../../server/utils/repositories/userRepository', () => ({
  userRepository: {
    getById: vi.fn(),
    update: vi.fn()
  }
}))

describe('profileTools', () => {
  const userId = 'user-123'
  const timezone = 'UTC'
  const aiSettings = { aiRequireToolApproval: false } as any
  const tools = profileTools(userId, timezone, aiSettings)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('get_user_profile', () => {
    it('should return user profile data when user exists', async () => {
      const mockUser = {
        id: userId,
        name: 'Test Athlete',
        ftp: 250,
        maxHr: 190,
        weight: 75,
        aiPersona: 'Coach'
      }

      vi.mocked(userRepository.getById).mockResolvedValue(mockUser as any)

      const result = await tools.get_user_profile.execute({}, { toolCallId: '1', messages: [] })

      expect(userRepository.getById).toHaveBeenCalledWith(userId)
      expect(result).toEqual({
        name: 'Test Athlete',
        ftp: 250,
        maxHr: 190,
        weight: 75,
        aiPersona: 'Coach',
        // Undefined fields should be undefined in result if not in mock
        dob: undefined,
        restingHr: undefined,
        sex: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        timezone: undefined,
        language: undefined,
        weightUnits: undefined,
        height: undefined,
        heightUnits: undefined,
        distanceUnits: undefined,
        temperatureUnits: undefined
      })
    })

    it('should return error when user does not exist', async () => {
      vi.mocked(userRepository.getById).mockResolvedValue(null)

      const result = await tools.get_user_profile.execute({}, { toolCallId: '1', messages: [] })

      expect(userRepository.getById).toHaveBeenCalledWith(userId)
      expect(result).toEqual({ error: 'Profile not found' })
    })
  })

  describe('update_user_profile', () => {
    it('should map gender to sex in update payload', async () => {
      vi.mocked(userRepository.update).mockResolvedValue({ id: userId, sex: 'Male' } as any)

      const result = await tools.update_user_profile.execute(
        { gender: 'Male' },
        { toolCallId: '2', messages: [] }
      )

      expect(userRepository.update).toHaveBeenCalledWith(userId, { sex: 'Male' })
      expect(result).toEqual({
        success: true,
        message: 'Profile updated successfully.',
        updated_fields: ['sex']
      })
    })

    it('should prefer explicit sex over gender when both are provided', async () => {
      vi.mocked(userRepository.update).mockResolvedValue({ id: userId, sex: 'Female' } as any)

      await tools.update_user_profile.execute(
        { sex: 'Female', gender: 'Male' },
        { toolCallId: '3', messages: [] }
      )

      expect(userRepository.update).toHaveBeenCalledWith(userId, { sex: 'Female' })
    })
  })
})
