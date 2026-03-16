import type { RecoveryContextItem } from '~/types/recovery-context'

export function useRecoveryContext(period: Ref<string | number> | ComputedRef<string | number>) {
  const normalizedPeriod = computed(() => unref(period))
  const { getUserLocalDate } = useFormat()

  const { data, pending, refresh, error } = useFetch<RecoveryContextItem[]>(
    '/api/recovery-context',
    {
      query: computed(() => ({
        days: normalizedPeriod.value
      })),
      default: () => []
    }
  )

  const items = computed(() => data.value || [])

  const activeToday = computed(() => {
    const today = getUserLocalDate().toISOString().slice(0, 10)
    return items.value.filter(
      (item) => item.startAt.slice(0, 10) <= today && item.endAt.slice(0, 10) >= today
    )
  })

  return {
    items,
    activeToday,
    pending,
    refresh,
    error
  }
}
