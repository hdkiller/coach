import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Get workout streams',
    description: 'Returns stream data (HR, power, cadence, etc.) for a list of workout IDs.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['workoutIds'],
            properties: {
              workoutIds: { type: 'array', items: { type: 'string' } },
              points: {
                type: 'number',
                description: 'Target number of points for downsampling (default 2000)'
              },
              keys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific stream keys to return'
              }
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
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  workoutId: { type: 'string' },
                  time: { type: 'array' },
                  watts: { type: 'array' },
                  heartrate: { type: 'array' },
                  cadence: { type: 'array' },
                  hrZoneTimes: { type: 'array' },
                  powerZoneTimes: { type: 'array' }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
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

  const body = await readBody(event)
  const { workoutIds, points, keys } = body

  if (!workoutIds || !Array.isArray(workoutIds) || workoutIds.length === 0) {
    return []
  }

  // Verify workouts belong to user
  const workouts = await prisma.workout.findMany({
    where: {
      id: { in: workoutIds },
      userId: (session.user as any).id
    },
    select: {
      id: true
    }
  })

  const verifiedIds = workouts.map((w) => w.id)

  if (verifiedIds.length === 0) {
    return []
  }

  // Define allowed keys to prevent leaking sensitive or internal fields
  const allowedKeys = [
    'time',
    'watts',
    'heartrate',
    'cadence',
    'velocity',
    'altitude',
    'distance',
    'grade_smooth',
    'latlng',
    'moving',
    'grade',
    'hrZoneTimes',
    'powerZoneTimes',
    'lapSplits',
    'paceZones'
  ]

  // Default keys if none specified (optimized for bulk fetching)
  const defaultKeys = ['time', 'watts', 'heartrate', 'cadence', 'hrZoneTimes', 'powerZoneTimes']

  const requestedKeys =
    keys && Array.isArray(keys) ? keys.filter((k) => allowedKeys.includes(k)) : defaultKeys

  // Build Prisma select object
  const select: Record<string, boolean> = {
    id: true,
    workoutId: true
  }
  requestedKeys.forEach((k) => {
    select[k] = true
  })

  // Fetch streams for verified workouts with limited fields
  const streams = await prisma.workoutStream.findMany({
    where: {
      workoutId: { in: verifiedIds }
    },
    select: select as any
  })

  // Downsample streams to prevent large payloads (Fixes COACH-WATTS-A)
  const TARGET_POINTS = typeof points === 'number' && points > 0 ? points : 2000
  const keysToSample = [
    'time',
    'watts',
    'heartrate',
    'cadence',
    'velocity',
    'altitude',
    'distance',
    'grade_smooth',
    'latlng',
    'grade'
  ]

  return streams.map((stream: any) => {
    // If time stream is short enough, return as is (but only with selected keys)
    if (!stream.time || !Array.isArray(stream.time) || stream.time.length <= TARGET_POINTS) {
      return stream
    }

    const processedStream = { ...stream }
    const step = stream.time.length / TARGET_POINTS

    keysToSample.forEach((key) => {
      // Only sample if key was requested
      if (!requestedKeys.includes(key)) return

      const data = processedStream[key]
      if (data && Array.isArray(data)) {
        const sampled: any[] = []
        for (let i = 0; i < TARGET_POINTS; i++) {
          const index = Math.floor(i * step)
          if (index < data.length) {
            sampled.push(data[index])
          }
        }
        processedStream[key] = sampled
      }
    })

    return processedStream
  })
})
