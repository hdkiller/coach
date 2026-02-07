import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const availabilityRepository = {
  /**
   * Get all availability records for a user, ordered by day of week (0=Sunday)
   */
  async getFullSchedule(userId: string) {
    return prisma.trainingAvailability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' }
    })
  },

  /**
   * Get availability for a specific day of the week
   */
  async getForDay(userId: string, dayOfWeek: number) {
    return prisma.trainingAvailability.findFirst({
      where: { userId, dayOfWeek }
    })
  },

  /**
   * Update or create availability for a user
   */
  async updateSchedule(userId: string, availability: any[]) {
    // Current pattern is delete and recreate for the whole schedule
    await prisma.trainingAvailability.deleteMany({
      where: { userId }
    })

    return prisma.trainingAvailability.createMany({
      data: availability.map((item: any) => ({
        userId,
        dayOfWeek: item.dayOfWeek,
        morning: item.morning ?? false,
        afternoon: item.afternoon ?? false,
        evening: item.evening ?? false,
        preferredTypes: item.preferredTypes || null,
        indoorOnly: item.indoorOnly ?? false,
        outdoorOnly: item.outdoorOnly ?? false,
        gymAccess: item.gymAccess ?? false,
        bikeAccess: item.bikeAccess ?? false,
        slots: item.slots || null,
        notes: item.notes || null
      }))
    })
  },

  /**
   * Update or create availability for a specific day
   */
  async updateDay(userId: string, dayOfWeek: number, data: any) {
    return prisma.trainingAvailability.upsert({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek
        }
      },
      create: {
        userId,
        dayOfWeek,
        ...data
      },
      update: data
    })
  },

  /**
   * Generate a descriptive summary of availability for AI context
   */
  formatForPrompt(availability: any | any[]) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const records = Array.isArray(availability) ? availability : [availability]

    if (records.length === 0 || !records[0]) {
      return 'No specific training availability defined. Assume flexible schedule.'
    }

    return records
      .map((a) => {
        const dayName = dayNames[a.dayOfWeek]
        const slots = (a.slots as any[]) || []

        if (slots.length === 0) {
          return `${dayName}: Rest Day (no sessions planned)`
        }

        const slotDetails = slots
          .map((s) => {
            const parts = [`${s.startTime} ${s.name} (${s.duration}m)`]
            if (s.activityTypes?.length) parts.push(`Types: ${s.activityTypes.join('/')}`)
            if (s.indoorOnly) parts.push('Indoor Only')
            return parts.join(' | ')
          })
          .join('\n    ')

        return `${dayName}:\n    ${slotDetails}${a.notes ? `\n    Notes: ${a.notes}` : ''}`
      })
      .join('\n')
  }
}
