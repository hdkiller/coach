import { z } from 'zod'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { calculateSegmentMetricsFromStreams } from '../../../utils/analytics/segment-summary'

const segmentSummarySchema = z
  .object({
    startIndex: z.number().int().nonnegative().optional(),
    endIndex: z.number().int().nonnegative().optional(),
    startTime: z.number().finite().nonnegative().optional(),
    endTime: z.number().finite().nonnegative().optional()
  })
  .refine(
    (value) =>
      (value.startIndex !== undefined && value.endIndex !== undefined) ||
      (value.startTime !== undefined && value.endTime !== undefined),
    {
      message: 'Provide either startIndex/endIndex or startTime/endTime'
    }
  )

function findIndexAtOrAfter(values: number[], target: number) {
  const index = values.findIndex((value) => value >= target)
  return index === -1 ? values.length - 1 : index
}

function findIndexAtOrBefore(values: number[], target: number) {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index]
    if (value !== undefined && value <= target) return index
  }
  return 0
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const workoutId = getRouterParam(event, 'id')
  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  const body = await readValidatedBody(event, segmentSummarySchema.parse)

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { streams: true }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found'
    })
  }

  if (workout.userId !== (session.user as any).id) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    })
  }

  const streams = workout.streams as any
  const time = Array.isArray(streams?.time) ? (streams.time as number[]) : []
  if (time.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Workout streams unavailable'
    })
  }

  let startIndex = body.startIndex
  let endIndex = body.endIndex

  if (startIndex === undefined || endIndex === undefined) {
    startIndex = findIndexAtOrAfter(time, body.startTime!)
    endIndex = findIndexAtOrBefore(time, body.endTime!)
  }

  if (startIndex > endIndex) {
    ;[startIndex, endIndex] = [endIndex, startIndex]
  }

  if (startIndex === endIndex) {
    throw createError({
      statusCode: 400,
      message: 'Selected segment is too short'
    })
  }

  return calculateSegmentMetricsFromStreams(
    {
      time,
      distance: Array.isArray(streams.distance) ? streams.distance : undefined,
      watts: Array.isArray(streams.watts) ? streams.watts : undefined,
      heartrate: Array.isArray(streams.heartrate) ? streams.heartrate : undefined,
      cadence: Array.isArray(streams.cadence) ? streams.cadence : undefined,
      altitude: Array.isArray(streams.altitude) ? streams.altitude : undefined
    },
    startIndex,
    endIndex
  )
})
