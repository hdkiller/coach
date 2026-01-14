import { prisma } from '../db'
import type { Prisma } from '@prisma/client'

export const auditLogRepository = {
  /**
   * Create a new audit log entry
   */
  async log(data: {
    userId?: string | null
    action: string
    resourceType?: string | null
    resourceId?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    metadata?: Record<string, any>
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as Prisma.InputJsonValue
      }
    })
  },

  /**
   * Get audit logs for a specific user
   */
  async getByUserId(userId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  },

  /**
   * Get all audit logs for admin with pagination and filtering
   */
  async getAll(options: {
    page?: number
    limit?: number
    userId?: string
    action?: string
    resourceType?: string
  }) {
    const page = options.page || 1
    const limit = options.limit || 50
    const skip = (page - 1) * limit

    const where: Prisma.AuditLogWhereInput = {}
    if (options.userId) where.userId = options.userId
    if (options.action) where.action = { contains: options.action, mode: 'insensitive' }
    if (options.resourceType) where.resourceType = options.resourceType

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })
    ])

    return {
      logs,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}
