import { auditLogRepository } from './repositories/auditLogRepository'
import type { H3Event } from 'h3'

export interface AuditLogOptions {
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: any
  event?: H3Event
}

/**
 * Logs a system or user action to the AuditLog table.
 * @param options - Audit log details
 */
export const logAction = async (options: AuditLogOptions) => {
  const { userId, action, resourceType, resourceId, metadata, event } = options

  let ipAddress: string | undefined
  let userAgent: string | undefined

  if (event) {
    // Attempt to get IP and User-Agent from H3 event
    // req.headers can have 'x-forwarded-for' if behind a proxy
    const headers = getProxySafeHeaders(event)
    ipAddress =
      headers['x-forwarded-for']?.toString().split(',')[0] || event.node.req.socket.remoteAddress
    userAgent = headers['user-agent']?.toString()
  }

  try {
    // We execute this asynchronously without awaiting to avoid blocking the main request
    // though in some critical cases we might want to await.
    auditLogRepository
      .log({
        userId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
        userAgent
      })
      .catch((err) => {
        console.error('Failed to create audit log (async):', err)
      })
  } catch (error) {
    console.error('Failed to initiate audit log creation:', error)
  }
}

/**
 * Helper to get headers safely from H3 event
 */
function getProxySafeHeaders(event: H3Event) {
  return event.node.req.headers
}
