import { prisma } from '../db'
import { normalizeWahooWorkout } from '../wahoo'

/**
 * Process a webhook event from Wahoo.
 */
export async function processWahooWebhookEvent(payload: any) {
  const { event_type, webhook_token, user, workout_summary } = payload

  // Verify webhook token if configured
  const expectedToken = process.env.WAHOO_WEBHOOK_KEY
  if (expectedToken && webhook_token !== expectedToken) {
    console.error('[WahooService] Invalid webhook token')
    return { handled: false, message: 'Invalid webhook token' }
  }

  console.log(`[WahooService] Processing ${event_type} for user ${user?.id}`)

  if (event_type === 'workout_summary') {
    if (!workout_summary || !user?.id) {
      return { handled: false, message: 'Missing workout_summary or user info' }
    }

    // Find the user integration
    const integration = await prisma.integration.findFirst({
      where: {
        provider: 'wahoo',
        externalUserId: String(user.id)
      }
    })

    if (!integration) {
      return { handled: false, message: `No integration found for Wahoo user ${user.id}` }
    }

    // Reconstruct the WahooWorkout object as expected by normalizeWahooWorkout
    const wahooWorkout = {
      ...workout_summary.workout,
      workout_summary: workout_summary
    }

    const normalized = normalizeWahooWorkout(wahooWorkout, integration.userId)

    // Upsert the workout
    await prisma.workout.upsert({
      where: {
        userId_source_externalId: {
          userId: integration.userId,
          source: 'wahoo',
          externalId: normalized.externalId
        }
      },
      create: normalized,
      update: normalized
    })

    return { handled: true, message: `Processed workout_summary ${workout_summary.id}` }
  }

  return { handled: false, message: `Unhandled event type: ${event_type}` }
}
