import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { userIngestionQueue } from './queues'
import { prisma } from '../server/utils/db'
import { nutritionRepository } from '../server/utils/repositories/nutritionRepository'
import { getUserTimezone } from '../server/utils/date'
import {
  fetchFitbitFoodLog,
  fetchFitbitFoodGoals,
  fetchFitbitWaterLog,
  normalizeFitbitNutrition
} from '../server/utils/fitbit'

export const ingestFitbitTask = task({
  id: 'ingest-fitbit',
  queue: userIngestionQueue,
  maxDuration: 900,
  retry: {
    maxAttempts: 1
  },
  run: async (payload: { userId: string; startDate: string; endDate: string }) => {
    const { userId, startDate, endDate } = payload

    logger.log('='.repeat(60))
    logger.log('🥗  FITBIT NUTRITION SYNC STARTING')
    logger.log('='.repeat(60))
    logger.log(`User ID: ${userId}`)
    logger.log(`Date Range: ${startDate} to ${endDate}`)

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'fitbit'
        }
      }
    })

    if (!integration) {
      logger.error('❌ Fitbit integration not found for user')
      throw new Error('Fitbit integration not found for user')
    }

    logger.log(`✓ Found Fitbit integration (ID: ${integration.id})`)

    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })

    try {
      const timezone = await getUserTimezone(userId)
      logger.log(`User timezone: ${timezone}`)

      const start = new Date(startDate)
      const end = new Date(endDate)

      const dates: string[] = []
      const currentDate = new Date(start)

      while (currentDate <= end) {
        const year = currentDate.getUTCFullYear()
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getUTCDate()).padStart(2, '0')
        dates.push(`${year}-${month}-${day}`)
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      }

      // Process most recent days first
      dates.reverse()

      logger.log('-'.repeat(60))
      logger.log(`📅 Generated ${dates.length} dates to process`)
      logger.log(`   First: ${dates[0]}`)
      logger.log(`   Last: ${dates[dates.length - 1]}`)
      logger.log('-'.repeat(60))

      let upsertedCount = 0
      let skippedCount = 0
      let errorCount = 0

      let foodGoals: any = null

      try {
        foodGoals = await fetchFitbitFoodGoals(integration)
      } catch (error) {
        logger.warn('Failed to fetch Fitbit food goals', { error })
      }

      for (const date of dates) {
        try {
          const dateObj = new Date(
            Date.UTC(
              parseInt(date.split('-')[0]!),
              parseInt(date.split('-')[1]!) - 1,
              parseInt(date.split('-')[2]!)
            )
          )
          const today = new Date()
          const daysDiff = Math.floor((today.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
          const isRecentDate = daysDiff <= 2

          if (!isRecentDate) {
            const existing = await nutritionRepository.getByDate(userId, dateObj)
            if (existing && (existing.calories || existing.breakfast || existing.lunch)) {
              skippedCount++
              logger.log(`[${date}] ✓ Existing nutrition data - skipping (older date)`)
              continue
            }
          } else {
            logger.log(`[${date}] Recent date - will update even if data exists`)
          }

          logger.log(`[${date}] Fetching Fitbit nutrition logs...`)

          const foodLog = await fetchFitbitFoodLog(integration, date)
          // Small delay to avoid immediate back-to-back rate limit hits
          await new Promise((resolve) => setTimeout(resolve, 300))
          const waterLog = await fetchFitbitWaterLog(integration, date)

          const foodsCount = foodLog?.foods?.length || 0
          const calories = foodLog?.summary?.calories || 0
          const water = waterLog?.summary?.water || 0

          if (foodsCount === 0 && calories === 0 && water === 0) {
            skippedCount++
            logger.log(`[${date}] ⊘ Skipping - no nutrition data logged`)
            continue
          }

          const nutrition = normalizeFitbitNutrition(foodLog, waterLog, foodGoals, userId, date)

          const result = await nutritionRepository.upsert(
            userId,
            nutrition.date,
            nutrition as any,
            {
              ...nutrition,
              aiAnalysis: null,
              aiAnalysisJson: null,
              aiAnalysisStatus: 'NOT_STARTED',
              aiAnalyzedAt: null,
              overallScore: null,
              macroBalanceScore: null,
              qualityScore: null,
              adherenceScore: null,
              hydrationScore: null,
              nutritionalBalanceExplanation: null,
              calorieAdherenceExplanation: null,
              macroDistributionExplanation: null,
              hydrationStatusExplanation: null,
              timingOptimizationExplanation: null
            } as any
          )

          if (result) {
            upsertedCount++
            logger.log(`[${date}] ✓ Synced successfully`)
          }

          // Throttle between days to reduce rate limit pressure
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          errorCount++
          logger.error(`[${date}] ✖ Error processing date`, { error })

          if (error instanceof Error && error.message.startsWith('FITBIT_RATE_LIMITED')) {
            logger.warn('[Fitbit] Rate limited. Aborting remaining dates to avoid blocking sync.')
            throw error
          }
        }
      }

      logger.log('='.repeat(60))
      logger.log('✅ FITBIT SYNC COMPLETED')
      logger.log(`   Upserted: ${upsertedCount}`)
      logger.log(`   Skipped: ${skippedCount}`)
      logger.log(`   Errors: ${errorCount}`)
      logger.log('='.repeat(60))

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: 'SUCCESS',
          lastSyncAt: new Date(),
          errorMessage: null
        }
      })

      return {
        success: true,
        count: upsertedCount,
        userId,
        startDate,
        endDate
      }
    } catch (error) {
      const isRateLimited =
        error instanceof Error && error.message.startsWith('FITBIT_RATE_LIMITED')

      logger.error('Error ingesting Fitbit nutrition data', { error, isRateLimited })

      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      let syncStatus: string = 'FAILED'

      if (isRateLimited) {
        syncStatus = 'RATE_LIMITED'
        const match = errorMessage.match(/FITBIT_RATE_LIMITED_RESET_(\d+)/)
        if (match?.[1]) {
          const resetSeconds = parseInt(match[1], 10)
          const resetMinutes = Math.max(1, Math.ceil(resetSeconds / 60))
          errorMessage = `Rate limited by Fitbit. Try again in ~${resetMinutes} minute${
            resetMinutes === 1 ? '' : 's'
          }.`
        } else {
          errorMessage = 'Rate limited by Fitbit. Try again later.'
        }
      }

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus,
          errorMessage
        }
      })

      if (isRateLimited) {
        return {
          success: false,
          rateLimited: true,
          userId,
          startDate,
          endDate
        }
      }

      throw error
    }
  }
})
