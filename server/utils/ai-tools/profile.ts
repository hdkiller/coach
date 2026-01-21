import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'

export const profileTools = (userId: string, timezone: string) => ({
  get_user_profile: tool({
    description: 'Get user profile details like FTP, Max HR, Weight, Age.',
    parameters: z.object({}),
    execute: async (args: Record<string, unknown>) => {
      // Accessing the User model, not UserProfile
      const profile = await prisma.user.findUnique({
        where: { id: userId }, // Use 'id' for User model lookups by userId
        select: {
          name: true,
          ftp: true,
          maxHr: true,
          weight: true,
          dob: true,
          restingHr: true,
          sex: true,
          city: true,
          state: true,
          country: true,
          timezone: true,
          language: true,
          weightUnits: true,
          height: true,
          heightUnits: true,
          distanceUnits: true,
          temperatureUnits: true,
          aiPersona: true
        }
      })
      return profile || { error: 'Profile not found' }
    }
  })
})
