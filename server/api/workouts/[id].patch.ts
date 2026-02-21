import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { workoutRepository } from '../../utils/repositories/workoutRepository'
import { metabolicService } from '../../utils/services/metabolicService'
import { isNutritionTrackingEnabled } from '../../utils/nutrition/feature'

const patchSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional().nullable(),
  durationSec: z.number().optional(),
  distanceMeters: z.number().optional().nullable(),
  trainingLoad: z.number().optional().nullable(),
  tss: z.number().optional().nullable(),
  calories: z.number().int().optional().nullable(),
  elevationGain: z.number().int().optional().nullable()
})

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Update workout details',
    description:
      'Updates a specific workout by ID. Supports renaming, changing types, and overriding metrics.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              type: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              description: { type: 'string', nullable: true },
              durationSec: { type: 'number' },
              distanceMeters: { type: 'number', nullable: true },
              trainingLoad: { type: 'number', nullable: true },
              tss: { type: 'number', nullable: true },
              calories: { type: 'integer', nullable: true },
              elevationGain: { type: 'integer', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                workout: { $ref: '#/components/schemas/Workout' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      404: { description: 'Workout not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id
  const workoutId = getRouterParam(event, 'id')

  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  const body = await readValidatedBody(event, (b) => patchSchema.parse(b))
  const {
    title,
    type,
    date,
    description,
    durationSec,
    distanceMeters,
    trainingLoad,
    tss,
    calories,
    elevationGain
  } = body

  // Ensure workout belongs to user
  const workout = await workoutRepository.getById(workoutId, userId)

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found or access denied'
    })
  }

  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (type !== undefined) updateData.type = type
  if (date !== undefined) updateData.date = new Date(date)
  if (description !== undefined) updateData.description = description
  if (durationSec !== undefined) updateData.durationSec = durationSec
  if (distanceMeters !== undefined) updateData.distanceMeters = distanceMeters
  if (trainingLoad !== undefined) updateData.trainingLoad = trainingLoad
  if (tss !== undefined) updateData.tss = tss
  if (calories !== undefined) updateData.calories = calories
  if (elevationGain !== undefined) updateData.elevationGain = elevationGain

  if (Object.keys(updateData).length === 0) {
    return { success: true, workout }
  }

  try {
    const updatedWorkout = await workoutRepository.update(workoutId, updateData)

    // If type, date, or load changed, recalculate fueling plans
    const hasCriticalChange =
      (type && type !== workout.type) ||
      (date && new Date(date).getTime() !== workout.date.getTime()) ||
      (trainingLoad !== undefined && trainingLoad !== workout.trainingLoad) ||
      (tss !== undefined && tss !== workout.tss)

    if (hasCriticalChange) {
      try {
        if (await isNutritionTrackingEnabled(userId)) {
          await metabolicService.calculateFuelingPlanForDate(userId, workout.date, {
            persist: true
          })

          // If date changed, also refresh the new date
          if (date && new Date(date).getTime() !== workout.date.getTime()) {
            await metabolicService.calculateFuelingPlanForDate(userId, new Date(date), {
              persist: true
            })
          }
        }
      } catch (err) {
        console.error('[WorkoutUpdate] Failed to trigger fueling regeneration:', err)
      }
    }

    return {
      success: true,
      workout: updatedWorkout
    }
  } catch (error) {
    console.error('Error updating workout:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to update workout'
    })
  }
})
