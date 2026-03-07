import { prisma } from '../db'
import { fetchUltrahumanDaily, normalizeUltrahumanWellness } from '../ultrahuman'
import { shouldIngestWellness } from '../integration-settings'
import { wellnessRepository } from '../repositories/wellnessRepository'
import { bodyMeasurementService } from './bodyMeasurementService'

export const UltrahumanService = {
  /**
   * Sync Ultrahuman data for a specific date
   */
  async syncDay(userId: string, date: Date) {
    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'ultrahuman'
        }
      }
    })

    if (!integration) {
      throw new Error(`Ultrahuman integration not found for user ${userId}`)
    }

    const settings = (integration.settings as Record<string, any> | null) || {}
    const wellnessEnabled = shouldIngestWellness(settings)

    if (!wellnessEnabled) {
      console.log(`[UltrahumanService] Wellness disabled for user ${userId}, skipping.`)
      return null
    }

    // Ultrahuman API works on UTC dates for the 'date' parameter usually
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

    console.log(`[UltrahumanService] Fetching data for ${utcDate.toISOString().split('T')[0]}`)
    const dailyData = await fetchUltrahumanDaily(integration, utcDate)

    const wellness = normalizeUltrahumanWellness(dailyData, userId, utcDate)

    if (wellness) {
      const { record } = await wellnessRepository.upsert(
        userId,
        wellness.date,
        wellness as any,
        wellness as any,
        'ultrahuman'
      )

      await bodyMeasurementService.recordWellnessMetrics(
        userId,
        {
          id: record.id,
          date: record.date,
          weight: record.weight,
          bodyFat: record.bodyFat,
          rawJson: record.rawJson
        },
        'ultrahuman'
      )

      return record
    }

    return null
  },

  /**
   * Sync Ultrahuman data for a date range
   */
  async syncRange(userId: string, startDate: Date, endDate: Date) {
    let count = 0
    const current = new Date(startDate)

    while (current <= endDate) {
      const result = await this.syncDay(userId, new Date(current))
      if (result) count++

      // Move to next day
      current.setUTCDate(current.getUTCDate() + 1)
    }

    return count
  }
}
