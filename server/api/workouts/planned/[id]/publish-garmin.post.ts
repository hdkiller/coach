import { prisma } from '../../../../utils/db'
import { getServerSession } from '../../../../utils/session'
import {
  buildGarminCoursePayload,
  buildGarminTrainingPayload,
  createGarminCourse,
  createGarminWorkout,
  createGarminWorkoutSchedule,
  updateGarminWorkout,
  updateGarminWorkoutSchedule
} from '../../../../utils/garmin-push'
import { fetchGarminUserPermissions } from '../../../../utils/garmin'
import { plannedWorkoutPublishRepository } from '../../../../utils/repositories/plannedWorkoutPublishRepository'

type PublishDestination = 'training' | 'course'

function parseScope(scope: string | null | undefined): Set<string> {
  if (!scope) return new Set()
  return new Set(
    scope
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  )
}

function toDateOnly(value: Date): string {
  return value.toISOString().split('T')[0]!
}

function extractCourseGeoPoints(workout: any): any[] {
  const structured = workout?.structuredWorkout as any
  const raw = workout?.rawJson as any

  const candidates = [
    structured?.geoPoints,
    structured?.route?.geoPoints,
    structured?.route?.points,
    raw?.geoPoints,
    raw?.route?.geoPoints,
    raw?.route?.points
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate
  }
  return []
}

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Publish planned workout to Garmin',
    description: 'Publishes a planned workout to Garmin Training API or Courses API.',
    responses: {
      200: { description: 'Published successfully' },
      400: { description: 'Invalid request or missing permissions' },
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

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing workout ID' })

  const body = await readBody<{ destination?: PublishDestination }>(event).catch(() => ({}) as any)
  const destination: PublishDestination = body?.destination === 'course' ? 'course' : 'training'

  const userId = (session.user as any).id as string

  const workout = await prisma.plannedWorkout.findUnique({
    where: { id, userId }
  })
  if (!workout) throw createError({ statusCode: 404, message: 'Workout not found' })

  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'garmin' }
  })
  if (!integration) {
    throw createError({ statusCode: 400, message: 'Garmin integration not found' })
  }

  let scopes = parseScope(integration.scope)
  if (scopes.size === 0) {
    try {
      const permissions = await fetchGarminUserPermissions(integration as any)
      if (permissions.length > 0) {
        scopes = new Set(permissions.map((permission) => permission.toUpperCase()))
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            scope: permissions.join(' '),
            errorMessage: null
          }
        })
      }
    } catch (error) {
      console.warn('[GarminPublish] Failed to fetch permissions from Garmin API', error)
    }
  }
  if (destination === 'training' && !scopes.has('WORKOUT_IMPORT')) {
    throw createError({
      statusCode: 400,
      message:
        'Garmin WORKOUT_IMPORT permission is required. Reconnect Garmin and grant permission.'
    })
  }
  if (destination === 'course' && !scopes.has('COURSE_IMPORT')) {
    throw createError({
      statusCode: 400,
      message: 'Garmin COURSE_IMPORT permission is required. Reconnect Garmin and grant permission.'
    })
  }

  const provider = destination === 'training' ? 'garmin_training' : 'garmin_courses'
  const existingTarget = await plannedWorkoutPublishRepository.getByProvider(id, provider)

  try {
    if (destination === 'training') {
      const payload = buildGarminTrainingPayload({
        ...workout,
        steps: (workout.structuredWorkout as any)?.steps || []
      })

      let workoutId = existingTarget?.externalId || null
      if (workoutId) {
        try {
          await updateGarminWorkout(integration, workoutId, payload)
        } catch (e: any) {
          if (String(e?.message || '').includes('(404)')) {
            workoutId = null
          } else {
            throw e
          }
        }
      }

      if (!workoutId) {
        const created = await createGarminWorkout(integration, payload)
        workoutId = String(created?.workoutId || created?.id || '')
      }

      if (!workoutId) {
        throw new Error('Garmin workout created but no workoutId was returned')
      }

      const schedulePayload = {
        workoutId: Number(workoutId),
        date: toDateOnly(workout.date)
      }

      let scheduleId = existingTarget?.scheduleId || null
      if (scheduleId) {
        try {
          await updateGarminWorkoutSchedule(integration, scheduleId, schedulePayload)
        } catch (e: any) {
          if (String(e?.message || '').includes('(404)')) {
            scheduleId = null
          } else {
            throw e
          }
        }
      }
      if (!scheduleId) {
        const createdScheduleId = await createGarminWorkoutSchedule(integration, schedulePayload)
        scheduleId = String(createdScheduleId)
      }

      const now = new Date()
      await plannedWorkoutPublishRepository.upsert(id, provider, {
        externalId: workoutId,
        scheduleId,
        status: 'SYNCED',
        error: null,
        lastSyncedAt: now
      })

      return {
        success: true,
        message: 'Workout published to Garmin Training API.',
        destination,
        target: {
          provider,
          externalId: workoutId,
          scheduleId,
          status: 'SYNCED',
          lastSyncedAt: now
        }
      }
    }

    const geoPoints = extractCourseGeoPoints(workout)
    const coursePayload = buildGarminCoursePayload({
      ...workout,
      geoPoints
    })

    const course = await createGarminCourse(integration, coursePayload)
    const courseId = String(course?.courseId || course?.id || '')
    if (!courseId) throw new Error('Garmin course created but no courseId was returned')

    const now = new Date()
    await plannedWorkoutPublishRepository.upsert(id, provider, {
      externalId: courseId,
      status: 'SYNCED',
      error: null,
      lastSyncedAt: now
    })

    return {
      success: true,
      message: 'Course published to Garmin Courses API.',
      destination,
      target: {
        provider,
        externalId: courseId,
        status: 'SYNCED',
        lastSyncedAt: now
      }
    }
  } catch (error: any) {
    await plannedWorkoutPublishRepository.upsert(id, provider, {
      status: 'FAILED',
      error: error?.message || 'Failed to publish to Garmin'
    })

    throw createError({
      statusCode: 500,
      message: error?.message || 'Failed to publish to Garmin'
    })
  }
})
