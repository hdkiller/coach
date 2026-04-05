import { isPlanRestrictedPublic, isPlanFullyPublic } from '../../shared/public-plans'
import { resolveCoachPublicProfile } from './public-presence'

function sortWeeks(weeks: any[]) {
  return [...(weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber)
}

function sortBlocks(blocks: any[]) {
  return [...(blocks || [])].sort((a, b) => a.order - b.order)
}

function sortWorkouts(workouts: any[]) {
  return [...(workouts || [])].sort((a, b) => a.dayIndex - b.dayIndex)
}

function flattenWeeks(plan: any) {
  return sortBlocks(plan.blocks || []).flatMap((block) =>
    sortWeeks(block.weeks || []).map((week) => ({
      ...week,
      blockName: block.name,
      blockType: block.type
    }))
  )
}

export function getPlanLengthWeeks(plan: any) {
  return sortBlocks(plan.blocks || []).reduce(
    (sum, block) => sum + sortWeeks(block.weeks || []).length,
    0
  )
}

export function getPublicAuthorSummary(user: any) {
  const coachProfile = resolveCoachPublicProfile(user || {})
  return {
    slug: coachProfile.settings.slug || user.publicAuthorSlug || null,
    displayName:
      coachProfile.settings.displayName ||
      user.publicDisplayName ||
      user.name ||
      'Coach Wattz Author',
    bio: coachProfile.settings.bio || user.publicBio || null,
    location: coachProfile.settings.location || user.publicLocation || null,
    websiteUrl: coachProfile.settings.websiteUrl || user.publicWebsiteUrl || null,
    coachingBrand: coachProfile.settings.coachingBrand || user.publicCoachingBrand || null,
    socialLinks:
      coachProfile.settings.socialLinks ||
      (Array.isArray(user.publicSocialLinks) ? user.publicSocialLinks : []),
    image: user.image || null
  }
}

export function buildPublicPlanSummary(plan: any) {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    publicHeadline: plan.publicHeadline,
    publicDescription: plan.publicDescription,
    primarySport: plan.primarySport,
    sportSubtype: plan.sportSubtype,
    skillLevel: plan.skillLevel,
    planLanguage: plan.planLanguage,
    daysPerWeek: plan.daysPerWeek,
    weeklyVolumeBand: plan.weeklyVolumeBand,
    goalLabel: plan.goalLabel,
    difficulty: plan.difficulty,
    accessState: plan.accessState,
    visibility: plan.visibility,
    isFeatured: Boolean(plan.isFeatured),
    lengthWeeks: getPlanLengthWeeks(plan),
    equipmentTags: plan.equipmentTags || [],
    updatedAt: plan.updatedAt,
    createdAt: plan.createdAt,
    author: getPublicAuthorSummary(plan.user)
  }
}

export function buildPublicPlanDetail(plan: any, accessMode: 'preview' | 'full' = 'preview') {
  const summary = buildPublicPlanSummary(plan)
  const sampleWeekIdSet = new Set((plan.sampleWeeks || []).map((entry: any) => entry.weekId))
  const fullPublicAccess = isPlanFullyPublic(plan)
  const fullAccess = accessMode === 'full' || fullPublicAccess
  const restrictedPublic = isPlanRestrictedPublic(plan)

  const blocks = sortBlocks(plan.blocks || [])
    .map((block) => ({
      ...block,
      weeks: sortWeeks(block.weeks || [])
        .filter((week) => fullAccess || !restrictedPublic || sampleWeekIdSet.has(week.id))
        .map((week) => ({
          ...week,
          workouts: sortWorkouts(week.workouts || [])
        }))
    }))
    .filter((block) => block.weeks.length > 0 || fullAccess)

  return {
    ...summary,
    description: plan.description,
    methodology: plan.methodology,
    whoItsFor: plan.whoItsFor,
    faq: plan.faq,
    extraContent: plan.extraContent,
    goal: plan.goal ? { title: plan.goal.title } : null,
    blocks,
    sampleWeekIds: [...sampleWeekIdSet],
    fullAccess,
    previewMode: !fullAccess,
    privateShareEligible:
      plan.visibility === 'PRIVATE' ||
      plan.accessState === 'RESTRICTED' ||
      plan.accessState === 'PRIVATE'
  }
}

