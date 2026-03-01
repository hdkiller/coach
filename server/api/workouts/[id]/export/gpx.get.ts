import { defineEventHandler, createError, getRouterParam, setResponseHeader } from 'h3'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { generateGPX } from '../../../../utils/gpx-export'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.email) {
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

  // Get workout with streams
  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      user: { email: session.user.email }
    },
    include: {
      streams: true
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found'
    })
  }

  if (!workout.streams) {
    throw createError({
      statusCode: 400,
      message: 'No location data available for this workout'
    })
  }

  const streams = workout.streams as any
  const latlngs = streams.latlng || []
  const time = streams.time || []

  if (!latlngs.length) {
    throw createError({
      statusCode: 400,
      message: 'No GPS coordinates found for this workout'
    })
  }

  try {
    const gpxContent = generateGPX(
      workout.title || 'Workout',
      workout.date,
      latlngs,
      time,
      streams.altitude,
      streams.heartrate,
      streams.watts
    )

    const filename = `${(workout.title || 'workout').replace(/\W/g, '_')}_${workout.id.slice(0, 8)}.gpx`

    setResponseHeader(event, 'Content-Type', 'application/gpx+xml')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return gpxContent
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate GPX file'
    })
  }
})
