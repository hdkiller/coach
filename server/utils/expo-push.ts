import { prisma } from './db'
import { isMobilePushTypeEnabled } from './mobile-push-preferences'

export type ExpoPushEventType =
  'RECOMMENDATION_READY' | 'WORKOUT_ANALYSIS_READY' | 'SYNC_COMPLETED' | 'COACH_MESSAGE'

export type ExpoPushPayload = {
  title: string
  body: string
  type: ExpoPushEventType
  path?: string
  notificationId?: string
  extra?: Record<string, string | number | boolean | null>
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function buildExpoPushHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json'
  }

  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return headers
}

function tokenSuffix(token: string | undefined): string | undefined {
  if (!token || token.length < 8) return undefined
  return token.slice(-8)
}

/**
 * Send an Expo push to all registered devices for a user.
 * Honors server push preferences (issue 365). Best-effort: never throws to
 * callers; logs skips / failures and prunes DeviceNotRegistered tokens.
 *
 * Optional `EXPO_ACCESS_TOKEN` is sent as `Authorization: Bearer …` when set.
 * Receipt polling is intentionally deferred — see docs/04-guides/expo-push.md.
 */
export async function sendExpoPushToUser(userId: string, payload: ExpoPushPayload): Promise<void> {
  try {
    const enabled = await isMobilePushTypeEnabled(userId, payload.type)
    if (!enabled) {
      console.info(`Expo push skipped for user ${userId}: preference disabled`, {
        type: payload.type,
        reason: 'preference_disabled'
      })
      return
    }

    const devices = await prisma.mobilePushDevice.findMany({
      where: { userId },
      select: { id: true, token: true }
    })

    if (devices.length === 0) {
      return
    }

    const messages = devices.map((device) => ({
      to: device.token,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: {
        type: payload.type,
        ...(payload.path ? { path: payload.path } : {}),
        ...(payload.notificationId ? { notificationId: payload.notificationId } : {}),
        ...(payload.extra ?? {})
      }
    }))

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: buildExpoPushHeaders(),
      body: JSON.stringify(messages)
    })

    if (!response.ok) {
      console.warn(`Expo push send failed for user ${userId}: HTTP ${response.status}`, {
        userId,
        type: payload.type,
        notificationId: payload.notificationId,
        deviceCount: devices.length,
        httpStatus: response.status,
        reason: 'http_error'
      })
      return
    }

    const json = (await response.json()) as { data?: ExpoPushTicket[] }
    const tickets = json.data ?? []
    const staleTokens: string[] = []
    let okCount = 0
    let ticketErrorCount = 0
    let receiptIdCount = 0

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      const device = devices[i]
      if (!ticket) continue

      if (ticket.status === 'ok') {
        okCount++
        if (ticket.id) receiptIdCount++
        continue
      }

      ticketErrorCount++
      const errorCode = ticket.details?.error

      if (errorCode === 'DeviceNotRegistered') {
        const token = device?.token
        if (token) staleTokens.push(token)
        continue
      }

      // MessageTooBig, MessageRateExceeded, InvalidCredentials, etc.
      console.warn('Expo push ticket error', {
        userId,
        type: payload.type,
        notificationId: payload.notificationId,
        deviceId: device?.id,
        tokenSuffix: tokenSuffix(device?.token),
        ticketIndex: i,
        error: errorCode ?? 'unknown',
        message: ticket.message,
        reason: 'ticket_error'
      })
    }

    if (staleTokens.length > 0) {
      await prisma.mobilePushDevice.deleteMany({
        where: { token: { in: staleTokens } }
      })
    }

    console.info('Expo push send completed', {
      userId,
      type: payload.type,
      notificationId: payload.notificationId,
      deviceCount: devices.length,
      ok: okCount,
      ticketErrors: ticketErrorCount,
      pruned: staleTokens.length,
      receiptIdCount,
      reason: 'send_completed'
    })
  } catch (error) {
    console.warn(`Expo push send failed for user ${userId}:`, error)
  }
}
