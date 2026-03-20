import type { H3Event } from 'h3'
import { requireAuth } from './auth-guard'
import { coachingRepository } from './repositories/coachingRepository'

export async function requireCoachAccessToAthlete(event: H3Event, athleteId: string) {
  const coach = await requireAuth(event, ['coaching:read'])
  const isCoaching = await coachingRepository.checkRelationship(coach.id, athleteId)

  if (!isCoaching) {
    throw createError({
      statusCode: 403,
      message: 'You do not have permission to access this athlete.'
    })
  }

  return coach
}
