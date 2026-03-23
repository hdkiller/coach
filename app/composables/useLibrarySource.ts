import { useStorage } from '@vueuse/core'
import { useCoachingStore } from '~/stores/coaching'

export type LibrarySource = 'athlete' | 'coach' | 'all'

export function useLibrarySource(
  storageKey = 'default',
  options?: {
    includeAll?: boolean
    itemLabel?: string // e.g. "workouts" or "plans"
  }
) {
  const coachingStore = useCoachingStore()
  const includeAll = options?.includeAll !== false
  const itemLabel = options?.itemLabel || 'library'

  const fallbackSource = computed<LibrarySource>(() =>
    coachingStore.isCoachingMode ? 'coach' : 'athlete'
  )
  const source = useStorage<LibrarySource>(`library-source:${storageKey}`, fallbackSource.value)

  watchEffect(() => {
    if (!coachingStore.isCoachingMode && source.value !== 'athlete') {
      source.value = 'athlete'
    }
  })

  const optionsList = computed(() => {
    if (!coachingStore.isCoachingMode) {
      return [{ label: `My ${itemLabel}`, value: 'athlete' as const }]
    }

    return [
      { label: `Coach ${itemLabel}`, value: 'coach' as const },
      { label: `Athlete ${itemLabel}`, value: 'athlete' as const },
      ...(includeAll ? [{ label: 'Both', value: 'all' as const }] : [])
    ]
  })

  return {
    source,
    options: optionsList,
    isCoachingMode: computed(() => coachingStore.isCoachingMode)
  }
}
