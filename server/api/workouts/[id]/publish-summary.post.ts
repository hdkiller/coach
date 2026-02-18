import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { updateIntervalsActivityDescription } from '../../../utils/intervals'

const SUMMARY_BLOCK_START = '[CoachWattz AI Summary]'
const SUMMARY_BLOCK_END = '[/CoachWattz AI Summary]'

function upsertSummaryBlock(
  existingDescription: string | null | undefined,
  summary: string
): string {
  const current = (existingDescription || '').trim()
  const summaryBlockRegex = /\n?\[CoachWattz AI Summary\][\s\S]*?\[\/CoachWattz AI Summary\]\n?/g
  const withoutPreviousSummary = current.replace(summaryBlockRegex, '').trim()
  const nextBlock = `${SUMMARY_BLOCK_START}\n${summary}\n${SUMMARY_BLOCK_END}`

  return withoutPreviousSummary ? `${withoutPreviousSummary}\n\n${nextBlock}` : nextBlock
}

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Publish AI workout summary to Intervals.icu',
    description:
      'Publishes the workout AI executive summary to the linked Intervals.icu activity description.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Workout is not eligible for Intervals publish' },
      401: { description: 'Unauthorized' },
      404: { description: 'Workout not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  if (!workoutId) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const userId = (session.user as any).id

  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      userId
    },
    select: {
      id: true,
      source: true,
      externalId: true,
      description: true,
      aiAnalysisJson: true
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  if (workout.source !== 'intervals') {
    throw createError({
      statusCode: 400,
      message: 'Only Intervals.icu workouts can be published back to Intervals notes'
    })
  }

  const summary =
    typeof (workout.aiAnalysisJson as any)?.executive_summary === 'string'
      ? ((workout.aiAnalysisJson as any).executive_summary as string).trim()
      : ''

  if (!summary) {
    throw createError({
      statusCode: 400,
      message: 'No AI Workout Summary available. Generate analysis first.'
    })
  }

  const integration = await prisma.integration.findFirst({
    where: {
      userId,
      provider: 'intervals'
    }
  })

  if (!integration) {
    throw createError({ statusCode: 400, message: 'Intervals.icu integration not found' })
  }

  const mergedDescription = upsertSummaryBlock(workout.description, summary)

  await updateIntervalsActivityDescription(integration, workout.externalId, mergedDescription)

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      description: mergedDescription
    }
  })

  return {
    success: true,
    message: 'AI workout summary published to Intervals.icu notes'
  }
})
