import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../db'
import { shouldIngestActivities } from '../integration-settings'

/**
 * Process a webhook event from Strava.
 * This is called by the webhook worker.
 */
export async function processStravaWebhookEvent(userId: string, type: string, payload: any) {
  const { object_type, object_id, aspect_type, updates } = payload

  console.log(`[StravaService] Processing ${object_type}:${aspect_type} for user ${userId}`)

  if (object_type === 'activity') {
    if (aspect_type === 'create' || aspect_type === 'update') {
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          provider: 'strava'
        },
        select: {
          ingestWorkouts: true,
          settings: true
        }
      })

      if (
        !shouldIngestActivities(
          'strava',
          integration?.ingestWorkouts,
          (integration?.settings as Record<string, any> | null) || {}
        )
      ) {
        return { handled: true, message: 'Strava activity ingestion disabled' }
      }

      // Trigger single activity ingestion
      await tasks.trigger(
        'ingest-strava-activity',
        {
          userId,
          activityId: object_id,
          isUpdate: aspect_type === 'update'
        },
        {
          concurrencyKey: userId,
          tags: [`user:${userId}`],
          idempotencyKey: `strava-activity:${userId}:${object_id}`,
          idempotencyKeyTTL: '15m'
        }
      )
      return { handled: true, message: `Triggered ingestion for activity ${object_id}` }
    } else if (aspect_type === 'delete') {
      // Find and delete the workout from our database
      const workout = await prisma.workout.findUnique({
        where: {
          userId_source_externalId: {
            userId,
            source: 'strava',
            externalId: object_id.toString()
          }
        }
      })

      if (workout) {
        await prisma.workout.delete({
          where: { id: workout.id }
        })
        return { handled: true, message: `Deleted workout ${workout.id}` }
      }
      return { handled: true, message: `Workout ${object_id} not found in DB` }
    }
  } else if (object_type === 'athlete') {
    if (updates && updates.authorized === 'false') {
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          provider: 'strava'
        }
      })

      if (integration) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            syncStatus: 'FAILED',
            errorMessage: 'User revoked authorization on Strava'
          }
        })
        return { handled: true, message: `Marked integration for user ${userId} as revoked` }
      }
    }
  }

  return { handled: false, message: `Unhandled event type: ${object_type}:${aspect_type}` }
}
