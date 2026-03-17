import { z } from 'zod'
import { prisma } from '../db'

export const libraryTools = (userId: string) => ({
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
      tags: z.array(z.string()).optional().describe('Organization tags')
    }),
    execute: async (args: any) => {
      try {
        const template = await (prisma as any).workoutTemplate.create({
          data: {
            userId,
            ...args,
            tags: args.tags || []
          }
        })
        return {
          success: true,
          message: `Saved "${args.title}" to your workout library.`,
          templateId: template.id
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
      category: z.string().optional().describe('Filter by training category')
    }),
    execute: async (args: any) => {
      try {
        const where: any = { userId }
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
          templates,
          message: `Found ${templates.length} workout templates.`
        }
      } catch (error: any) {
        return { success: false, message: error.message }
      }
    }
  }
})
