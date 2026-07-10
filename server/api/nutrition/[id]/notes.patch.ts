import { requireAuth } from '../../../utils/auth-guard'
import { nutritionRepository } from '../../../utils/repositories/nutritionRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Update nutrition notes',
    description: 'Updates the notes for a specific nutrition entry.',
    inputSchema: [
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
              notes: { type: 'string', nullable: true }
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
                nutrition: { type: 'object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      404: { description: 'Nutrition entry not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id

  const nutritionId = getRouterParam(event, 'id')
  if (!nutritionId) {
    throw createError({
      statusCode: 400,
      message: 'Nutrition ID is required'
    })
  }

  const body = await readBody(event)
  const { notes } = body

  if (typeof notes !== 'string' && notes !== null) {
    throw createError({
      statusCode: 400,
      message: 'Notes must be a string or null'
    })
  }

  let nutrition: any
  if (/^\d{4}-\d{2}-\d{2}$/.test(nutritionId)) {
    const dateObj = new Date(`${nutritionId}T00:00:00Z`)
    nutrition = await nutritionRepository.getByDate(userId, dateObj)
  } else {
    nutrition = await nutritionRepository.getById(nutritionId, userId)
  }

  if (!nutrition) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(nutritionId)) {
      const dateObj = new Date(`${nutritionId}T00:00:00Z`)
      const created = await nutritionRepository.create({
        userId,
        date: dateObj,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        notes,
        notesUpdatedAt: new Date()
      })

      return {
        success: true,
        nutrition: created
      }
    }

    throw createError({
      statusCode: 404,
      message: 'Nutrition entry not found'
    })
  }

  const updatedNutrition = await nutritionRepository.update(nutrition.id, {
    notes: notes,
    notesUpdatedAt: new Date()
  })

  return {
    success: true,
    nutrition: updatedNutrition
  }
})
