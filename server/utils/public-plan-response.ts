import { isPlanRestrictedPublic, isPlanFullyPublic } from '../../shared/public-plans'

function sortWeeks(weeks: any[]) {
  return [...(weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber)
}

function sortBlocks(blocks: any[]) {
  return [...(blocks || [])].sort((a, b) => a.order - b.order)
}

function sortWorkouts(workouts: any[]) {
  return [...(workouts || [])].sort((a, b) => a.dayIndex - b.dayIndex)
}

export function getPlanLengthWeeks(plan: any) {
  return sortBlocks(plan.blocks || []).reduce(
    (sum, block) => sum + sortWeeks(block.weeks || []).length,
    0
  )
}

export function getPublicAuthorSummary(user: any) {
  return {
    slug: user.publicAuthorSlug || null,
    displayName: user.publicDisplayName || user.name || 'Coach Wattz Author',
    bio: user.publicBio || null,
    location: user.publicLocation || null,
    websiteUrl: user.publicWebsiteUrl || null,
    coachingBrand: user.publicCoachingBrand || null,
    socialLinks: Array.isArray(user.publicSocialLinks) ? user.publicSocialLinks : [],
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
