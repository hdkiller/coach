import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      ftp: true,
      weight: true,
      maxHr: true,
      currentFitnessScore: true,
      recoveryCapacityScore: true,
      nutritionComplianceScore: true,
      trainingConsistencyScore: true,
      profileLastUpdated: true,
      currentFitnessExplanation: true,
      recoveryCapacityExplanation: true,
      nutritionComplianceExplanation: true,
      trainingConsistencyExplanation: true,
      currentFitnessExplanationJson: true,
      recoveryCapacityExplanationJson: true,
      nutritionComplianceExplanationJson: true,
      trainingConsistencyExplanationJson: true
    }
  }) as any
  
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      ftp: user.ftp,
      weight: user.weight,
      maxHr: user.maxHr,
      wkg: user.ftp && user.weight ? (user.ftp / user.weight).toFixed(2) : null
    },
    scores: {
      currentFitness: user.currentFitnessScore,
      currentFitnessExplanation: user.currentFitnessExplanation,
      currentFitnessExplanationJson: user.currentFitnessExplanationJson,
      recoveryCapacity: user.recoveryCapacityScore,
      recoveryCapacityExplanation: user.recoveryCapacityExplanation,
      recoveryCapacityExplanationJson: user.recoveryCapacityExplanationJson,
      nutritionCompliance: user.nutritionComplianceScore,
      nutritionComplianceExplanation: user.nutritionComplianceExplanation,
      nutritionComplianceExplanationJson: user.nutritionComplianceExplanationJson,
      trainingConsistency: user.trainingConsistencyScore,
      trainingConsistencyExplanation: user.trainingConsistencyExplanation,
      trainingConsistencyExplanationJson: user.trainingConsistencyExplanationJson,
      lastUpdated: user.profileLastUpdated
    }
  }
})