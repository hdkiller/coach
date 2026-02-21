import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../db'
import { issuesRepository } from '../repositories/issuesRepository'
import { BugStatus } from '@prisma/client'
import type { AiSettings } from '../ai-user-settings'

const bugStatusSchema = z.nativeEnum(BugStatus)
const ticketCreateSchema = z.object({
  title: z.string().describe('Short, descriptive title of the bug/ticket'),
  description: z
    .string()
    .describe('Detailed description of what went wrong, including expected vs actual behavior'),
  context: z
    .any()
    .optional()
    .describe('Any relevant technical context or session state that might help debug the issue')
})

export const supportTools = (userId: string, chatRoomId?: string, aiSettings?: AiSettings) => ({
  ticket_create: tool({
    description:
      'Create a new support ticket. Use this when the user reports a new issue or feature request.',
    inputSchema: ticketCreateSchema,
    needsApproval: async () => !!aiSettings?.aiRequireToolApproval,
    execute: async ({ title, description, context }) => {
      try {
        const bugReport = await prisma.bugReport.create({
          data: {
            userId,
            chatRoomId,
            title,
            description,
            context,
            status: 'OPEN'
          }
        })
        return {
          success: true,
          message: `Ticket successfully created. Internal ID: ${bugReport.id}`,
          id: bugReport.id
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to create ticket: ${error.message}`
        }
      }
    }
  }),

  report_bug: tool({
    description:
      'Legacy alias for ticket_create. Report a bug or technical issue to the developers.',
    inputSchema: ticketCreateSchema,
    needsApproval: async () => !!aiSettings?.aiRequireToolApproval,
    execute: async ({ title, description, context }) => {
      try {
        const bugReport = await prisma.bugReport.create({
          data: {
            userId,
            chatRoomId,
            title,
            description,
            context,
            status: 'OPEN'
          }
        })
        return {
          success: true,
          message: `Bug report successfully submitted. Internal ID: ${bugReport.id}`,
          id: bugReport.id
        }
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to submit bug report: ${error.message}`
        }
      }
    }
  }),

  find_bug_reports: tool({
    description:
      'Find existing bug reports submitted by the user. Use this when the user asks about the status of their reports or wants to modify one.',
    inputSchema: z.object({
      status: bugStatusSchema.optional(),
      limit: z.number().optional().default(5)
    }),
    execute: async ({ status, limit = 5 }) => {
      try {
        const reports = await prisma.bugReport.findMany({
          where: {
            userId,
            ...(status ? { status } : {})
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            description: true
          }
        })

        return {
          count: reports.length,
          reports
        }
      } catch (error: any) {
        return { error: `Failed to fetch bug reports: ${error.message}` }
      }
    }
  }),

  ticket_get: tool({
    description:
      'Get a support ticket by ID, including title, description, status, and optional comments.',
    inputSchema: z.object({
      ticket_id: z.string().describe('The ID of the ticket (bug report)'),
      include_comments: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include ticket comments')
    }),
    execute: async ({ ticket_id, include_comments = true }) => {
      try {
        const report = await issuesRepository.getById(ticket_id, userId)
        if (!report) return { error: 'Ticket not found or access denied.' }

        return {
          ticket: {
            id: report.id,
            title: report.title,
            description: report.description,
            status: report.status,
            priority: report.priority,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            comments: include_comments
              ? report.comments.map((comment) => ({
                  id: comment.id,
                  content: comment.content,
                  createdAt: comment.createdAt,
                  isAdmin: comment.isAdmin,
                  type: comment.type,
                  author: {
                    id: comment.user.id,
                    name: comment.user.name
                  }
                }))
              : []
          }
        }
      } catch (error: any) {
        return { error: `Failed to fetch ticket: ${error.message}` }
      }
    }
  }),

  ticket_search: tool({
    description:
      'Search support tickets by text and status for the current user. Use this to find matching tickets.',
    inputSchema: z.object({
      query: z.string().optional().describe('Text search across title/description'),
      status: bugStatusSchema.optional().describe('Filter by ticket status'),
      limit: z.number().optional().default(10),
      page: z.number().optional().default(1)
    }),
    execute: async ({ query, status, limit = 10, page = 1 }) => {
      try {
        const { items, total, totalPages } = await issuesRepository.list(
          { userId, status, search: query },
          page,
          limit
        )

        return {
          total,
          totalPages,
          page,
          count: items.length,
          tickets: items.map((report) => ({
            id: report.id,
            title: report.title,
            description: report.description,
            status: report.status,
            priority: report.priority,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
            lastReplyAt: report.comments?.[0]?.createdAt || null
          }))
        }
      } catch (error: any) {
        return { error: `Failed to search tickets: ${error.message}` }
      }
    }
  }),

  ticket_update: tool({
    description:
      'Update ticket fields (title, description, status) for a ticket owned by the current user.',
    inputSchema: z.object({
      ticket_id: z.string().describe('The ID of the ticket to update'),
      title: z.string().min(3).max(100).optional(),
      description: z.string().min(10).max(2000).optional(),
      status: bugStatusSchema.optional()
    }),
    needsApproval: async () => !!aiSettings?.aiRequireToolApproval,
    execute: async ({ ticket_id, title, description, status }) => {
      if (!title && !description && !status) {
        return { error: 'Provide at least one field to update (title, description, or status).' }
      }

      try {
        const updated = await issuesRepository.update(
          ticket_id,
          {
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
            ...(status ? { status } : {})
          },
          userId
        )

        if (!updated) return { error: 'Ticket not found or access denied.' }

        return {
          success: true,
          message: 'Ticket updated successfully.',
          ticket: {
            id: updated.id,
            title: updated.title,
            description: updated.description,
            status: updated.status,
            updatedAt: updated.updatedAt
          }
        }
      } catch (error: any) {
        return { error: `Failed to update ticket: ${error.message}` }
      }
    }
  }),

  ticket_comment: tool({
    description: 'Add a new message comment to an existing ticket owned by the current user.',
    inputSchema: z.object({
      ticket_id: z.string().describe('The ID of the ticket'),
      content: z.string().min(1).max(2000).describe('The comment text to add')
    }),
    needsApproval: async () => !!aiSettings?.aiRequireToolApproval,
    execute: async ({ ticket_id, content }) => {
      try {
        const report = await issuesRepository.getById(ticket_id, userId)
        if (!report) return { error: 'Ticket not found or access denied.' }

        const comment = await issuesRepository.addComment(
          ticket_id,
          userId,
          content,
          false,
          'MESSAGE'
        )

        return {
          success: true,
          message: 'Comment added to ticket.',
          comment: {
            id: comment.id,
            ticketId: comment.bugReportId,
            content: comment.content,
            createdAt: comment.createdAt,
            author: {
              id: comment.user.id,
              name: comment.user.name
            }
          }
        }
      } catch (error: any) {
        return { error: `Failed to add ticket comment: ${error.message}` }
      }
    }
  })
})
