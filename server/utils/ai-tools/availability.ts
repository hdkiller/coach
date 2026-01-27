import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../../utils/db'

export const availabilityTools = (userId: string) => ({
  get_training_availability: tool({
    description:
      "Get user's training availability schedule showing when they can train each day of the week.",
    inputSchema: z.object({}),
    execute: async () => {
      const availability = await prisma.trainingAvailability.findMany({
        where: { userId },
        orderBy: { dayOfWeek: 'asc' }
      })

      if (availability.length === 0) {
        return {
          message: 'No training availability set',
          suggestion: 'Use update_training_availability to set your schedule'
        }
      }

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ]

      return {
        availability: availability.map((a) => ({
          day: dayNames[a.dayOfWeek],
          day_of_week: a.dayOfWeek,
          morning: a.morning,
          afternoon: a.afternoon,
          evening: a.evening,
          preferred_types: a.preferredTypes,
          indoor_only: a.indoorOnly,
          outdoor_only: a.outdoorOnly,
          gym_access: a.gymAccess,
          bike_access: a.bikeAccess,
          notes: a.notes
        }))
      }
    }
  }),

  update_training_availability: tool({
    description:
      'Update when the user can train during the week. Use this when user wants to change their availability.',
    inputSchema: z.object({
      day_of_week: z
        .number()
        .min(0)
        .max(6)
        .describe(
          'Day to update (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)'
        ),
      morning: z.boolean().optional().describe('Available in morning (5am-12pm)'),
      afternoon: z.boolean().optional().describe('Available in afternoon (12pm-6pm)'),
      evening: z.boolean().optional().describe('Available in evening (6pm-11pm)'),
      bike_access: z.boolean().optional().describe('Has bike or trainer access'),
      gym_access: z.boolean().optional().describe('Has gym access'),
      indoor_only: z.boolean().optional().describe('Indoor only constraint'),
      notes: z.string().optional().describe('Additional notes or constraints')
    }),
    execute: async (args) => {
      const {
        day_of_week,
        morning,
        afternoon,
        evening,
        indoor_only,
        gym_access,
        bike_access,
        notes
      } = args

      try {
        const updateData: any = {}
        if (morning !== undefined) updateData.morning = morning
        if (afternoon !== undefined) updateData.afternoon = afternoon
        if (evening !== undefined) updateData.evening = evening
        if (indoor_only !== undefined) updateData.indoorOnly = indoor_only
        if (gym_access !== undefined) updateData.gymAccess = gym_access
        if (bike_access !== undefined) updateData.bikeAccess = bike_access
        if (notes !== undefined) updateData.notes = notes

        const availability = await prisma.trainingAvailability.upsert({
          where: {
            userId_dayOfWeek: {
              userId,
              dayOfWeek: day_of_week
            }
          },
          create: {
            userId,
            dayOfWeek: day_of_week,
            ...updateData
          },
          update: updateData
        })

        const dayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        ]

        return {
          success: true,
          message: `Updated availability for ${dayNames[day_of_week]}`,
          availability: {
            day: dayNames[availability.dayOfWeek],
            morning: availability.morning,
            afternoon: availability.afternoon,
            evening: availability.evening
          }
        }
      } catch (error: any) {
        console.error('Error updating training availability:', error)
        return {
          error: 'Failed to update availability',
          message: error.message
        }
      }
    }
  })
})