export function buildFeaturedPublicPlanPreview(
  plan: any,
  options?: { highlightWeekId?: string | null; coachNote?: string | null; order?: number }
) {
  const summary = buildPublicPlanSummary(plan)
  const allWeeks = flattenWeeks(plan).map((week) => ({
    ...week,
    workouts: sortWorkouts(week.workouts || [])
  }))
  const lengthWeeks = allWeeks.length || summary.lengthWeeks || 1
  const sampleWeekIdSet = new Set((plan.sampleWeeks || []).map((entry: any) => entry.weekId))

  const sampleWeeksSource = allWeeks.filter((week) => sampleWeekIdSet.has(week.id))
  const fallbackWeeks = [
    allWeeks[0],
    allWeeks[Math.floor(allWeeks.length / 2)],
    allWeeks[allWeeks.length - 1]
  ]
    .filter(Boolean)
    .filter(
      (week, index, weeks) => weeks.findIndex((candidate) => candidate.id === week.id) === index
    )

  const sampleWeeks = (sampleWeeksSource.length ? sampleWeeksSource : fallbackWeeks)
    .slice(0, 3)
    .map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      focus: week.focus,
      blockName: week.blockName,
      workouts: week.workouts.map((workout: any) => ({
        id: workout.id,
        title: workout.title,
        type: workout.type,
        dayIndex: workout.dayIndex,
        durationSec: workout.durationSec || 0,
        tss: workout.tss || 0
      }))
    }))

  const highlightedSampleWeekId =
    sampleWeeks.find((week) => week.id === options?.highlightWeekId)?.id ||
    sampleWeeks[0]?.id ||
    null

  const weeklyDurations = allWeeks.map((week) => ({
    weekNumber: week.weekNumber,
    durationHours:
      week.workouts.reduce((sum: number, workout: any) => sum + (workout.durationSec || 0), 0) /
      3600
  }))

  const allWorkouts = allWeeks.flatMap((week) => week.workouts || [])
  const totalDurationSec = allWorkouts.reduce(
    (sum: number, workout: any) => sum + (workout.durationSec || 0),
    0
  )
  const longestWorkoutSec = allWorkouts.reduce(
    (longest: number, workout: any) => Math.max(longest, workout.durationSec || 0),
    0
  )

  const activityBreakdownMap = new Map<string, { count: number; longestWorkoutSec: number }>()
  for (const workout of allWorkouts) {
    const type = workout.type || 'Workout'
    const current = activityBreakdownMap.get(type) || { count: 0, longestWorkoutSec: 0 }
    current.count += 1
    current.longestWorkoutSec = Math.max(current.longestWorkoutSec, workout.durationSec || 0)
    activityBreakdownMap.set(type, current)
  }

  const activityBreakdown = [...activityBreakdownMap.entries()]
    .map(([type, value]) => ({
      type,
      averageCountPerWeek: value.count / lengthWeeks,
      longestWorkoutSec: value.longestWorkoutSec
    }))
    .sort((a, b) => b.averageCountPerWeek - a.averageCountPerWeek)

  return {
    ...summary,
    methodology: plan.methodology,
    whoItsFor: plan.whoItsFor,
    coachNote: options?.coachNote || null,
    order: options?.order ?? 0,
    highlightedSampleWeekId,
    sampleWeeks,
    stats: {
      workoutsPerWeek: allWorkouts.length / lengthWeeks,
      weeklyAverageDurationSec: totalDurationSec / lengthWeeks,
      longestWorkoutSec,
      weeklyDurations,
      activityBreakdown
    }
  }
}
