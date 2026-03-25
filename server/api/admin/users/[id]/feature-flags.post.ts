import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import {
  STRUCTURED_WORKOUT_GENERATOR_MODES,
  normalizeStructuredWorkoutGeneratorMode
} from '../../../../utils/structured-workout-generator'

const updateFeatureFlagsSchema = z.object({
  path: z.literal('structuredWorkout.generator'),
  value: z.union([z.enum(STRUCTURED_WORKOUT_GENERATOR_MODES), z.null()])
})

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function cloneFeatureFlags(value: unknown): Record<string, any> {
  if (!isRecord(value)) return {}
  return JSON.parse(JSON.stringify(value))
}

function pruneEmptyObjects(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => pruneEmptyObjects(entry))
  if (!isRecord(value)) return value

  const next: Record<string, any> = {}
  for (const [key, entry] of Object.entries(value)) {
    const pruned = pruneEmptyObjects(entry)
    if (pruned === undefined) continue
    if (isRecord(pruned) && Object.keys(pruned).length === 0) continue
    next[key] = pruned
  }
  return next
}

function setValueAtPath(root: Record<string, any>, path: string[], value: unknown) {
  let cursor = root
  for (const segment of path.slice(0, -1)) {
    if (!isRecord(cursor[segment])) cursor[segment] = {}
    cursor = cursor[segment]
  }

  const leafKey = path[path.length - 1]
  if (!leafKey) return root

  if (value === null) {
    Reflect.deleteProperty(cursor, leafKey)
  } else {
    cursor[leafKey] = value
  }

  return pruneEmptyObjects(root)
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  const userId = getRouterParam(event, 'id')

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  const body = await readBody(event)
  const parsed = updateFeatureFlagsSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: parsed.error.issues
    })
  }

  const nextMode =
    parsed.data.value === null ? null : normalizeStructuredWorkoutGeneratorMode(parsed.data.value)
  if (parsed.data.value !== null && !nextMode) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid structured workout generator'
    })
  }

  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { id: true, featureFlags: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const featureFlags = cloneFeatureFlags(user.featureFlags)
  const updatedFlags = setValueAtPath(featureFlags, parsed.data.path.split('.'), nextMode)
  const hasFlags = isRecord(updatedFlags) && Object.keys(updatedFlags).length > 0

  const updatedUser = await (prisma as any).user.update({
    where: { id: userId },
    data: {
      featureFlags: hasFlags ? updatedFlags : null
    },
    select: {
      id: true,
      featureFlags: true
    }
  })

  return {
    success: true,
    userId: updatedUser.id,
    featureFlags: updatedUser.featureFlags
  }
})
