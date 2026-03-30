export const PLAN_VISIBILITY_OPTIONS = ['PRIVATE', 'PUBLIC', 'TEAM'] as const
export const PLAN_ACCESS_STATE_OPTIONS = ['PRIVATE', 'RESTRICTED', 'FREE'] as const
export const PLAN_SKILL_LEVEL_OPTIONS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
export const PLAN_VOLUME_BAND_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const
export const PUBLIC_PLAN_ACCESS_MODE_OPTIONS = ['PREVIEW', 'FULL'] as const
export const PLAN_LANGUAGE_OPTIONS = [
  'English',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Hungarian',
  'Dutch',
  'Japanese',
  'Chinese'
] as const

export type PlanVisibility = (typeof PLAN_VISIBILITY_OPTIONS)[number]
export type PlanAccessState = (typeof PLAN_ACCESS_STATE_OPTIONS)[number]
export type PlanSkillLevel = (typeof PLAN_SKILL_LEVEL_OPTIONS)[number]
export type PlanVolumeBand = (typeof PLAN_VOLUME_BAND_OPTIONS)[number]
export type PublicPlanAccessMode = (typeof PUBLIC_PLAN_ACCESS_MODE_OPTIONS)[number]
export type PlanSport = (typeof PUBLIC_PLAN_SPORTS)[number]['value']

export const PUBLIC_PLAN_SPORTS = [
  {
    value: 'RUNNING',
    label: 'Running',
    subtypes: ['Road Running', 'Trail Running', 'Marathon', '5K/10K']
  },
  {
    value: 'CYCLING',
    label: 'Cycling',
    subtypes: ['Road Cycling', 'Gravel', 'Mountain Bike', 'Indoor Cycling']
  },
  {
    value: 'TRIATHLON',
    label: 'Triathlon',
    subtypes: ['Sprint', 'Olympic', '70.3', 'Full']
  },
  {
    value: 'SWIMMING',
    label: 'Swimming',
    subtypes: ['Pool Swimming', 'Open Water']
  },
  {
    value: 'STRENGTH',
    label: 'Strength',
    subtypes: ['Gym Strength', 'Functional Strength']
  }
] as const

export function slugifyPublicName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function normalizePlanVisibility(value?: string | null): PlanVisibility {
  return PLAN_VISIBILITY_OPTIONS.includes(value as PlanVisibility)
    ? (value as PlanVisibility)
    : 'PRIVATE'
}

export function normalizePlanAccessState(value?: string | null): PlanAccessState {
  return PLAN_ACCESS_STATE_OPTIONS.includes(value as PlanAccessState)
    ? (value as PlanAccessState)
    : 'PRIVATE'
}

export function normalizePlanSkillLevel(value?: string | null): PlanSkillLevel | null {
  return PLAN_SKILL_LEVEL_OPTIONS.includes(value as PlanSkillLevel)
    ? (value as PlanSkillLevel)
    : null
}

export function normalizePlanVolumeBand(value?: string | null): PlanVolumeBand | null {
  return PLAN_VOLUME_BAND_OPTIONS.includes(value as PlanVolumeBand)
    ? (value as PlanVolumeBand)
    : null
}

export function getSportSubtypeOptions(primarySport?: string | null): string[] {
  return [...(PUBLIC_PLAN_SPORTS.find((sport) => sport.value === primarySport)?.subtypes ?? [])]
}

export function getPublicSportByValue(value?: string | null) {
  return PUBLIC_PLAN_SPORTS.find((sport) => sport.value === value) ?? null
}

export function getPublicSportBySegment(segment?: string | null) {
  return (
    PUBLIC_PLAN_SPORTS.find(
      (sport) => slugifyPublicName(sport.label) === (segment || '').toLowerCase()
    ) ?? null
  )
}

export function getPublicSportSegment(value?: string | null) {
  return getPublicSportByValue(value)?.label
    ? slugifyPublicName(getPublicSportByValue(value)!.label)
    : null
}

export function getPublicSubtypeSegment(subtype?: string | null) {
  return subtype ? slugifyPublicName(subtype) : null
}

export function getPublicSubtypeLabel(
  primarySport?: string | null,
  subtypeSegment?: string | null
) {
  const subtypeOptions = getSportSubtypeOptions(primarySport)
  return (
    subtypeOptions.find(
      (subtype) => slugifyPublicName(subtype) === (subtypeSegment || '').toLowerCase()
    ) ?? null
  )
}

export function buildPublicPlanPath(plan: {
  slug?: string | null
  name?: string | null
  primarySport?: string | null
  sportSubtype?: string | null
}) {
  const planSlug = plan.slug || slugifyPublicName(plan.name || '')
  if (!planSlug) return '/training-plans'

  const sportSegment = getPublicSportSegment(plan.primarySport)
  const subtypeSegment = getPublicSubtypeSegment(plan.sportSubtype)

  if (sportSegment && subtypeSegment) {
    return `/training-plans/${sportSegment}/${subtypeSegment}/${planSlug}`
  }

  if (sportSegment) {
    return `/training-plans/${sportSegment}/${planSlug}`
  }

  return `/training-plans/${planSlug}`
}

export function buildTrainingPlansBrowsePath(filters: {
  sport?: string | null
  subtype?: string | null
}) {
  const sportSegment = getPublicSportSegment(filters.sport)
  const subtypeSegment = filters.subtype ? getPublicSubtypeSegment(filters.subtype) : null

  if (sportSegment && subtypeSegment) return `/training-plans/${sportSegment}/${subtypeSegment}`
  if (sportSegment) return `/training-plans/${sportSegment}`
  return '/training-plans'
}

export function buildPublicCoachPath(slug?: string | null) {
  return slug ? `/coach/${slug}` : null
}

export function isPlanFullyPublic(plan: {
  visibility?: string | null
  accessState?: string | null
}) {
  return (
    normalizePlanVisibility(plan.visibility) === 'PUBLIC' &&
    normalizePlanAccessState(plan.accessState) === 'FREE'
  )
}

export function isPlanRestrictedPublic(plan: {
  visibility?: string | null
  accessState?: string | null
}) {
  return (
    normalizePlanVisibility(plan.visibility) === 'PUBLIC' &&
    normalizePlanAccessState(plan.accessState) === 'RESTRICTED'
  )
}
