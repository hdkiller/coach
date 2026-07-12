/** Withings notification categories we subscribe to (weight, activity, sleep). */
export const WITHINGS_NOTIFICATION_APPLIS = [1, 4, 16] as const

export type WithingsNotificationAppli = (typeof WITHINGS_NOTIFICATION_APPLIS)[number]

export interface WithingsSubscriptionResult {
  subscribed: WithingsNotificationAppli[]
  failed: Array<{ appli: WithingsNotificationAppli; status: number; message: string }>
}

/**
 * Subscribe a user to Withings webhook notifications for weight, activity, and sleep.
 * Withings verifies the callback URL with an empty-body POST before accepting the subscription.
 */
export async function subscribeWithingsWebhooks(
  accessToken: string,
  webhookUrl: string
): Promise<WithingsSubscriptionResult> {
  const result: WithingsSubscriptionResult = {
    subscribed: [],
    failed: []
  }

  for (const appli of WITHINGS_NOTIFICATION_APPLIS) {
    try {
      const response = await fetch('https://wbsapi.withings.net/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`
        },
        body: new URLSearchParams({
          action: 'subscribe',
          callbackurl: webhookUrl,
          appli: appli.toString()
        }).toString()
      })

      const data = (await response.json().catch(() => null)) as {
        status?: number
        error?: string
      } | null

      if (response.ok && data?.status === 0) {
        result.subscribed.push(appli)
        continue
      }

      result.failed.push({
        appli,
        status: data?.status ?? response.status,
        message: data?.error || response.statusText || 'Unknown Withings subscribe error'
      })
    } catch (error: any) {
      result.failed.push({
        appli,
        status: 0,
        message: error?.message || 'Network error'
      })
    }
  }

  return result
}

/**
 * Withings sends an empty-body POST (no userid) to verify the callback URL during subscribe.
 */
export function isWithingsWebhookVerification(
  params: Record<string, unknown>,
  headers: Record<string, string | undefined>
): boolean {
  if (params.userid != null && String(params.userid).length > 0) {
    return false
  }

  const hasNotificationFields =
    params.appli != null || params.startdate != null || params.enddate != null
  if (hasNotificationFields) {
    return false
  }

  const contentLength = headers['content-length']
  if (contentLength === '0') {
    return true
  }

  return Object.keys(params).length === 0
}
