import {
  imageGenerator,
  normalizeWorkoutImageRatio,
  normalizeWorkoutImageStyle,
  normalizeWorkoutImageVariant
} from '../../../../utils/sharing/image-generator'
import { workoutRepository } from '../../../../utils/repositories/workoutRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'Get workout share image',
    description: 'Generates and returns a PNG image for a shared workout.',
    parameters: [
      {
        name: 'token',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'image/png': {
            schema: { type: 'string', format: 'binary' }
          }
        }
      },
      404: { description: 'Workout not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  const query = getQuery(event)

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const variant = normalizeWorkoutImageVariant(
    typeof query.variant === 'string' ? query.variant : null
  )
  const style = normalizeWorkoutImageStyle(typeof query.style === 'string' ? query.style : null)
  const ratio = normalizeWorkoutImageRatio(typeof query.ratio === 'string' ? query.ratio : null)

  const shareToken = await prisma.shareToken.findUnique({
    where: { token }
  })

  if (!shareToken || shareToken.resourceType !== 'WORKOUT') {
    throw createError({ statusCode: 404, message: 'Workout share link not found' })
  }

  // Check expiration if needed
  if (shareToken.expiresAt && new Date() > shareToken.expiresAt) {
    throw createError({ statusCode: 410, message: 'Share link has expired' })
  }

  const workout = await workoutRepository.getById(shareToken.resourceId, shareToken.userId, {
    include: {
      streams: true
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  try {
    const pngBuffer = await imageGenerator.generateWorkoutImage(workout as any, {
      variant,
      style,
      ratio
    })

    // Set cache headers (1 day)
    setResponseHeader(event, 'Content-Type', 'image/png')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')

    return pngBuffer
  } catch (error) {
    console.error('[WorkoutImageAPI] Failed to generate image', error)
    throw createError({ statusCode: 500, message: 'Failed to generate share image' })
  }
})
