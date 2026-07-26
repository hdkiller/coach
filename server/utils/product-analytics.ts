import { ANALYTICS_EVENTS } from '../../shared/analytics-events'
import { auditLogRepository } from './repositories/auditLogRepository'
import { prisma } from './db'

const ACCOUNT_CREATED_ACTION = 'ACCOUNT_CREATED'

type AccountCreatedMetadata = {
  method: string
  entry_point?: string
  ga4_server_sent?: boolean
  ga4_client_claimed?: boolean
}

function isClaimableMetadata(metadata: AccountCreatedMetadata | null | undefined) {
  return !metadata?.ga4_client_claimed && !metadata?.ga4_server_sent
}

export async function sendGa4MeasurementEvent(options: {
  userId: string
  eventName: string
  params?: Record<string, string | number | boolean>
}) {
  const measurementId =
    process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID ||
    (process.env.NUXT_PUBLIC_GTAG_ID?.startsWith('G-')
      ? process.env.NUXT_PUBLIC_GTAG_ID
      : 'G-M3CJW4RW5S')
  const apiSecret = process.env.NUXT_GA_MEASUREMENT_API_SECRET

  if (!measurementId || !apiSecret) {
    return false
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: options.userId,
          user_id: options.userId,
          events: [
            {
              name: options.eventName,
              params: options.params ?? {}
            }
          ]
        })
      }
    )

    return response.ok
  } catch (error) {
    console.error('[ProductAnalytics] Failed to send GA4 measurement event:', error)
    return false
  }
}

async function reserveAccountCreatedServerSend(logId: string, metadata: AccountCreatedMetadata) {
  const updated = await prisma.auditLog.updateMany({
    where: {
      id: logId,
      action: ACCOUNT_CREATED_ACTION,
      AND: [
        { metadata: { path: ['ga4_client_claimed'], equals: false } },
        { metadata: { path: ['ga4_server_sent'], equals: false } }
      ]
    },
    data: {
      metadata: {
        ...metadata,
        ga4_server_sent: true
      }
    }
  })

  return updated.count === 1
}

async function reserveAccountCreatedClientClaim(logId: string, metadata: AccountCreatedMetadata) {
  const updated = await prisma.auditLog.updateMany({
    where: {
      id: logId,
      action: ACCOUNT_CREATED_ACTION,
      AND: [
        { metadata: { path: ['ga4_client_claimed'], equals: false } },
        { metadata: { path: ['ga4_server_sent'], equals: false } }
      ]
    },
    data: {
      metadata: {
        ...metadata,
        ga4_client_claimed: true
      }
    }
  })

  return updated.count === 1
}

export async function recordAccountCreated(userId: string, method: string, entryPoint = 'oauth') {
  const existing = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: ACCOUNT_CREATED_ACTION
    },
    select: { id: true }
  })

  if (existing) {
    return { created: false }
  }

  const metadata: AccountCreatedMetadata = {
    method,
    entry_point: entryPoint,
    ga4_server_sent: false,
    ga4_client_claimed: false
  }

  const createdLog = await auditLogRepository.log({
    userId,
    action: ACCOUNT_CREATED_ACTION,
    metadata
  })

  const reserved = await reserveAccountCreatedServerSend(createdLog.id, metadata)
  if (!reserved) {
    return { created: true, ga4ServerSent: false }
  }

  const ga4ServerSent = await sendGa4MeasurementEvent({
    userId,
    eventName: ANALYTICS_EVENTS.ACCOUNT_CREATED,
    params: {
      method,
      entry_point: entryPoint
    }
  })

  if (!ga4ServerSent) {
    await prisma.auditLog.update({
      where: { id: createdLog.id },
      data: {
        metadata: {
          ...metadata,
          ga4_server_sent: false
        }
      }
    })
  }

  return { created: true, ga4ServerSent }
}

export async function claimAccountCreatedForClient(userId: string) {
  const log = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: ACCOUNT_CREATED_ACTION
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!log) {
    return { claim: false as const }
  }

  const metadata = (log.metadata ?? {}) as AccountCreatedMetadata

  if (!isClaimableMetadata(metadata)) {
    return { claim: false as const }
  }

  const reserved = await reserveAccountCreatedClientClaim(log.id, metadata)
  if (!reserved) {
    return { claim: false as const }
  }

  return {
    claim: true as const,
    method: metadata.method,
    entry_point: metadata.entry_point ?? 'oauth'
  }
}
