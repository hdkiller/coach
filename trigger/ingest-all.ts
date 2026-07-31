import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { triggerWorkoutDeduplicationIfEnabled } from '../server/utils/trigger-workout-deduplication'
import { getUserTimezone } from '../server/utils/date'
import { getUserAiSettings } from '../server/utils/ai-user-settings'
import { auditLogRepository } from '../server/utils/repositories/auditLogRepository'
import { nutritionRepository } from '../server/utils/repositories/nutritionRepository'
import type { IngestionResult } from './types'
import { enqueueAutomaticWorkoutAnalysesForUser } from '../server/utils/workout-analysis-enqueue'
import {
  dispatchTask,
  dispatchTaskAndWait,
  isTaskRunningForUser
} from '../server/utils/task-dispatcher'

export const ingestAllTask = task({
  id: 'ingest-all',
  maxDuration: 21600, // 6 hours to allow for sequential sub-tasks (especially historical syncs)
  run: async (payload: {
    userId: string
    startDate: string
    endDate: string
    manualSync?: boolean
  }) => {
    const { userId, startDate, endDate, manualSync = false } = payload

    logger.log('='.repeat(60))
    logger.log('🔄 BATCH INGESTION STARTING')
    logger.log('='.repeat(60))
    logger.log(`User ID: ${userId}`)
    logger.log(`Date Range: ${startDate} to ${endDate}`)
    logger.log('')

    // 1. Flush Sync Queue (Push pending changes to Intervals.icu)
    // We do this first so external systems are up-to-date before we fetch from them.
    try {
      logger.log('📤 Triggering Sync Queue Processing (Push)...')
      const queueRun = await dispatchTaskAndWait('process-sync-queue', {})
      if (!queueRun.ok) {
        throw new Error(`Sync queue processing failed: ${String(queueRun.error)}`)
      }
      logger.log('✅ Sync Queue processing completed')
    } catch (error) {
      logger.warn('⚠️ Failed to trigger sync queue processing', { error })
    }

    // Fetch all active integrations for the user
    const integrations = await prisma.integration.findMany({
      where: {
        userId
      }
    })

    if (integrations.length === 0) {
      logger.log('⚠️  No integrations found for user')
      return {
        success: true,
        message: 'No integrations to sync',
        results: []
      }
    }

    logger.log(`Found ${integrations.length} integration(s):`)
    integrations.forEach((integration) => {
      logger.log(
        `  • ${integration.provider} (last sync: ${integration.lastSyncAt ? integration.lastSyncAt.toISOString() : 'never'})`
      )
    })
    logger.log('')

    // Build task triggers based on available integrations
    const tasksTrigger = []

    for (const integration of integrations) {
      const taskPayload = { userId, startDate, endDate }

      switch (integration.provider) {
        case 'strava':
          tasksTrigger.push({
            taskId: 'ingest-strava',
            payload: taskPayload
          })
          break
        case 'whoop':
          tasksTrigger.push({
            taskId: 'ingest-whoop',
            payload: taskPayload
          })
          break
        case 'oura':
          tasksTrigger.push({
            taskId: 'ingest-oura',
            payload: taskPayload
          })
          break
        case 'withings':
          tasksTrigger.push({
            taskId: 'ingest-withings',
            payload: taskPayload
          })
          break
        case 'intervals':
          tasksTrigger.push({
            taskId: 'ingest-intervals',
            payload: { ...taskPayload, manualSync }
          })
          break
        case 'yazio':
          tasksTrigger.push({
            taskId: 'ingest-yazio',
            payload: taskPayload
          })
          break
        case 'fitbit':
          tasksTrigger.push({
            taskId: 'ingest-fitbit',
            payload: taskPayload
          })
          break
        case 'hevy':
          tasksTrigger.push({
            taskId: 'ingest-hevy',
            payload: { userId, startDate, endDate, fullSync: false }
          })
          break
        case 'liftosaur':
          tasksTrigger.push({
            taskId: 'ingest-liftosaur',
            payload: taskPayload
          })
          break
        case 'polar':
          tasksTrigger.push({
            taskId: 'ingest-polar',
            payload: { userId, startDate, endDate }
          })
          break
        case 'garmin':
          tasksTrigger.push({
            taskId: 'ingest-garmin',
            payload: { userId, startDate, endDate }
          })
          break
        case 'rouvy':
          tasksTrigger.push({
            taskId: 'ingest-rouvy',
            payload: { userId, startDate, endDate }
          })
          break
        case 'wahoo':
          tasksTrigger.push({
            taskId: 'ingest-wahoo',
            payload: { userId, startDate, endDate }
          })
          break
        case 'ultrahuman':
          tasksTrigger.push({
            taskId: 'ingest-ultrahuman',
            payload: { userId, startDate, endDate }
          })
          break
        default:
          logger.warn(`Unknown provider: ${integration.provider}`)
      }
    }

    if (tasksTrigger.length === 0) {
      logger.log('⚠️  No supported integrations to sync')
      return {
        success: true,
        message: 'No supported integrations found',
        results: []
      }
    }

    logger.log(`🚀 Triggering ${tasksTrigger.length} ingestion task(s) sequentially...`)
    logger.log('')

    // Trigger all tasks sequentially to avoid BatchTriggerError in production
    const results = []
    const anyDataUpdated = false
    let newWorkoutsIngested = false
    let yazioUpdated = false
    let anyWellnessUpdated = false

    for (const item of tasksTrigger) {
      const integration = integrations.find((i) => {
        if (item.taskId === 'ingest-strava' && i.provider === 'strava') return true
        if (item.taskId === 'ingest-whoop' && i.provider === 'whoop') return true
        if (item.taskId === 'ingest-oura' && i.provider === 'oura') return true
        if (item.taskId === 'ingest-withings' && i.provider === 'withings') return true
        if (item.taskId === 'ingest-intervals' && i.provider === 'intervals') return true
        if (item.taskId === 'ingest-yazio' && i.provider === 'yazio') return true
        if (item.taskId === 'ingest-fitbit' && i.provider === 'fitbit') return true
        if (item.taskId === 'ingest-hevy' && i.provider === 'hevy') return true
        if (item.taskId === 'ingest-liftosaur' && i.provider === 'liftosaur') return true
        if (item.taskId === 'ingest-polar' && i.provider === 'polar') return true
        if (item.taskId === 'ingest-garmin' && i.provider === 'garmin') return true
        if (item.taskId === 'ingest-rouvy' && i.provider === 'rouvy') return true
        if (item.taskId === 'ingest-wahoo' && i.provider === 'wahoo') return true
        if (item.taskId === 'ingest-ultrahuman' && i.provider === 'ultrahuman') return true
        return false
      })

      logger.log(`Starting ingestion for ${integration?.provider || item.taskId}...`)

      try {
        const run = await dispatchTaskAndWait(item.taskId, item.payload, {
          concurrencyKey: userId,
          tags: [`user:${userId}`]
        })

        if (run.ok) {
          logger.log(`✅ ${integration?.provider || item.taskId}: SUCCESS`)
          // logger.log(`   ${JSON.stringify(run.output, null, 2)}`)

          const output = run.output as IngestionResult
          const counts = output.counts || {}

          console.log(`[DEBUG] ${integration?.provider} results:`, JSON.stringify(counts))

          // Track if any meaningful data was updated to trigger profile generation
          const workoutsCount = counts.workouts || counts.activity || 0
          const wellnessCount = counts.wellness || 0
          const sleepCount = counts.sleep || 0
          const plannedCount = counts.plannedWorkouts || 0
          const eventCount = counts.events || 0
          const nutritionCount = counts.nutrition || 0

          if (workoutsCount > 0) {
            console.log(
              `[DEBUG] ${integration?.provider} added ${workoutsCount} NEW workouts. Setting newWorkoutsIngested = true`
            )
            newWorkoutsIngested = true
          }

          if (wellnessCount > 0 || sleepCount > 0) {
            console.log(
              `[DEBUG] ${integration?.provider} added NEW health data (wellness: ${wellnessCount}, sleep: ${sleepCount}). (Triggering readiness check later)`
            )
            anyWellnessUpdated = true
          }

          if (item.taskId === 'ingest-yazio' && nutritionCount > 0) {
            console.log(
              `[DEBUG] ${integration?.provider} added NEW nutrition data (${nutritionCount}). (Triggering nutrition analysis later)`
            )
            yazioUpdated = true
          }

          if (plannedCount > 0 || eventCount > 0) {
            console.log(
              `[DEBUG] ${integration?.provider} added ${plannedCount} planned workouts and ${eventCount} events.`
            )
          }

          // Check specifically for wellness updates for readiness check
          if (wellnessCount > 0 || sleepCount > 0) {
            anyWellnessUpdated = true
          }

          // Check specifically for Yazio updates for nutrition analysis
          if (item.taskId === 'ingest-yazio' && nutritionCount > 0) {
            yazioUpdated = true
          }

          results.push({
            provider: integration?.provider || item.taskId,
            status: 'success',
            data: run.output
          })
        } else {
          logger.error(`❌ ${integration?.provider || item.taskId}: FAILED`)
          logger.error(`   Error: ${run.error}`)

          results.push({
            provider: integration?.provider || item.taskId,
            status: 'failed',
            error: run.error
          })
        }
      } catch (error) {
        logger.error(`❌ ${integration?.provider || item.taskId}: CRITICAL ERROR`)
        logger.error(`   Error: ${error}`)

        results.push({
          provider: integration?.provider || item.taskId,
          status: 'failed',
          error
        })
      }
    }

    logger.log('='.repeat(60))
    logger.log('📊 BATCH INGESTION RESULTS')
    logger.log('='.repeat(60))

    const successCount = results.filter((r) => r.status === 'success').length
    const failedCount = results.filter((r) => r.status === 'failed').length

    console.log(
      `[DEBUG] Final Sync Summary - newWorkoutsIngested: ${newWorkoutsIngested}, anyWellnessUpdated: ${anyWellnessUpdated}, yazioUpdated: ${yazioUpdated}`
    )

    logger.log('')
    logger.log('Summary:')
    logger.log(`  ✅ Successful: ${successCount}`)
    logger.log(`  ❌ Failed: ${failedCount}`)
    logger.log(`  📊 Total: ${results.length}`)
    logger.log(`  🏃 New Workouts: ${newWorkoutsIngested}`)
    logger.log('='.repeat(60))

    // CHAIN: Deduplicate Workouts (Autonomously)
    if (successCount > 0) {
      console.log('[DEBUG] Triggering Workout Deduplication chain...')
      logger.log('🔄 Chaining: Triggering Workout Deduplication...')
      try {
        const triggered = await triggerWorkoutDeduplicationIfEnabled(userId)
        if (triggered) {
          logger.log('✅ Triggered deduplicate-workouts')
        } else {
          logger.log('⏭️ Skipped deduplicate-workouts (disabled, already running, or check failed)')
        }
      } catch (err) {
        logger.error('❌ Failed to chain deduplicate-workouts', { err })
      }
    }

    // Run independently of deduplication and include existing 30-day backlog.
    if (successCount > 0) {
      try {
        const analysis = await enqueueAutomaticWorkoutAnalysesForUser(userId)
        logger.log('🤖 Automatic workout analysis enqueue complete', analysis)
      } catch (error) {
        logger.error('❌ Failed to enqueue automatic workout analysis', { error })
      }
    }

    // CHAIN: Trigger Athlete Profile Generation
    let profileTriggered = false
    if (newWorkoutsIngested) {
      // 5-day freshness check for Athlete Profile to save tokens
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const latestProfile = await prisma.report.findFirst({
        where: {
          userId,
          type: 'ATHLETE_PROFILE',
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })

      const shouldRefreshProfile = !latestProfile || latestProfile.createdAt < fiveDaysAgo

      if (shouldRefreshProfile) {
        console.log('[DEBUG] Triggering Athlete Profile Generation chain...')
        logger.log('🔄 Chaining: Triggering Athlete Profile Generation (Profile stale > 5d)...')
        try {
          // Create a placeholder report
          const report = await prisma.report.create({
            data: {
              userId,
              type: 'ATHLETE_PROFILE',
              status: 'QUEUED',
              dateRangeStart: new Date(startDate),
              dateRangeEnd: new Date(endDate)
            }
          })

          await dispatchTask(
            'generate-athlete-profile',
            {
              userId,
              reportId: report.id
            },
            {
              concurrencyKey: userId,
              tags: [`user:${userId}`]
            }
          )
          profileTriggered = true
          logger.log('✅ Triggered generate-athlete-profile')
        } catch (err) {
          logger.error('❌ Failed to chain generate-athlete-profile', { err })
        }
      } else {
        console.log('[DEBUG] Skipping Athlete Profile Generation: Profile is fresh (< 5 days).')
        logger.log('ℹ️ Skipping Athlete Profile Generation: Profile is fresh (< 5 days).')
      }
    } else {
      console.log('[DEBUG] Skipping Athlete Profile Generation: No new workouts.')
      logger.log('ℹ️ Skipping Athlete Profile Generation: No new workouts found.')
    }

    // CHAIN: Auto-Analyze Nutrition (if updated)
    if (yazioUpdated) {
      try {
        const aiSettings = await getUserAiSettings(userId)
        if (aiSettings.aiAutoAnalyzeNutrition) {
          logger.log('🤖 [Auto-Analyze] Nutrition updated: Checking for unanalyzed records...')
          // Find unanalyzed nutrition records in the date range
          const unanalyzedNutrition = await nutritionRepository.getForUser(userId, {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            where: {
              aiAnalysisStatus: 'NOT_STARTED'
            },
            select: { id: true, date: true }
          })

          if (unanalyzedNutrition.length > 0) {
            logger.log(
              `🤖 [Auto-Analyze] Found ${unanalyzedNutrition.length} unanalyzed nutrition records. Triggering analysis...`
            )
            for (const record of unanalyzedNutrition) {
              await dispatchTask(
                'analyze-nutrition',
                { nutritionId: record.id },
                { tags: [`user:${userId}`] }
              )
              // Log the action
              await auditLogRepository.log({
                userId,
                action: 'AUTO_ANALYZE_NUTRITION',
                resourceType: 'Nutrition',
                resourceId: record.id,
                metadata: { date: record.date.toISOString() }
              })
            }
          }
        }
      } catch (err) {
        logger.error('❌ [Auto-Analyze] Failed to trigger nutrition analysis', { err })
      }
    }

    // CHAIN: Auto-Analyze Readiness / Daily Recommendation
    if (anyWellnessUpdated) {
      try {
        const aiSettings = await getUserAiSettings(userId)
        if (aiSettings.aiAutoAnalyzeReadiness) {
          const recommendationAlreadyRunning = await isTaskRunningForUser(
            'recommend-today-activity',
            userId
          )

          if (recommendationAlreadyRunning) {
            logger.log(
              '⏭️ Skipping daily recommendation: already running for user (concurrency guard)',
              { userId }
            )
          } else {
            logger.log('🤖 [Auto-Analyze] Wellness updated: Triggering daily recommendation...')

            const recommendationDate = new Date()
            const recommendationDateKey = recommendationDate.toISOString().slice(0, 10)

            await dispatchTask(
              'recommend-today-activity',
              {
                userId,
                date: recommendationDate,
                source: 'AUTOMATIC'
              },
              {
                id: `recommend-today-activity:${userId}:${recommendationDateKey}`,
                concurrencyKey: userId,
                tags: [`user:${userId}`]
              }
            )

            // Log the action
            await auditLogRepository.log({
              userId,
              action: 'AUTO_ANALYZE_READINESS',
              resourceType: 'ActivityRecommendation',
              metadata: { date: recommendationDate.toISOString(), source: 'ingest-all' }
            })
          }
        }
      } catch (err) {
        logger.error('❌ [Auto-Analyze] Failed to trigger daily recommendation', { err })
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      total: results.length,
      results,
      userId,
      startDate,
      endDate
    }
  }
})
