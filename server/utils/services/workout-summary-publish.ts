import { prisma } from '../db'
import { updateIntervalsActivityDescription } from '../intervals'

const SUMMARY_BLOCK_START = '[CoachWatts Workout Analyisis]'
const SUMMARY_BLOCK_END = '[/CoachWatts Workout Analyisis]'
const SUMMARY_ATTRIBUTION_URL = 'https://CoachWatts.com - AI Endurance Coaching'

export interface PublishWorkoutSummaryResult {
  published: boolean
  reason?: string
}

function upsertSummaryBlock(
  existingDescription: string | null | undefined,
  summary: string
): string {
  const current = (existingDescription || '').trim()
  const previousBlockPatterns = [
    /\n?\[CoachWatts\.com AI Summary\][\s\S]*?\[\/CoachWatts\.com AI Summary\]\n?/g,
    /\n?\[CoachWatts AI Summary\][\s\S]*?\[\/CoachWatts AI Summary\]\n?/g,
    /\n?\[CoachWatts Workout Analyisis\][\s\S]*?\[\/CoachWatts Workout Analyisis\]\n?/g,
    /\n?\[AI Workout Summary\][\s\S]*?\[\/AI Workout Summary\]\n?/g
  ]
  const withoutPreviousSummary = previousBlockPatterns
    .reduce((text, pattern) => text.replace(pattern, ''), current)
    .trim()
  const nextBlock = `${SUMMARY_BLOCK_START}\n${summary.trim()}\n\n${SUMMARY_ATTRIBUTION_URL}\n${SUMMARY_BLOCK_END}`

  return withoutPreviousSummary ? `${nextBlock}\n\n${withoutPreviousSummary}` : nextBlock
}

export async function publishWorkoutSummaryToIntervals(
  workoutId: string,
  userId: string
): Promise<PublishWorkoutSummaryResult> {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    select: {
      id: true,
      source: true,
      externalId: true,
      description: true,
      aiAnalysisJson: true
    }
  })

  if (!workout) return { published: false, reason: 'Workout not found' }
  if (workout.source !== 'intervals')
    return { published: false, reason: 'Workout is not an Intervals.icu activity' }

  const summary =
    typeof (workout.aiAnalysisJson as any)?.executive_summary === 'string'
      ? ((workout.aiAnalysisJson as any).executive_summary as string).trim()
      : ''

  if (!summary) return { published: false, reason: 'No AI Workout Summary available' }

  const userSettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { updateWorkoutNotesEnabled: true }
  })

  if (userSettings && userSettings.updateWorkoutNotesEnabled === false) {
    return { published: false, reason: 'Update Workout Notes is disabled' }
  }

  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'intervals' }
  })

  if (!integration) return { published: false, reason: 'Intervals.icu integration not found' }

  const mergedDescription = upsertSummaryBlock(workout.description, summary)
  await updateIntervalsActivityDescription(integration, workout.externalId, mergedDescription)

  await prisma.workout.update({
    where: { id: workout.id },
    data: { description: mergedDescription }
  })

  return { published: true }
}
