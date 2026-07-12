const FITBIT_API_BASE = 'https://api.fitbit.com'
const FITBIT_SUBSCRIPTION_ID = 'coachwatts'

/** Fitbit collection paths we subscribe to for webhook-driven ingest. */
export const FITBIT_WEBHOOK_COLLECTIONS = ['foods', 'body', 'sleep', 'activities'] as const

export type FitbitWebhookCollection = (typeof FITBIT_WEBHOOK_COLLECTIONS)[number]

export interface FitbitSubscriptionResult {
  subscribed: FitbitWebhookCollection[]
  alreadySubscribed: FitbitWebhookCollection[]
  failed: Array<{ collection: FitbitWebhookCollection; status: number; message: string }>
}

/**
 * Register Fitbit API subscriptions so the app subscriber endpoint receives POST notifications.
 * Requires the subscriber URL to be verified in the Fitbit developer portal first.
 */
export async function subscribeFitbitWebhooks(
  accessToken: string
): Promise<FitbitSubscriptionResult> {
  const result: FitbitSubscriptionResult = {
    subscribed: [],
    alreadySubscribed: [],
    failed: []
  }

  for (const collection of FITBIT_WEBHOOK_COLLECTIONS) {
    const url = `${FITBIT_API_BASE}/1/user/-/${collection}/apiSubscriptions/${FITBIT_SUBSCRIPTION_ID}.json`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        result.subscribed.push(collection)
        continue
      }

      // 409: user already subscribed to this collection (possibly under the same ID)
      if (response.status === 409) {
        result.alreadySubscribed.push(collection)
        continue
      }

      const errorText = await response.text().catch(() => '')
      result.failed.push({
        collection,
        status: response.status,
        message: errorText || response.statusText
      })
    } catch (error: any) {
      result.failed.push({
        collection,
        status: 0,
        message: error?.message || 'Network error'
      })
    }
  }

  return result
}
