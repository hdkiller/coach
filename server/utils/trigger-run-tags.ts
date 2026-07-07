export function buildUserRunTags(userId: string, extraTags: string[] = []): string[] {
  const tags = [`user:${userId}`]
  for (const tag of extraTags) {
    if (tag && !tags.includes(tag)) {
      tags.push(tag)
    }
  }
  return tags
}

export type StructureRunSource = 'chat' | 'api' | 'block' | 'recommendation' | 'ad-hoc' | 'library'

export function structureGenerationRunTags(opts: {
  userId: string
  plannedWorkoutId?: string
  workoutTemplateId?: string
  source?: StructureRunSource
}): string[] {
  const extraTags: string[] = []
  if (opts.plannedWorkoutId) {
    extraTags.push(`planned-workout:${opts.plannedWorkoutId}`)
  }
  if (opts.workoutTemplateId) {
    extraTags.push(`workout-template:${opts.workoutTemplateId}`)
  }
  if (opts.source) {
    extraTags.push(`source:${opts.source}`)
  }
  return buildUserRunTags(opts.userId, extraTags)
}
