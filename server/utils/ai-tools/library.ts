import { z } from 'zod'
import { prisma } from '../db'
import { getLibraryOwnerScope, groupLibraryItemsByOwner } from '../library-access'

export const libraryTools = (userId: string, actorUserId: string = userId) => ({
  save_to_workout_library: {
    description: 'Saves a structured workout definition to the user library for future reuse.',
    parameters: z.object({
      title: z.string().describe('The title of the workout'),
      description: z.string().optional().describe('Brief description of the session'),
      type: z.string().describe('Type of workout (e.g. Ride, Run, Swim)'),
      sport: z.string().default('Cycling').describe('Sport category'),
      category: z.string().optional().describe('Training category (e.g. Threshold, VO2Max)'),
      structuredWorkout: z.any().describe('The full structured interval JSON definition'),
      durationSec: z.number().int().describe('Total duration in seconds'),
      tss: z.number().optional().describe('Estimated Training Stress Score'),
      tags: z.array(z.string()).optional().describe('Organization tags'),
      ownerScope: z.enum(['athlete', 'coach']).optional()
    }),
    execute: async (args: any) => {
      try {
        const ownerUserId =
          args.ownerScope === 'athlete' || actorUserId === userId ? userId : actorUserId
        const { ownerScope, ...templateData } = args
        const template = await (prisma as any).workoutTemplate.create({
          data: {
            userId: ownerUserId,
            ...templateData,
            tags: templateData.tags || []
          }
        })
        return {
          success: true,
          message: `Saved "${args.title}" to your workout library.`,
          templateId: template.id,
          ownerScope: actorUserId !== userId && ownerUserId === actorUserId ? 'coach' : 'athlete'
        }
      } catch (error: any) {
        return { success: false, message: error.message }
      }
    }
  },

  search_workout_library: {
    description: 'Searches the user workout library for existing templates.',
    parameters: z.object({
      query: z.string().optional().describe('Text search for title or category'),
      type: z.string().optional().describe('Filter by workout type'),
      category: z.string().optional().describe('Filter by training category'),
      scope: z.enum(['athlete', 'coach', 'all']).optional()
    }),
    execute: async (args: any) => {
      try {
        const scope = args.scope || (actorUserId !== userId ? 'coach' : 'athlete')
        const ownerIds =
          scope === 'coach'
            ? [actorUserId]
            : scope === 'all' && actorUserId !== userId
              ? [actorUserId, userId]
              : [userId]
        const where: any = { userId: { in: ownerIds } }
        if (args.query) {
          where.OR = [
            { title: { contains: args.query, mode: 'insensitive' } },
            { category: { contains: args.query, mode: 'insensitive' } }
          ]
        }
        if (args.type) where.type = args.type
        if (args.category) where.category = args.category

        const templates = await (prisma as any).workoutTemplate.findMany({
          where,
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            userId: true,
            title: true,
            type: true,
            category: true,
            durationSec: true,
            tss: true
          }
        })

        if (templates.length === 0) {
          return { message: 'No matching workout templates found in your library.' }
        }

        return {
          templates:
            scope === 'all' && actorUserId !== userId
              ? groupLibraryItemsByOwner(
                  {
                    effectiveUserId: userId,
                    actorUserId,
                    isCoaching: true,
                    originalUserId: actorUserId
                  },
                  templates
                )
              : templates.map((template: any) => ({
                  ...template,
                  ownerUserId: template.userId,
                  ownerScope: getLibraryOwnerScope(
                    {
                      effectiveUserId: userId,
                      actorUserId,
                      isCoaching: actorUserId !== userId,
                      originalUserId: actorUserId !== userId ? actorUserId : null
                    },
                    template.userId
                  )
                })),
          message: `Found ${templates.length} workout templates.`
        }
      } catch (error: any) {
        return { success: false, message: error.message }
      }
    }
  }
})
