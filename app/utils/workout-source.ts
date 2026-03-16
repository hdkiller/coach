export function getWorkoutSourceLabel(
  workout:
    | {
        source?: string | null
        sourceName?: string | null
        oauthApp?: {
          sourceName?: string | null
          name?: string | null
        } | null
      }
    | null
    | undefined,
  translate?: (key: string) => string
) {
  if (!workout) return ''

  if (workout.sourceName) return workout.sourceName
  if (workout.source === 'fit_file' && workout.oauthApp?.sourceName)
    return workout.oauthApp.sourceName
  if (workout.source === 'fit_file' && workout.oauthApp?.name) return workout.oauthApp.name

  const source = workout.source || ''
  if (!source) return ''

  if (translate) {
    try {
      return translate(`source_${source}`) || source
    } catch {
      // Ignore translation lookup errors and fall back to raw source.
    }
  }

  return source
}
