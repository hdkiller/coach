import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { Prisma } from '@prisma/client'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Wipe Synced Activities',
    description:
      'Removes all imported workout data, raw fit files, and related performance metrics.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                counts: {
                  type: 'object',
                  properties: {
                    workouts: { type: 'integer' },
                    fitFiles: { type: 'integer' },
                    personalBests: { type: 'integer' }
                  }
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

  const userId = (session.user as any).id

  // 1. Delete Personal Bests
  const personalBestsDelete = await prisma.personalBest.deleteMany({
    where: { userId }
  })

  // 2. Delete Fit Files
  const fitFilesDelete = await prisma.fitFile.deleteMany({
    where: { userId }
  })

  // 3. Delete Workouts
  // This will cascade delete: exercises, sets, streams, report-workout links, plan-adherence, etc.
  const workoutsDelete = await prisma.workout.deleteMany({
    where: { userId }
  })

  // 4. Update User Profile Scores (Reset)
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentFitnessScore: null,
      recoveryCapacityScore: null,
      nutritionComplianceScore: null,
      trainingConsistencyScore: null,
      currentFitnessExplanation: null,
      recoveryCapacityExplanation: null,
      nutritionComplianceExplanation: null,
      trainingConsistencyExplanation: null,
      currentFitnessExplanationJson: Prisma.DbNull,
      recoveryCapacityExplanationJson: Prisma.DbNull,
      nutritionComplianceExplanationJson: Prisma.DbNull,
      trainingConsistencyExplanationJson: Prisma.DbNull,
      hrPowerAlignmentScore: null,
      hrPowerAlignmentExplanation: null,
      hrPowerAlignmentExplanationJson: Prisma.DbNull
    }
  })

  return {
    success: true,
    counts: {
      workouts: workoutsDelete.count,
      fitFiles: fitFilesDelete.count,
      personalBests: personalBestsDelete.count
    }
  }
})
