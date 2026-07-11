import { prisma } from '../../../../../utils/db'
import { getServerSession } from '../../../../../utils/session'
import { serializeCanonicalDownload } from '../../../../../utils/canonical-workout-serializer'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  const format = getRouterParam(event, 'format')

  if (!id || !format || !['zwo', 'fit', 'mrc', 'erg'].includes(format)) {
    throw createError({ statusCode: 400, message: 'Invalid request' })
  }

  const workout = await prisma.plannedWorkout.findUnique({
    where: { id, userId: (session.user as any).id },
    include: {
      user: { select: { ftp: true, name: true } }
    }
  })

  if (!workout || !workout.structuredWorkout) {
    throw createError({ statusCode: 404, message: 'Workout not found or has no structure' })
  }

  let fileData: string | Uint8Array
  let contentType: string
  let fileExt: string

  switch (format) {
    case 'zwo':
      fileData = serializeCanonicalDownload({
        title: workout.title,
        description: workout.description || '',
        structure: workout.structuredWorkout,
        zoneProfileSnapshot: (workout.structuredWorkout as any)?.zoneProfileSnapshot,
        workout,
        liveUserFtp: workout.user.ftp,
        format
      }) as string | Uint8Array
      contentType = 'application/xml'
      fileExt = 'zwo'
      break
    case 'fit':
      fileData = serializeCanonicalDownload({
        title: workout.title,
        description: workout.description || '',
        structure: workout.structuredWorkout,
        zoneProfileSnapshot: (workout.structuredWorkout as any)?.zoneProfileSnapshot,
        workout,
        liveUserFtp: workout.user.ftp,
        format
      }) as string | Uint8Array
      contentType = 'application/octet-stream'
      fileExt = 'fit'
      break
    case 'mrc':
      fileData = serializeCanonicalDownload({
        title: workout.title,
        description: workout.description || '',
        structure: workout.structuredWorkout,
        zoneProfileSnapshot: (workout.structuredWorkout as any)?.zoneProfileSnapshot,
        workout,
        liveUserFtp: workout.user.ftp,
        format
      }) as string | Uint8Array
      contentType = 'text/plain'
      fileExt = 'mrc'
      break
    case 'erg':
      fileData = serializeCanonicalDownload({
        title: workout.title,
        description: workout.description || '',
        structure: workout.structuredWorkout,
        zoneProfileSnapshot: (workout.structuredWorkout as any)?.zoneProfileSnapshot,
        workout,
        liveUserFtp: workout.user.ftp,
        format
      }) as string | Uint8Array
      contentType = 'text/plain'
      fileExt = 'erg'
      break
    default:
      throw createError({ statusCode: 400, message: 'Invalid format' })
  }

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${workout.title.replace(/[^a-z0-9]/gi, '_')}.${fileExt}"`
  )

  return fileData
})
