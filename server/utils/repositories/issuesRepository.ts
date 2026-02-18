import { prisma } from '../db'
import type { BugStatus } from '@prisma/client'

export interface IssueMetadata {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  area: string
  issue_id: string
}

export interface ListIssuesFilters {
  userId?: string
  status?: BugStatus
  search?: string
}

export const issuesRepository = {
  /**
   * Fetch a single issue by ID.
   */
  async getById(id: string, userId?: string) {
    return prisma.bugReport
      .findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          chatRoom: {
            select: { id: true }
          }
        }
      })
      .then((issue) => {
        if (userId && issue && issue.userId !== userId) return null
        return issue
      })
  },

  /**
   * List issues with filtering and pagination.
   */
  async list(filters: ListIssuesFilters = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.status) where.status = filters.status
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    const [total, items] = await Promise.all([
      prisma.bugReport.count({ where }),
      prisma.bugReport.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ])

    return {
      total,
      items,
      totalPages: Math.ceil(total / limit)
    }
  },

  /**
   * Create a new issue.
   */
  async create(
    userId: string,
    data: { title: string; description: string; context?: any; chatRoomId?: string },
    metadata?: IssueMetadata
  ) {
    const issue = await prisma.bugReport.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        context: data.context || {},
        chatRoomId: data.chatRoomId,
        metadata: (metadata as any) || {}
      }
    })

    // this.triage(issue.id).catch(console.error)
    return issue
  },

  /**
   * Update an existing issue.
   */
  async update(
    id: string,
    data: { status?: BugStatus; priority?: string; title?: string; description?: string },
    userId?: string
  ) {
    // If userId is provided, ensure ownership
    if (userId) {
      const existing = await prisma.bugReport.findFirst({
        where: { id, userId }
      })
      if (!existing) return null
    }

    return prisma.bugReport.update({
      where: { id },
      data
    })
  },

  async updateMetadata(id: string, metadataUpdate: IssueMetadata) {
    return prisma.bugReport.update({
      where: { id },
      data: {
        metadata: metadataUpdate as any,
        priority: metadataUpdate.priority
      }
    })
  },

  /**
   * Add a comment to an issue.
   */
  async addComment(issueId: string, userId: string, content: string, isAdmin = false) {
    return prisma.bugReportComment.create({
      data: {
        bugReportId: issueId,
        userId,
        content,
        isAdmin
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })
  },

  /**
   * Run AI triage on an issue (stubbed for now)
   */
  async triage(id: string) {
    console.log(`[Triage] Starting triage for issue ${id}...`)
    // Implementation would go here
  }
}
